'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function generateId() {
  return Math.random().toString(36).substring(2, 8)
}

async function fetchRandomFilms() {
  const page = Math.floor(Math.random() * 5) + 1
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/top_rated?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&page=${page}`
  )
  const data = await res.json()
  return data.results
    .filter((f: any) => f.poster_path)
    .sort(() => Math.random() - 0.5)
    .slice(0, 12)
    .map((f: any) => ({
      id: f.id,
      title: f.title,
      year: f.release_date?.slice(0, 4),
      poster: f.poster_path
    }))
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [mode, setMode] = useState<'rated' | 'unseen' | null>(null)

  async function createSession() {
    if (!mode) return
    setLoading(true)
    const id = generateId()
    const films = await fetchRandomFilms()
    const { error } = await supabase.from('sessions').insert({
      id,
      films: [],
      film_list: films,
      mode: mode
    })
    console.log('session insert error:', error)
    router.push(`/session/${id}`)
  }

  return (
    <main className="min-h-screen p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-medium mt-16 mb-4">
        Stop arguing about what to watch.
      </h1>
      <p className="text-gray-300 mb-10">
        Everyone rates a few films. We find what works for the whole group.
      </p>
      <p className="text-sm font-medium text-white mb-3">What are you looking for tonight?</p>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('rated')}
          className={`flex-1 py-3 rounded-xl border text-sm transition-all ${
            mode === 'rated'
              ? 'bg-purple-700 text-white border-purple-700'
              : 'border-gray-600 text-gray-100'
          }`}
        >
          🌟 Something we love
        </button>
        <button
          onClick={() => setMode('unseen')}
          className={`flex-1 py-3 rounded-xl border text-sm transition-all ${
            mode === 'unseen'
              ? 'bg-purple-700 text-white border-purple-700'
              : 'border-gray-600 text-gray-100'
          }`}
        >
          🎲 Surprise us
        </button>
      </div>
      <button
        onClick={createSession}
        disabled={!mode || loading}
        className="w-full bg-purple-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-40"
      >
        {loading ? 'Setting up session...' : 'Start a session'}
      </button>
    </main>
  )
}