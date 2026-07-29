'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
}

type Vote = number | null

function getStarValue(el: HTMLElement, clientX: number) {
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
  const starWidth = rect.width / 5
  const starIndex = Math.floor(x / starWidth)
  const withinStar = (x % starWidth) / starWidth
  const clamped = Math.max(0, Math.min(4, starIndex))
  return withinStar < 0.5 ? clamped + 0.5 : clamped + 1
}

function StarRating({ filmId, value, onVote }: {
  filmId: number
  value: Vote
  onVote: (filmId: number, star: number) => void
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      setHoverVal(getStarValue(el, e.touches[0].clientX))
    }
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      onVote(filmId, getStarValue(el, e.changedTouches[0].clientX))
      setHoverVal(null)
    }
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })
    return () => {
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [filmId, onVote])

  const currentVal = hoverVal ?? (value ?? 0)
  const isNegative = currentVal === -1 || currentVal === -2

  return (
    <div
      ref={rowRef}
      className="flex justify-center py-1 select-none cursor-pointer"
      style={{ touchAction: 'none', width: '100%' }}
      onMouseMove={e => {
        if (!rowRef.current) return
        setHoverVal(getStarValue(rowRef.current, e.clientX))
      }}
      onMouseLeave={() => setHoverVal(null)}
      onClick={e => {
        if (!rowRef.current) return
        onVote(filmId, getStarValue(rowRef.current, e.clientX))
      }}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const fullActive = !isNegative && star <= currentVal
        const halfActive = !isNegative && star - 0.5 === currentVal
        return (
          <div
            key={star}
            className="relative pointer-events-none"
            style={{ width: '20%', height: '28px', display: 'inline-block' }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-2xl text-gray-300">
              ★
            </span>
            {(fullActive || halfActive) && (
              <span
                className="absolute inset-0 flex items-center justify-center text-2xl text-yellow-400 overflow-hidden"
                style={{ clipPath: halfActive ? 'inset(0 50% 0 0)' : 'none' }}
              >
                ★
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [votes, setVotes] = useState<Record<number, Vote>>({})
  const [done, setDone] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [films, setFilms] = useState<Film[]>([])
  const [mode, setMode] = useState<'rated' | 'unseen' | null>(null)
  const [sessionMode, setSessionMode] = useState<string | null>(null)
  const [sessionGenres, setSessionGenres] = useState<string[]>([])
  const [resultsReady, setResultsReady] = useState(false)
  const [userParticipant, setUserParticipant] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) setCheckingStatus(false)
    })
    fetchParticipants()
    fetchFilms()

    const participantsSub = supabase
      .channel(`participants-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${id}`
      }, () => fetchParticipants())
      .subscribe()

    const sessionSub = supabase
      .channel(`session-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${id}`
      }, (payload: any) => {
        if (payload.new.results_ready) setResultsReady(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(participantsSub)
      supabase.removeChannel(sessionSub)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.username) {
        setName(user.user_metadata.username)
      }
    })
  }, [])

  async function fetchFilms() {
    const { data } = await supabase
      .from('sessions')
      .select('film_list, mode, genres, results_ready')
      .eq('id', id)
      .single()
    if (data?.film_list) setFilms(data.film_list)
    if (data?.mode) {
      setSessionMode(data.mode)
      setMode(data.mode)
    }
    if (data?.genres) setSessionGenres(data.genres)
    if (data?.results_ready) setResultsReady(true)
  }

  async function fetchParticipants() {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', id)
    if (data) {
      setParticipants(data)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const existing = data.find(p => p.name === user.user_metadata?.username)
        if (existing) {
          setUserParticipant(existing)
          setDone(true)
          setJoined(true)
        }
      }
      setCheckingStatus(false)
    }
  }

  async function fetchPastRatings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: ratings } = await supabase
      .from('user_ratings')
      .select('film_id, rating')
      .eq('user_id', user.id)
    if (ratings && ratings.length > 0) {
      const prefilled: Record<number, number> = {}
      ratings.forEach(r => { prefilled[Number(r.film_id)] = r.rating })
      setVotes(prev => ({ ...prefilled, ...prev }))
    }
  }

  async function joinSession() {
    if (!name.trim()) return
    setCheckingStatus(false)
    setJoined(true)
    await fetchPastRatings()
  }

  const vote = useCallback((filmId: number, stars: number) => {
    setVotes(prev => ({ ...prev, [filmId]: stars }))
  }, [])

  async function submitVotes() {
    const { data: { user } } = await supabase.auth.getUser()
    const avatar = user?.user_metadata?.avatar || null
    await supabase.from('participants').insert({
      session_id: id,
      name,
      votes,
      mode,
      avatar
    })
    if (user) {
      const ratingRows = films
        .filter(film => votes[film.id] !== undefined && votes[film.id] !== null)
        .map(film => ({
          user_id: user.id,
          film_id: String(film.id),
          film_title: film.title,
          film_poster: film.poster,
          film_year: film.year,
          film_genres: [],
          rating: votes[film.id]
        }))
      if (ratingRows.length > 0) {
        await supabase.from('user_ratings').upsert(ratingRows, { onConflict: 'user_id,film_id' })
      }
    }
    setDone(true)
    fetchParticipants()
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allVoted = films.length > 0 && films.every(f => votes[f.id] !== undefined && votes[f.id] !== null)

  if (checkingStatus) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading session...</p>
        </div>
      </main>
    )
  }
  if (done) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-2">Thanks {name}!</h1>
        <p className="text-gray-500 mb-6">Your votes are in. Waiting for others to join...</p>
        <p className="text-xs text-gray-600 mb-8">Visit the results page to save this session to your history.</p>
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3 text-white">Who's joined so far ({participants.length})</p>
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {p.avatar || p.name[0].toUpperCase()}
              </div>
              <span className="text-sm text-white">{p.name}</span>
              <span className="text-xs text-green-500 ml-auto">✓ voted</span>
            </div>
          ))}
        </div>
        {resultsReady ? (
          <a
            href={`/session/${id}/results`}
            className="w-full bg-purple-700 text-white py-3 rounded-xl text-sm mb-3 font-medium text-center block"
          >
            See group results
          </a>
        ) : (
          <button
            onClick={async () => {
              await supabase
                .from('sessions')
                .update({ results_ready: true })
                .eq('id', id)
              window.location.href = `/session/${id}/results`
            }}
            className="w-full bg-purple-700 text-white py-3 rounded-xl text-sm mb-3 font-medium text-center block"
          >
            See group results
          </button>
        )}
        <button
          onClick={copyLink}
          className="w-full border border-gray-400 text-gray-100 py-3 rounded-xl text-sm mt-3"
        >
          {copied ? 'Link copied!' : 'Copy invite link'}
        </button>
      </main>
    )
  }

  if (!joined) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-2">You're invited!</h1>
        <p className="text-gray-200 mb-8">Enter your name to join this movie night session.</p>
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3 text-white">Who's joined so far ({participants.length})</p>
          {participants.length === 0 && (
            <p className="text-sm text-gray-200">Nobody yet — be the first!</p>
          )}
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {p.avatar || p.name[0].toUpperCase()}
              </div>
              <span className="text-sm text-white">{p.name}</span>
              <span className="text-xs text-green-500 ml-auto">✓ voted</span>
            </div>
          ))}
        </div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-6 outline-none focus:border-gray-400"
        />
        {sessionMode && (
          <div className="bg-gray-800 rounded-xl px-4 py-3 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{sessionMode === 'rated' ? '🌟' : '🎲'}</span>
              <p className="text-sm font-medium text-white">
                {sessionMode === 'rated' ? 'Something we love' : 'Surprise us'}
              </p>
            </div>
            {sessionGenres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sessionGenres.map(genre => (
                  <span key={genre} className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded-full">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {resultsReady && (
          <a
            href={`/session/${id}/results`}
            className="w-full bg-green-700 text-white py-3 rounded-xl text-sm mb-3 font-medium text-center block"
          >
            Results are ready — view now
          </a>
        )}
        <button
          onClick={joinSession}
          disabled={!name.trim()}
          className="w-full bg-purple-700 text-white py-3 rounded-xl font-medium disabled:opacity-40 mb-3"
        >
          Join session
        </button>
        <button
          onClick={copyLink}
          className="w-full border border-gray-400 text-gray-100 py-3 rounded-xl text-sm"
        >
          {copied ? 'Link copied!' : 'Copy invite link'}
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-medium mb-1">Hey {name}!</h1>
      <p className="text-gray-500 mb-2">Rate these films honestly</p>
      <p className="text-sm text-gray-400 mb-8">{Object.keys(votes).length} of {films.length} rated</p>
      {films.length === 0 ? (
        <div className="text-center text-gray-400 py-16">Loading films...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {films.map(film => (
            <div key={film.id} className="rounded-xl overflow-hidden border border-gray-100">
              <img
                src={`https://image.tmdb.org/t/p/w300${film.poster}`}
                alt={film.title}
                className="w-full"
              />
              <div className="p-2">
                <p className="text-xs font-medium mb-1 leading-tight">{film.title}</p>
                <p className="text-xs text-gray-400 mb-2">{film.year}</p>
                <StarRating filmId={film.id} value={votes[film.id]} onVote={vote} />
                {votes[film.id] !== undefined && votes[film.id]! > 0 && (
                  <p className="text-center text-xs text-gray-400 mb-1">{votes[film.id]}★</p>
                )}
                <div className="flex justify-center gap-1 mt-1">
                  <button
                    onClick={() => vote(film.id, -1)}
                    className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                      votes[film.id] === -1
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray.400'
                    }`}
                  >
                    🕐 Watch later
                  </button>
                  <button
                    onClick={() => vote(film.id, -2)}
                    className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                      votes[film.id] === -2
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'border-gray-200 text-gray-400'
                    }`}
                  >
                    ❌ Not interested
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {allVoted && (
        <button
          onClick={submitVotes}
          className="w-full bg-purple-700 text-white py-3 rounded-xl font-medium"
        >
          Submit my votes
        </button>
      )}
    </main>
  )
}