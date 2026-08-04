'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Rating = {
  film_id: string
  film_title: string
  film_poster: string
  film_year: string
  rating: number
}

export default function ProfilePage() {
 const [user, setUser] = useState<any>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [topGenres, setTopGenres] = useState<{name: string, emoji: string}[]>([])
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const AVATARS = [
    { emoji: '🎬', name: 'The Director' },
    { emoji: '🎭', name: 'The Actor' },
    { emoji: '🍿', name: 'The Cinephile' },
    { emoji: '🎥', name: 'The Filmmaker' },
    { emoji: '🧙', name: 'Gandalf' },
    { emoji: '🦁', name: 'Simba' },
    { emoji: '🚀', name: 'Buzz Lightyear' },
    { emoji: '👻', name: 'Casper' },
    { emoji: '🕵️', name: 'Sherlock' },
    { emoji: '🦸', name: 'The Hero' },
    { emoji: '🤖', name: 'HAL 9000' },
    { emoji: '🐉', name: 'Smaug' },
    { emoji: '🦊', name: 'Fantastic Mr Fox' },
    { emoji: '👾', name: 'Space Invader' },
    { emoji: '🌙', name: 'Luna' },
    { emoji: '🔥', name: 'Zuko' },
    { emoji: '💫', name: 'Stardust' },
    { emoji: '🐺', name: 'Lupin' },
    { emoji: '🌊', name: 'Aquaman' },
    { emoji: '🎯', name: 'Hawkeye' },
    { emoji: '⚡', name: 'Thor' },
    { emoji: '🦋', name: 'Mothra' },
    { emoji: '🎪', name: 'The Ringmaster' },
    { emoji: '🎸', name: 'Dewey Finn' },
  ]
  useEffect(() => {
    loadProfile()
  }, [])
async function saveAvatar(emoji: string) {
    const { error } = await supabase.auth.updateUser({
      data: { avatar: emoji }
    })
    if (!error) {
      setUser((prev: any) => ({
        ...prev,
        user_metadata: { ...prev.user_metadata, avatar: emoji }
      }))
    }
    setShowAvatarPicker(false)
  }
  const GENRE_EMOJIS: Record<string, string> = {
    'Action': '💥', 'Adventure': '🗺️', 'Animation': '🎨',
    'Comedy': '😂', 'Crime': '🔫', 'Documentary': '🎥',
    'Drama': '🎭', 'Fantasy': '🧙', 'Horror': '👻',
    'Mystery': '🔍', 'Romance': '❤️', 'Science Fiction': '🚀',
    'Sci-Fi': '🚀', 'Thriller': '😰', 'War': '⚔️',
    'Music': '🎵', 'Family': '👨‍👩‍👧', 'History': '📜',
    'Western': '🤠', 'TV Movie': '📺'
  }

  async function calculateTopGenres(ratingsData: Rating[]) {
    const genreScores: Record<string, number> = {}
    const ratedFilms = ratingsData.filter(r => r.rating > 0)

    await Promise.all(
      ratedFilms.slice(0, 20).map(async r => {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${r.film_id}?api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}`
          )
          const data = await res.json()
          const genres: string[] = data.genres?.map((g: any) => g.name) || []
          genres.forEach(g => {
            genreScores[g] = (genreScores[g] || 0) + r.rating
          })
        } catch {}
      })
    )

    const sorted = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => ({
        name,
        emoji: GENRE_EMOJIS[name] || '🎬'
      }))

    setTopGenres(sorted)
  }
  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/auth'
      return
    }
    setUser(user)
    const { data: ratings } = await supabase
      .from('user_ratings')
      .select('*')
      .eq('user_id', user.id)
      .order('rating', { ascending: false })
    if (ratings) {
      setRatings(ratings)
      calculateTopGenres(ratings)
    }
    setLoading(false)
  }

  function getStats() {
    if (ratings.length === 0) return null
    const rated = ratings.filter(r => r.rating > 0)
    const avg = rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
    const loved = rated.filter(r => r.rating >= 4.5)
    const watchLater = ratings.filter(r => r.rating === -1)
    return {
      total: rated.length,
      avg: Math.round(avg * 10) / 10,
      loved: loved.length,
      watchLater: watchLater.length,
    }
  }

  const stats = getStats()
  const topFilms = ratings.filter(r => r.rating >= 4.5).slice(0, 6)
  const watchLaterFilms = ratings.filter(r => r.rating === -1).slice(0, 6)

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-gray-800" />
            <div>
              <div className="h-5 w-32 bg-gray-800 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen max-w-md mx-auto pb-16">
      <div className="relative px-6 pt-8 pb-6 mb-6 border-b border-gray-800">
        <div className="flex items-center gap-5">
          <div className="relative">
            <button
              onClick={() => setShowAvatarPicker(true)}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-all ${
                user?.user_metadata?.avatar
                  ? 'bg-gray-800 border-2 border-gray-700'
                  : 'bg-gradient-to-br from-purple-600 to-purple-900'
              }`}
            >
              {user?.user_metadata?.avatar ? (
                <span className="text-4xl">{user.user_metadata.avatar}</span>
              ) : (
                <span className="text-white text-3xl font-medium">
                  {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full border-2 border-black flex items-center justify-center hover:bg-purple-500 transition-all"
            >
              <span className="text-white text-xs">✎</span>
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-medium text-white mb-0.5">
              {user?.user_metadata?.username || 'Anonymous'}
            </h1>
            <p className="text-gray-300 text-sm">{user?.email}</p>
            {stats && (
            <p className="text-gray-300 text-xs mt-1">
              {stats.total} films rated · {stats.avg}★ avg
            </p>
          )}
          </div>
        </div>
      </div>

      <div className="px-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            <a href="/profile/rated" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-purple-800 transition-all group">
              <p className="text-2xl font-medium text-white mb-1">{stats.total}</p>
              <p className="text-gray-300 text-xs">Films rated</p>
              <p className="text-purple-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-all">View →</p>
            </a>
            <a href="/profile/loved" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-purple-800 transition-all group">
              <p className="text-2xl font-medium text-white mb-1">{stats.loved}</p>
              <p className="text-gray-300 text-xs">Films loved</p>
              <p className="text-purple-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-all">View →</p>
            </a>
            <a href="/profile/watchlater" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-purple-800 transition-all group">
              <p className="text-2xl font-medium text-white mb-1">{stats.watchLater}</p>
              <p className="text-gray-300 text-xs">Watch later</p>
              <p className="text-purple-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-all">View →</p>
            </a>
            <a href="/profile/history" className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-purple-800 transition-all group">
              <p className="text-2xl font-medium text-white mb-1">🎬</p>
              <p className="text-gray-300 text-xs">Session history</p>
              <p className="text-purple-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-all">View →</p>
            </a>
          </div>
        )}
{topGenres.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-medium mb-1">Your taste</h2>
            <p className="text-gray-500 text-xs mb-3">Based on your highest rated films</p>
            <div className="flex gap-2">
              {topGenres.map(g => (
                <div key={g.name} className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                  <p className="text-2xl mb-1">{g.emoji}</p>
                  <p className="text-white text-xs font-medium">{g.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {topFilms.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-medium">Films you loved</h2>
                <p className="text-gray-500 text-xs mt-0.5">4.5★ and above</p>
              </div>
              <a href="/profile/loved" className="text-purple-400 text-xs border border-purple-900 px-3 py-1 rounded-full hover:bg-purple-900 transition-all">
                View all
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {topFilms.map(film => (
                <div key={film.film_id} className="group">
                  <div className="relative rounded-xl overflow-hidden mb-1.5">
                    {film.film_poster ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${film.film_poster}`}
                        alt={film.film_title}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-500 text-xs text-center p-2">{film.film_title}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent px-2 py-1.5">
                      <p className="text-yellow-400 text-xs font-medium">{film.rating}★</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-tight truncate">{film.film_title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {watchLaterFilms.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-medium">Watch later</h2>
                <p className="text-gray-500 text-xs mt-0.5">{watchLaterFilms.length} films saved</p>
              </div>
              <a href="/profile/watchlater" className="text-purple-400 text-xs border border-purple-900 px-3 py-1 rounded-full hover:bg-purple-900 transition-all">
                View all
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {watchLaterFilms.map(film => (
                <div key={film.film_id} className="group">
                  <div className="relative rounded-xl overflow-hidden mb-1.5">
                    {film.film_poster ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${film.film_poster}`}
                        alt={film.film_title}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-500 text-xs text-center p-2">{film.film_title}</span>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1">
                      <span className="text-base">🕐</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-tight truncate">{film.film_title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {ratings.length === 0 && (
          <div className="text-center py-16 border border-gray-800 rounded-2xl">
            <p className="text-4xl mb-4">🎬</p>
            <p className="text-white font-medium mb-2">No ratings yet</p>
            <p className="text-gray-500 text-sm mb-6">Join a session and rate some films to build your taste profile.</p>
            <a href="/" className="inline-block bg-purple-700 text-white py-2.5 px-6 rounded-xl text-sm font-medium hover:bg-purple-600 transition-all">
              Start a session
            </a>
          </div>
        )}
      </div>
      {showAvatarPicker && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-end justify-center"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-t-3xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-medium">Choose your avatar</h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map(({ emoji, name }) => (
                <button
                  key={emoji}
                  onClick={() => saveAvatar(emoji)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all hover:bg-gray-800 ${
                    user?.user_metadata?.avatar === emoji
                      ? 'bg-purple-900 border border-purple-600'
                      : ''
                  }`}
                >
                  <span className="text-3xl mb-1">{emoji}</span>
                  <span className="text-xs text-gray-400 text-center leading-tight">{name}</span>
                </button>
              ))}
            </div>
           <button
              onClick={() => saveAvatar('')}
              className="w-full mt-4 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800 transition-all"
            >
              Reset to initials
            </button>
          </div>
        </div>
      )}
    </main>
  )
}