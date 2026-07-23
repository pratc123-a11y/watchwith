'use client'

import React, { useState, useEffect } from 'react'
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
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

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
    await supabase.from('sessions').insert({
      id,
      films: [],
      film_list: films,
      mode: mode,
      genres: selectedGenreNames
    })
    router.push(`/session/${id}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-medium mb-2">
            watch<span className="text-purple-400">with</span>
          </h1>
          <p className="text-gray-200 text-sm">Stop arguing about what to watch.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          {step === 'mode' && (
            <>
              <h2 className="text-base font-medium text-white mb-1">Start a session</h2>
              <p className="text-gray-200 text-sm mb-6">What are you looking for tonight?</p>
              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={() => setMode('rated')}
                  className={`w-full py-3 px-4 rounded-xl border text-sm transition-all text-left ${
                    mode === 'rated'
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'border-gray-700 text-gray-200 hover:border-gray-500'
                  }`}
                >
                  <span className="block font-medium mb-0.5">🌟 Something we love</span>
                  <span className="block text-xs opacity-90">Rate films you know and find your best group match</span>
                </button>
                <button
                  onClick={() => setMode('unseen')}
                  className={`w-full py-3 px-4 rounded-xl border text-sm transition-all text-left ${
                    mode === 'unseen'
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'border-gray-700 text-gray-200 hover:border-gray-500'
                  }`}
                >
                  <span className="block font-medium mb-0.5">🎲 Surprise us</span>
                  <span className="block text-xs opacity-90">Discover something none of you have seen</span>
                </button>
              </div>
              <button
                onClick={() => setStep('genres')}
                disabled={!mode}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-all text-sm"
              >
                Next — pick genres
              </button>
            </>
          )}

          {step === 'genres' && (
            <>
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => setStep('mode')} className="text-gray-400 text-sm hover:text-white">
                  ←
                </button>
                <h2 className="text-base font-medium text-white">Tonight's mood</h2>
              </div>
              <p className="text-gray-200 text-sm mb-5 ml-6">Pick up to 2 genres</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {GENRES.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`py-2.5 px-3 rounded-xl border text-sm transition-all text-left ${
                      selectedGenres.includes(genre.id)
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'border-gray-700 text-gray-200 hover:border-gray-500'
                    }`}
                  >
                    {genre.emoji} {genre.name}
                  </button>
                ))}
              </div>
              <button
                onClick={createSession}
                disabled={loading}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-all text-sm"
              >
                {loading ? 'Setting up...' : selectedGenres.length > 0 ? 'Start session' : 'Start session (any genre)'}
              </button>
            </>
          )}
        </div>
         {user ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-200">Signed in as</p>
              <p className="text-sm text-white">{user.user_metadata?.username || user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-all"
            >
              Sign out
            </button>
          </div>
        ) : (
          <a
            href="/auth"
            className="block text-center border border-gray-700 text-gray-200 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all"
          >
            Sign in to save your taste profile
          </a>
        )}
      </div>
    </main>
  )
}