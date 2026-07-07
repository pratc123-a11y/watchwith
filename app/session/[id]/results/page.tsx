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
}

type Participant = {
  id: string
  name: string
  votes: Record<string, number>
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

  useEffect(() => {
    fetchAndScore()
  }, [])
async function generateExplanation(film: Film, breakdown: { name: string, vote: number }[], score: number): Promise<string> {
    const ratedPeople = breakdown.filter(b => b.vote > 0)
    const topFans = ratedPeople.filter(b => b.vote >= 4).map(b => b.name)
    const genres = film.genres.join(', ')
    
    const lowestVote = Math.min(...ratedPeople.map(b => b.vote))
    const prompt = `A group is picking a movie together. "${film.title}" (${film.year}).
Genres: ${genres}.
Individual scores: ${ratedPeople.map(b => `${b.name} gave it ${b.vote}/5`).join(', ')}.
Lowest score in group: ${lowestVote}/5.
${topFans.length > 0 ? `${topFans.join(' and ')} loved it most.` : ''}

Write ONE sentence (max 20 words) explaining why this works for the WHOLE GROUP — not just one person. Focus on what the group has in common. Don't start with "This".`
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
  async function fetchAndScore() {
    const { data: participantData } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', id)

    if (!participantData || participantData.length === 0) {
      setLoading(false)
      return
    }

    setParticipants(participantData)

    const allFilmIds = new Set<string>()
    participantData.forEach(p => {
      Object.keys(p.votes).forEach(fid => allFilmIds.add(fid))
    })

    const filmDetails = await Promise.all(
        Array.from(allFilmIds).map(async fid => {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${fid}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}`
          )
          const data = await res.json()
          return {
            id: data.id,
            title: data.title,
            year: data.release_date?.slice(0, 4),
            poster: data.poster_path,
            genres: data.genres?.map((g: any) => g.name) || []
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

      const groupScore = (
        (lowestScore * 0.5) +
        (avgScore * 0.3) +
        ((ratedCount / groupSize) * 5 * 0.2)
      )

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
        <p className="text-gray-400 mt-16">Calculating best matches...</p>
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
      <h1 className="text-2xl font-medium mb-1">Best matches</h1>
      <p className="text-gray-100 mb-2">
        Based on {participants.length} {participants.length === 1 ? 'person' : 'people'} —{' '}
        {participants.map(p => p.name).join(', ')}
      </p>
      <p className="text-xs text-gray-200 mb-8">
        Ranked by lowest score in the group first, then average — so nobody gets a film they'll hate.
      </p>

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
                  Best match
                </span>
              )}
              <h2 className="font-medium text-base leading-tight mb-1 text-white">{result.film.title}</h2>
              <p className="text-xs text-gray-300 mb-2">{result.film.year}</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">{renderStars(result.score)}</div>
                <span className="text-sm text-gray-300">{result.score} avg</span>
                <span className="text-xs text-purple-400 ml-auto">
                  {result.groupScore} group score
                </span>
              </div>
              {result.explanation && (
                <p className="text-xs text-white italic mb-3 leading-relaxed">{result.explanation}</p>
              )}
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
            </div>
          </div>
        </div>
      ))}
    </main>
  )
}