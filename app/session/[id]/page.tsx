'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FILMS = [
  { id: 27205, title: 'Inception', year: '2010', poster: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
  { id: 155, title: 'The Dark Knight', year: '2008', poster: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { id: 680, title: 'Pulp Fiction', year: '1994', poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
  { id: 13, title: 'Forrest Gump', year: '1994', poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg' },
  { id: 120, title: 'The Lord of the Rings', year: '2001', poster: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg' },
  { id: 603, title: 'The Matrix', year: '1999', poster: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg' },
  { id: 289, title: 'Casablanca', year: '1942', poster: '/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg' },
  { id: 129, title: 'Spirited Away', year: '2001', poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg' },
  { id: 389, title: '12 Angry Men', year: '1957', poster: '/ppd84D2i9W8jXmsyInGyihiSyqz.jpg' },
  { id: 637, title: 'Life is Beautiful', year: '1997', poster: '/74hLDKjD5aGYOotO6esUVaeISa2.jpg' },
  { id: 424, title: "Schindler's List", year: '1993', poster: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg' },
  { id: 98, title: 'Gladiator', year: '2000', poster: '/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg' },
]

type Vote = 'loved' | 'meh' | 'no' | 'unseen' | null

const VOTE_OPTIONS = [
  { value: 'loved', emoji: '❤️', active: 'bg-green-100 border-green-300 text-green-700' },
  { value: 'meh', emoji: '😐', active: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'no', emoji: '👎', active: 'bg-red-100 border-red-300 text-red-700' },
  { value: 'unseen', emoji: '👀', active: 'bg-blue-100 border-blue-300 text-blue-700' },
]

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [votes, setVotes] = useState<Record<number, Vote>>({})
  const [done, setDone] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchParticipants()
  }, [])

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

  function vote(id: number, value: Vote) {
    setVotes(prev => ({ ...prev, [id]: value }))
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

  const allVoted = FILMS.every(f => votes[f.id])

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
          className="w-full bg-black text-white py-3 rounded-xl font-medium"
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
      <p className="text-sm text-gray-400 mb-8">{Object.keys(votes).length} of {FILMS.length} rated</p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {FILMS.map(film => (
          <div key={film.id} className="rounded-xl overflow-hidden border border-gray-100">
            <img
              src={`https://image.tmdb.org/t/p/w300${film.poster}`}
              alt={film.title}
              className="w-full"
            />
            <div className="p-2">
              <p className="text-xs font-medium mb-1 leading-tight">{film.title}</p>
              <p className="text-xs text-gray-400 mb-2">{film.year}</p>
              <div className="flex gap-1">
                {VOTE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => vote(film.id, opt.value as Vote)}
                    className={`flex-1 text-xs py-1 rounded-lg border transition-all ${
                      votes[film.id] === opt.value
                        ? opt.active
                        : 'border-gray-200 text-gray-400'
                    }`}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {allVoted && (
        <button
          onClick={submitVotes}
          className="w-full bg-black text-white py-3 rounded-xl font-medium"
        >
          Submit my votes →
        </button>
      )}
    </main>
  )
}