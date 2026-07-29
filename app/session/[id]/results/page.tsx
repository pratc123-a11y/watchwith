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
  streaming: {name: string, logo: string, link: string}[]
  synopsis: string
  cast: string[]
  runtime: number
  language: string
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
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [results, setResults] = useState<FilmResult[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionMode, setSessionMode] = useState<string | null>(null)
  const [sessionGenres, setSessionGenres] = useState<string[]>([])
  const [groupSummary, setGroupSummary] = useState<string>('')
  const [expandedFilm, setExpandedFilm] = useState<number | null>(null)
  const [watchedFilms, setWatchedFilms] = useState<Set<number>>(new Set())
  const [userRatedIds, setUserRatedIds] = useState<Set<number>>(new Set())
  const [loadingMessage, setLoadingMessage] = useState(0)
  const [historySaved, setHistorySaved] = useState(false)
  const loadingMessages = [
    "Calculating... slower than a hobbit leaving the Shire 🧙",
    "Almost there... the sorting hat is still thinking 🎩",
    "Finding your match... faster than the Millennium Falcon, probably 🚀",
    "One moment... even HAL 9000 needed time to think 🔴",
    "Hang tight... the ravens are still flying 🐦",
    "Nearly done... quicker than finding a parking spot in Jurassic Park 🦕",
    "Loading... Wilson, I'll be right back 🏐",
  ]

  useEffect(() => {
    if (!loading) return
    setLoadingMessage(Math.floor(Math.random() * loadingMessages.length))
    const interval = setInterval(() => {
      setLoadingMessage(Math.floor(Math.random() * loadingMessages.length))
    }, 5500)
    return () => clearInterval(interval)
  }, [loading])

  useEffect(() => {
    fetchAndScore()
    fetchUserRatings()
  }, [])

  async function fetchUserRatings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('user_ratings')
      .select('film_id, rating')
      .eq('user_id', user.id)
      .gt('rating', 0)
    if (data) {
      setUserRatedIds(new Set(data.map(r => Number(r.film_id))))
      setWatchedFilms(new Set(data.map(r => Number(r.film_id))))
    }
  }

 async function fetchStreaming(tmdbId: number): Promise<{name: string, logo: string, link: string}[]> {
    try {
      const res = await fetch(`/api/streaming?tmdbId=${tmdbId}`)
      const data = await res.json()
      const streamingOptions = data?.streamingOptions?.au || []
      const seen = new Set()
      return streamingOptions
        .filter((option: any) => {
          if (seen.has(option.service?.id)) return false
          seen.add(option.service?.id)
          return true
        })
        .slice(0, 4)
        .map((option: any) => ({
          name: option.service?.name,
          logo: option.service?.imageSet?.whiteImage,
          link: option.link
        }))
    } catch {
      return []
    }
  }

  async function generateGroupSummary(
    participantData: any[],
    topFilms: FilmResult[],
    mode: string,
    genres: string[]
  ): Promise<string> {
    const names = participantData.map(p => p.name).join(', ')
    const topTitles = topFilms.slice(0, 3).map(r => r.film.title).join(', ')
    const topGenres = [...new Set(topFilms.flatMap(r => r.film.genres.slice(0, 2)))].slice(0, 4).join(', ')

   const isSolo = participantData.length === 1
    const prompt = mode === 'unseen'
      ? isSolo
        ? `${names} wants to discover new films tonight. They picked genres: ${genres.join(', ')}.
Top recommendations: ${topTitles}.
Write ONE sentence (max 25 words) explaining why these films suit their taste. Be warm and specific. Don't start with "Based on".`
        : `A group of friends (${names}) want to discover new films tonight. They picked genres: ${genres.join(', ')}.
Top recommendations: ${topTitles}.
Write ONE sentence (max 25 words) explaining what this group has in common and why these films suit them. Be warm and specific. Don't start with "Based on".`
      : isSolo
        ? `${names} rated some films. Top matches: ${topTitles}. Favourite genres: ${topGenres}.
Write ONE sentence (max 25 words) explaining why these films match their personal taste. Be warm and specific. Don't refer to them as a group. Don't start with "Based on".`
        : `A group of friends (${names}) rated films together. Top matches: ${topTitles}. Common genres: ${topGenres}.
Write ONE sentence (max 25 words) summarising what this group has in common taste-wise and why these picks work for everyone. Be warm and specific. Don't start with "Based on".`

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
        const streaming = await fetchStreaming(data.id)
        const cast = data.credits?.cast?.slice(0, 3).map((c: any) => c.name) || []
        return {
          id: data.id,
          title: data.title,
          year: data.release_date?.slice(0, 4),
          poster: data.poster_path,
          genres: data.genres?.map((g: any) => g.name) || [],
          director,
          tmdbRating: Math.round(data.vote_average * 10) / 10,
          streaming,
          synopsis: data.overview || '',
          cast,
          runtime: data.runtime || 0,
          language: data.original_language?.toUpperCase() || ''
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
    }))

    return surpriseResults
  }

  async function fetchAndScore() {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('mode, genres')
      .eq('id', id)
      .single()

    const mode = sessionData?.mode || 'rated'
    const genres: string[] = sessionData?.genres || []
    setSessionMode(mode)
    setSessionGenres(genres)

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
    const summary = await generateGroupSummary(participantData, surpriseResults, 'unseen', sessionGenres)
    setGroupSummary(summary)
    if (surpriseResults.length > 0) saveSessionHistory(participantData, surpriseResults[0], 'unseen', genres)
    setLoading(false)
      return
    }
    const allFilmIds = new Set<string>()
    participantData.forEach(p => {
      Object.keys(p.votes).forEach(fid => allFilmIds.add(fid))
    })

    const filmDetails = await Promise.all(
      Array.from(allFilmIds).map(async fid => {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${fid}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&append_to_response=credits`
        )
        const data = await res.json()
       const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name || ''
        const streaming = await fetchStreaming(data.id)
        const cast = data.credits?.cast?.slice(0, 3).map((c: any) => c.name) || []
        return {
          id: data.id,
          title: data.title,
          year: data.release_date?.slice(0, 4),
          poster: data.poster_path,
          genres: data.genres?.map((g: any) => g.name) || [],
          director,
          tmdbRating: Math.round(data.vote_average * 10) / 10,
          streaming,
          synopsis: data.overview || '',
          cast,
          runtime: data.runtime || 0,
          language: data.original_language?.toUpperCase() || ''
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
      })
    }

    scored.sort((a, b) => b.groupScore - a.groupScore)

    const top5 = scored.slice(0, 5)

    setResults(top5)
    const summary = await generateGroupSummary(participantData, top5, mode, sessionGenres)
    setGroupSummary(summary)
    if (top5.length > 0) saveSessionHistory(participantData, top5[0], mode, genres)
    setLoading(false)
  }
  async function saveSessionHistory(
    participantData: any[],
    topFilm: FilmResult,
    mode: string,
    genres: string[]
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || historySaved) return
    setHistorySaved(true)
    const names = participantData.map(p => p.name)
    await supabase.from('session_history').insert({
      session_id: id,
      user_id: user.id,
      participant_names: names,
      top_film_title: topFilm.film.title,
      top_film_poster: topFilm.film.poster,
      top_film_year: topFilm.film.year,
      genres,
      mode
    })
  }
async function markWatched(film: Film) {
    const newWatched = new Set(watchedFilms)
    if (newWatched.has(film.id)) {
      newWatched.delete(film.id)
    } else {
      newWatched.add(film.id)
    }
    setWatchedFilms(newWatched)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (newWatched.has(film.id)) {
      await supabase.from('user_ratings').upsert({
        user_id: user.id,
        film_id: String(film.id),
        film_title: film.title,
        film_poster: film.poster,
        film_year: film.year,
        film_genres: film.genres,
        rating: -3
      }, { onConflict: 'user_id,film_id' })
    } else {
      await supabase.from('user_ratings')
        .delete()
        .eq('user_id', user.id)
        .eq('film_id', String(film.id))
        .eq('rating', -3)
    }
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
        <div className="mt-8 mb-6">
          <div className="h-7 w-48 bg-gray-800 rounded-lg mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-gray-800 rounded-lg mb-2 animate-pulse" />
          <div className="h-3 w-32 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <p className="text-center text-sm text-gray-400 mb-8 leading-relaxed px-4 transition-all duration-500 min-h-[40px]">
          {loadingMessages[loadingMessage]}
        </p>
        {[1,2,3].map(i => (
          <div key={i} className="mb-4 rounded-2xl border border-gray-800 p-4">
            <div className="flex gap-3 items-start">
              <div
                className="rounded-lg bg-gray-800 animate-pulse flex-shrink-0"
                style={{width: '64px', height: '96px'}}
              />
              <div className="flex-1">
                <div className="h-3 w-16 bg-gray-700 rounded-full mb-3 animate-pulse" />
                <div className="h-4 w-40 bg-gray-800 rounded-lg mb-2 animate-pulse" />
                <div className="h-3 w-28 bg-gray-800 rounded-lg mb-3 animate-pulse" />
                <div className="flex gap-1 mb-2">
                  <div className="h-5 w-12 bg-gray-800 rounded-full animate-pulse" />
                  <div className="h-5 w-14 bg-gray-800 rounded-full animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-800 rounded-lg animate-pulse" />
                  <div className="h-6 w-14 bg-gray-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
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
        {participants.length === 1
          ? `Personal picks for ${participants[0]?.name}`
          : `Based on ${participants.length} people — ${participants.map(p => p.name).join(', ')}`}
      </p>
      {sessionMode === 'unseen' && (
        <p className="text-xs text-gray-200 mb-4">
          Picked based on your group's favourite genres — none of you have rated these before.
        </p>
      )}
      {sessionGenres.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {sessionGenres.map(genre => (
            <span key={genre} className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded-full">
              {genre}
            </span>
          ))}
        </div>
      )}
      {groupSummary && (
        <p className="text-sm text-gray-200 italic mb-8 leading-relaxed">{groupSummary}</p>
      )}

      {results.map((result, i) => (
        <div
          key={result.film.id}
          className={`mb-6 rounded-2xl overflow-hidden border ${i === 0 ? 'border-purple-400' : 'border-gray-600'}`}
        >
          <div
            className="flex gap-3 p-4 items-start overflow-hidden cursor-pointer"
            onClick={() => setExpandedFilm(expandedFilm === result.film.id ? null : result.film.id)}
          >
            {result.film.poster && (
              <img
                src={`https://image.tmdb.org/t/p/w200${result.film.poster}`}
                alt={result.film.title}
               className="rounded-lg flex-shrink-0"
                style={{width: '64px', height: '96px', objectFit: 'cover', objectPosition: 'center'}}
              />
            )}
            <div className="flex-1 min-w-0">
              {i === 0 && (
                <span className="text-xs bg-purple-700 text-purple-100 px-2 py-0.5 rounded-full mb-2 inline-block">
                  {sessionMode === 'unseen' ? 'Top pick' : 'Best match'}
                </span>
              )}
              <h2 className="font-medium text-sm leading-tight mb-1 text-white truncate">{result.film.title}</h2>
              <p className="text-xs text-gray-300 mb-1 truncate">{result.film.year}{result.film.director ? ` · ${result.film.director}` : ''}</p>
              {result.film.tmdbRating > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-xs text-gray-300">{result.film.tmdbRating}/10</span>
                </div>
              )}
              {result.film.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {result.film.genres.slice(0, 2).map(g => (
                    <span key={g} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              )}
             {sessionMode === 'rated' && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.breakdown.filter(b => b.vote > 0).map(b => (
                    <span key={b.name} className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full">
                      {b.name} {b.vote}★
                    </span>
                  ))}
                  {result.breakdown.filter(b => b.vote === -1).map(b => (
                    <span key={b.name} className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full">
                      🕐 {b.name} — unseen
                    </span>
                  ))}
                </div>
              )}
              {result.film.streaming && result.film.streaming.length > 0 ? (
                <div className="flex flex-wrap gap-1 items-center">
                  {result.film.streaming.map(service => (
                    <a
                      key={service.name}
                      href={service.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-gray-800 rounded-lg px-2 py-1 hover:bg-gray-700 transition-all"
                      title={service.name}
                    >
                      {service.logo ? (
                        <img src={service.logo} alt={service.name} className="h-3 object-contain" />
                      ) : (
                        <span className="text-xs text-white">{service.name}</span>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Not streaming in AU</p>
              )}
            </div>
         </div>
          <div className="px-4 pb-1 flex justify-center">
            <span className="text-xs text-gray-500">
              {expandedFilm === result.film.id ? '▲ less' : '▼ more'}
            </span>
          </div>
          {expandedFilm === result.film.id && (
            <div className="px-4 pb-4 border-t border-gray-700 pt-4">
              {result.film.synopsis && (
                <p className="text-sm text-gray-100 leading-relaxed mb-4">{result.film.synopsis}</p>
              )}
              <div className="flex items-center gap-3 mb-3">
                <button
                onClick={e => { e.stopPropagation(); if (!userRatedIds.has(result.film.id)) markWatched(result.film) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  watchedFilms.has(result.film.id)
                    ? 'bg-green-900 text-green-300 border border-green-700'
                    : 'border border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={watchedFilms.has(result.film.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {watchedFilms.has(result.film.id)
                  ? userRatedIds.has(result.film.id) ? 'Already rated' : 'Watched'
                  : 'Mark as watched'}
              </button>
              </div>
              <div className="flex flex-col gap-3">
                {result.film.cast.length > 0 && (
                  <div>
                    <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-1">Cast</p>
                    <p className="text-sm text-white">{result.film.cast.join(' · ')}</p>
                  </div>
                )}
                <div className="flex gap-6">
                  {result.film.runtime > 0 && (
                    <div>
                      <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-1">Runtime</p>
                      <p className="text-sm text-white">{Math.floor(result.film.runtime / 60)}h {result.film.runtime % 60}m</p>
                    </div>
                  )}
                  {result.film.language && (
                    <div>
                      <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-1">Language</p>
                      <p className="text-sm text-white">{{
                        'EN': 'English', 'FR': 'French', 'DE': 'German',
                        'ES': 'Spanish', 'IT': 'Italian', 'JA': 'Japanese',
                        'KO': 'Korean', 'ZH': 'Mandarin', 'PT': 'Portuguese',
                        'RU': 'Russian', 'AR': 'Arabic', 'HI': 'Hindi',
                        'SV': 'Swedish', 'DA': 'Danish', 'NL': 'Dutch',
                        'PL': 'Polish', 'TR': 'Turkish', 'TH': 'Thai'
                      }[result.film.language] || result.film.language}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </main>
  )
}