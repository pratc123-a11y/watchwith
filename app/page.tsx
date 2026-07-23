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

const GENRES = [
  { id: 28, name: 'Action', emoji: '💥' },
  { id: 12, name: 'Adventure', emoji: '🗺️' },
  { id: 16, name: 'Animation', emoji: '🎨' },
  { id: 35, name: 'Comedy', emoji: '😂' },
  { id: 80, name: 'Crime', emoji: '🔫' },
  { id: 99, name: 'Documentary', emoji: '🎥' },
  { id: 18, name: 'Drama', emoji: '🎭' },
  { id: 14, name: 'Fantasy', emoji: '🧙' },
  { id: 27, name: 'Horror', emoji: '👻' },
  { id: 9648, name: 'Mystery', emoji: '🔍' },
  { id: 10749, name: 'Romance', emoji: '❤️' },
  { id: 878, name: 'Sci-Fi', emoji: '🚀' },
  { id: 53, name: 'Thriller', emoji: '😰' },
  { id: 10752, name: 'War', emoji: '⚔️' },
]

async function fetchFilmsForGenres(genreIds: number[]) {
  const perGenre = Math.ceil(12 / genreIds.length)

  const genreResults = await Promise.all(
    genreIds.map(async (genreId) => {
      const page = Math.floor(Math.random() * 3) + 1
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=500&page=${page}`
      )
      const data = await res.json()
      return data.results
        .filter((f: any) => f.poster_path)
        .slice(0, perGenre + 2)
    })
  )

  const allFilmIds = new Set<number>()
  const combined = []

  for (const results of genreResults) {
    for (const f of results) {
      if (!allFilmIds.has(f.id)) {
        allFilmIds.add(f.id)
        combined.push(f)
      }
    }
  }

  return combined
    .sort(() => Math.random() - 0.5)
    .slice(0, 12)
    .map((f: any) => ({
      id: f.id,
      title: f.title,
      year: f.release_date?.slice(0, 4),
      poster: f.poster_path,
      genres: f.genre_ids
    }))
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
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'rated' | 'unseen' | null>(null)
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [step, setStep] = useState<'mode' | 'genres'>('mode')

  function toggleGenre(id: number) {
    setSelectedGenres(prev =>
      prev.includes(id)
        ? prev.filter(g => g !== id)
        : prev.length < 2
          ? [...prev, id]
          : prev
    )
  }

  async function createSession() {
    setLoading(true)
    const id = generateId()
    const films = selectedGenres.length > 0
      ? await fetchFilmsForGenres(selectedGenres)
      : await fetchRandomFilms()
    const selectedGenreNames = GENRES
      .filter(g => selectedGenres.includes(g.id))
      .map(g => g.name)
    const { error } = await supabase.from('sessions').insert({
      id,
      films: [],
      film_list: films,
      mode: mode,
      genres: selectedGenreNames
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

      {step === 'mode' && (
        <>
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
            onClick={() => setStep('genres')}
            disabled={!mode}
            className="w-full bg-purple-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-40"
          >
            Next — pick genres
          </button>
        </>
      )}

      {step === 'genres' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep('mode')}
              className="text-gray-400 text-sm"
            >
              ← Back
            </button>
            <p className="text-sm font-medium text-white">
              What are you in the mood for? (pick up to 2)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {GENRES.map(genre => (
              <button
                key={genre.id}
                onClick={() => toggleGenre(genre.id)}
                className={`py-3 px-4 rounded-xl border text-sm transition-all text-left ${
                  selectedGenres.includes(genre.id)
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'border-gray-600 text-gray-100'
                }`}
              >
                {genre.emoji} {genre.name}
              </button>
            ))}
          </div>
          <button
            onClick={createSession}
            disabled={loading}
            className="w-full bg-purple-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-40"
          >
            {loading ? 'Setting up session...' : selectedGenres.length > 0 ? 'Start session' : 'Start session (any genre)'}
          </button>
        </>
      )}
    </main>
  )
}