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
}

type Vote = number | null

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [votes, setVotes] = useState<Record<number, Vote>>({})
  const [done, setDone] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [films, setFilms] = useState<Film[]>([])
  const [hoveredStar, setHoveredStar] = useState<{filmId: number, star: number} | null>(null)

  useEffect(() => {
    fetchParticipants()
    fetchFilms()
  }, [])

  async function fetchFilms() {
    const page = Math.floor(Math.random() * 5) + 1
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&page=${page}`
    )
    const data = await res.json()
    const shuffled = data.results
      .filter((f: any) => f.poster_path)
      .sort(() => Math.random() - 0.5)
      .slice(0, 12)
      .map((f: any) => ({
        id: f.id,
        title: f.title,
        year: f.release_date?.slice(0, 4),
        poster: f.poster_path
      }))
    setFilms(shuffled)
  }

  async function fetchParticipants() {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', id)
    if (data) setParticipants(data)
  }

  async function joinSession() {
    if (!name.trim()) return
    setJoined(true)
  }

  function vote(filmId: number, stars: number) {
    setVotes(prev => ({ ...prev, [filmId]: stars }))
  }

  async function submitVotes() {
    const { data, error } = await supabase.from('participants').insert({
      session_id: id,
      name: name,
      votes: votes
    })
    console.log('insert result:', data, error)
    setDone(true)
    fetchParticipants()
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allVoted = films.length > 0 && films.every(f => votes[f.id] !== undefined && votes[f.id] !== null)
  if (done) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-2">Thanks {name}!</h1>
        <p className="text-gray-500 mb-8">Your votes are in. Waiting for others to join...</p>
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3 text-white">Who's joined so far ({participants.length})</p>
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs">
                {p.name[0].toUpperCase()}
              </div>
              <span className="text-sm text-white">{p.name}</span>
              <span className="text-xs text-green-500 ml-auto">✓ voted</span>
            </div>
          ))}
        </div>
        <button
          onClick={copyLink}
          className="w-full border border-gray-200 py-3 rounded-xl text-sm mb-3"
        >
          {copied ? '✓ Link copied!' : 'Copy invite link'}
        </button>
      </main>
    )
  }

  if (!joined) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-2">You're invited!</h1>
        <p className="text-gray-500 mb-8">Enter your name to join this movie night session.</p>
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3 text-white">Who's joined so far ({participants.length})</p>
          {participants.length === 0 && (
            <p className="text-sm text-gray-400">Nobody yet — be the first!</p>
          )}
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs">
                {p.name[0].toUpperCase()}
              </div>
              <span className="text-sm text-white">{p.name}</span>
            </div>
          ))}
        </div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-gray-400"
        />
        <button
          onClick={joinSession}
          className="w-full bg-purple-700 text-white py-3 rounded-xl font-medium"
        >
          Join session →
        </button>
        <button
          onClick={copyLink}
          className="w-full border border-gray-200 py-3 rounded-xl text-sm mt-3"
        >
          {copied ? '✓ Link copied!' : 'Copy invite link'}
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
                <div className="flex justify-center gap-0 py-1">
                  {[1,2,3,4,5].map(star => {
                    const currentVal = hoveredStar?.filmId === film.id
                      ? hoveredStar.star
                      : (votes[film.id] ?? 0)
                    const isNegative = currentVal === -1 || currentVal === -2
                    const fullActive = !isNegative && star <= currentVal
                    const halfActive = !isNegative && star - 0.5 === currentVal
                    return (
                      <div key={star} className="relative" style={{width: '22px', height: '22px'}}>
                        <button
                          onClick={() => vote(film.id, star - 0.5)}
                          onMouseEnter={() => setHoveredStar({ filmId: film.id, star: star - 0.5 })}
                          onMouseLeave={() => setHoveredStar(null)}
                          className="absolute left-0 top-0 w-1/2 h-full z-10 opacity-0"
                        />
                        <button
                          onClick={() => vote(film.id, star)}
                          onMouseEnter={() => setHoveredStar({ filmId: film.id, star })}
                          onMouseLeave={() => setHoveredStar(null)}
                          className="absolute right-0 top-0 w-1/2 h-full z-10 opacity-0"
                        />
                        <span
                          className="absolute inset-0 flex items-center justify-center text-lg pointer-events-none select-none text-gray-300"
                        >
                          ★
                        </span>
                        {(fullActive || halfActive) && (
                          <span
                            className="absolute inset-0 flex items-center justify-center text-lg pointer-events-none select-none text-yellow-400 overflow-hidden"
                            style={{ clipPath: halfActive ? 'inset(0 50% 0 0)' : 'none' }}
                          >
                            ★
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {votes[film.id] !== undefined && votes[film.id]! > 0 && (
                  <p className="text-center text-xs text-gray-400 mb-1">{votes[film.id]}★</p>
                )}
                <div className="flex justify-center gap-1 mt-1">
                  <button
                    onClick={() => vote(film.id, -1)}
                    className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                      votes[film.id] === -1
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-400'
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
          Submit my votes →
        </button>
      )}
    </main>
  )
}