'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Film = {
  id: number
  title: string
  year: string
  poster: string
  genres: string[]
  director: string
  tmdbRating: number
}

type Participant = {
  id: string
  name: string
  votes: Record<string, number>
  mode: string
}

type FilmResult = {
  film: Film
  score: number
  groupScore: number
  breakdown: { name: string, vote: number }[]
  lowestScore: number
  watchLaterCount: number
  explanation: string
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [results, setResults] = useState<FilmResult[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionMode, setSessionMode] = useState<string | null>(null)

  useEffect(() => {
    fetchAndScore()
  }, [])

  async function generateExplanation(film: Film, breakdown: { name: string, vote: number }[], score: number): Promise<string> {
    const ratedPeople = breakdown.filter(b => b.vote > 0)
    const topFans = ratedPeople.filter(b => b.vote >= 4).map(b => b.name)
    const genres = film.genres.join(', ')
    const lowestVote = ratedPeople.length > 0 ? Math.min(...ratedPeople.map(b => b.vote)) : 0
    const prompt = sessionMode === 'unseen'
      ? `A group wants to discover a new film. "${film.title}" (${film.year}).
Genres: ${genres}.
Write ONE sentence (max 20 words) explaining why this would be a great new discovery for the group based on its genres. Don't start with "This".`
      : `A group is picking a movie together. "${film.title}" (${film.year}).
Genres: ${genres}.
Individual scores: ${ratedPeople.map(b => `${b.name} gave it ${b.vote}/5`).join(', ')}.
Lowest score in group: ${lowestVote}/5.
${topFans.length > 0 ? `${topFans.join(' and ')} loved it most.` : ''}
Write ONE sentence (max 20 words) explaining why this works for the WHOLE GROUP. Focus on what the group has in common. Don't start with "This".`

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      return data.content?.[0]?.text || ''
    } catch {
      return ''
    }
  }

  async function getGroupGenrePreferences(participantData: Participant[]): Promise<string[]> {
    const genreCounts: Record<string, number> = {}
    const seenFilmIds = new Set<string>()

    for (const p of participantData) {
      for (const [filmId, vote] of Object.entries(p.votes)) {
        if (vote > 0) {
          seenFilmIds.add(filmId)
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${filmId}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&append_to_response=credits`
          )
          const data = await res.json()
          const genres: string[] = data.genres?.map((g: any) => g.name) || []
          genres.forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + vote
          })
        }
      }
    }

    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
  }

  async function fetchSurpriseFilms(participantData: Participant[]): Promise<FilmResult[]> {
    const topGenres = await getGroupGenrePreferences(participantData)

    const seenFilmIds = new Set<string>()
    participantData.forEach(p => {
      Object.keys(p.votes).forEach(fid => seenFilmIds.add(fid))
    })

    const genreMap: Record<string, number> = {
      'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
      'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
      'Fantasy': 14, 'Horror': 27, 'Music': 10402, 'Mystery': 9648,
      'Romance': 10749, 'Science Fiction': 878, 'Thriller': 53,
      'War': 10752, 'Western': 37
    }

    const topGenreIds = topGenres
      .map(g => genreMap[g])
      .filter(Boolean)
      .join(',')

    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&with_genres=${topGenreIds}&sort_by=vote_average.desc&vote_count.gte=1000&page=1`
    )
    const data = await res.json()

    const freshFilms = data.results
      .filter((f: any) => f.poster_path && !seenFilmIds.has(String(f.id)))
      .slice(0, 5)

    const filmDetails = await Promise.all(
      freshFilms.map(async (f: any) => {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${f.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&append_to_response=credits`
        )
        const data = await res.json()
        const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || ''
        return {
          id: data.id,
          title: data.title,
          year: data.release_date?.slice(0, 4),
          poster: data.poster_path,
          genres: data.genres?.map((g: any) => g.name) || [],
          director,
          tmdbRating: Math.round(data.vote_average * 10) / 10
        } as Film
      })
    )

    const surpriseResults: FilmResult[] = filmDetails.map(film => ({
      film,
      score: 0,
      groupScore: 0,
      breakdown: [],
      lowestScore: 0,
      watchLaterCount: 0,
      explanation: ''
    }))

    const withExplanations = await Promise.all(
      surpriseResults.map(async result => ({
        ...result,
        explanation: await generateExplanation(result.film, [], 0)
      }))
    )

    return withExplanations
  }

  async function fetchAndScore() {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('mode')
      .eq('id', id)
      .single()

    const mode = sessionData?.mode || 'rated'
    setSessionMode(mode)

    const { data: participantData } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', id)

    if (!participantData || participantData.length === 0) {
      setLoading(false)
      return
    }

    setParticipants(participantData)

    if (mode === 'unseen') {
      const surpriseResults = await fetchSurpriseFilms(participantData)
      setResults(surpriseResults)
      setLoading(false)
      return
    }
    const allFilmIds = new Set<string>()
    participantData.forEach(p => {
      Object.keys(p.votes).forEach(fid => allFilmIds.add(fid))
    })

    const filmDetails = await Promise.all(
      freshFilms.map(async (f: any) => {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${f.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&append_to_response=credits`
        )
        const data = await res.json()
        const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || ''
        return {
          id: data.id,
          title: data.title,
          year: data.release_date?.slice(0, 4),
          poster: data.poster_path,
          genres: data.genres?.map((g: any) => g.name) || [],
          director,
          tmdbRating: Math.round(data.vote_average * 10) / 10
        } as Film
      })
    )

    const scored: FilmResult[] = []

    for (const film of filmDetails) {
      const breakdown: { name: string, vote: number }[] = []
      let excluded = false
      let totalScore = 0
      let lowestScore = 5

      for (const p of participantData) {
        const vote = p.votes[film.id]
        if (vote === undefined) continue
        if (vote === -2) { excluded = true; break }
        if (vote === -1) {
          breakdown.push({ name: p.name, vote: -1 })
          continue
        }
        breakdown.push({ name: p.name, vote })
        totalScore += vote
        if (vote < lowestScore) lowestScore = vote
      }

      if (excluded) continue

      const ratedVotes = breakdown.filter(b => b.vote > 0)
      if (ratedVotes.length === 0) continue

      const avgScore = totalScore / ratedVotes.length
      const watchLaterCount = breakdown.filter(b => b.vote === -1).length
      const groupSize = participantData.length
      const ratedCount = ratedVotes.length

      const groupScore = ratedVotes.every(v => v.vote >= 3)
        ? avgScore
        : avgScore * (lowestScore / 5)

      scored.push({
        film,
        score: Math.round(avgScore * 10) / 10,
        groupScore: Math.round(groupScore * 10) / 10,
        breakdown,
        lowestScore,
        watchLaterCount,
        explanation: ''
      })
    }

    scored.sort((a, b) => b.groupScore - a.groupScore)

    const top5 = scored.slice(0, 5)

    const withExplanations = await Promise.all(
      top5.map(async result => ({
        ...result,
        explanation: await generateExplanation(result.film, result.breakdown, result.score)
      }))
    )

    setResults(withExplanations)
    setLoading(false)
  }

  function renderStars(score: number) {
    return [1,2,3,4,5].map(star => {
      const full = star <= score
      const half = !full && star - 0.5 <= score
      return (
        <span key={star} className="relative inline-block text-lg" style={{width:'18px'}}>
          <span className="text-gray-300">★</span>
          {(full || half) && (
            <span
              className="absolute inset-0 text-yellow-400 overflow-hidden"
              style={{ clipPath: half ? 'inset(0 50% 0 0)' : 'none' }}
            >
              ★
            </span>
          )}
        </span>
      )
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <p className="text-gray-400 mt-16">
          {sessionMode === 'unseen'
            ? 'Finding something new for your group...'
            : 'Calculating best matches...'}
        </p>
      </main>
    )
  }

  if (results.length === 0) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-2">No matches yet</h1>
        <p className="text-gray-500">Nobody has voted in this session yet. Share the link and get people rating!</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-medium mb-1">
        {sessionMode === 'unseen' ? 'Something new to discover' : 'Best matches'}
      </h1>
      <p className="text-gray-100 mb-2">
        Based on {participants.length} {participants.length === 1 ? 'person' : 'people'} —{' '}
        {participants.map(p => p.name).join(', ')}
      </p>
      {sessionMode === 'unseen' && (
        <p className="text-xs text-gray-200 mb-4">
          Picked based on your group's favourite genres — none of you have rated these before.
        </p>
      )}
      {sessionMode === 'rated' && (
        <p className="text-xs text-gray-200 mb-8">
          Ranked so nobody gets a film they'll hate.
        </p>
      )}

      {results.map((result, i) => (
        <div
          key={result.film.id}
          className={`mb-6 rounded-2xl overflow-hidden border ${i === 0 ? 'border-purple-400' : 'border-gray-600'}`}
        >
          <div className="flex gap-3 p-4">
            {result.film.poster && (
              <img
                src={`https://image.tmdb.org/t/p/w200${result.film.poster}`}
                alt={result.film.title}
                className="w-16 rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1">
              {i === 0 && (
                <span className="text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded-full mb-2 inline-block">
                  {sessionMode === 'unseen' ? 'Top pick' : 'Best match'}
                </span>
              )}
              <h2 className="font-medium text-base leading-tight mb-1 text-white">{result.film.title}</h2>
              <p className="text-xs text-gray-300 mb-1">{result.film.year}{result.film.director ? ` · Dir. ${result.film.director}` : ''}</p>
              {result.film.tmdbRating > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-xs text-gray-300">{result.film.tmdbRating}/10 TMDB</span>
                </div>
              )}
              {result.film.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {result.film.genres.slice(0, 3).map(g => (
                    <span key={g} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              )}
              {sessionMode === 'rated' && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex">{renderStars(result.groupScore)}</div>
                  <span className="text-sm text-gray-300">{result.groupScore} group score</span>
                </div>
              )}
              {result.explanation && (
                <p className="text-xs text-white italic mb-3 leading-relaxed">{result.explanation}</p>
              )}
              {sessionMode === 'rated' && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.breakdown.filter(b => b.vote > 0).map(b => (
                    <span key={b.name} className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full">
                      {b.name} {b.vote}★
                    </span>
                  ))}
                  {result.watchLaterCount > 0 && (
                    <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full">
                      🕐 {result.watchLaterCount} watch later
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </main>
  )
}