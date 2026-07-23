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

  useEffect(() => {
    loadProfile()
  }, [])

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

    if (ratings) setRatings(ratings)
    setLoading(false)
  }

  function getStats() {
    if (ratings.length === 0) return null
    const rated = ratings.filter(r => r.rating > 0)
    const avg = rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
    const loved = rated.filter(r => r.rating >= 4)
    const watchLater = ratings.filter(r => r.rating === -1)
    const notInterested = ratings.filter(r => r.rating === -2)
    return {
      total: rated.length,
      avg: Math.round(avg * 10) / 10,
      loved: loved.length,
      watchLater: watchLater.length,
      notInterested: notInterested.length
    }
  }

  const stats = getStats()
  const topFilms = ratings.filter(r => r.rating >= 4).slice(0, 6)
  const watchLaterFilms = ratings.filter(r => r.rating === -1).slice(0, 6)
  if (loading) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <p className="text-gray-400 mt-16">Loading your profile...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-md mx-auto pb-16">
      <a href="/" className="text-gray-400 text-sm mb-8 block">← Back</a>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-700 flex items-center justify-center text-white text-xl font-medium">
            {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium text-lg">{user?.user_metadata?.username || 'Anonymous'}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-3xl font-medium text-white">{stats.total}</p>
            <p className="text-gray-400 text-sm mt-1">Films rated</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-3xl font-medium text-white">{stats.avg}★</p>
            <p className="text-gray-400 text-sm mt-1">Average rating</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-3xl font-medium text-white">{stats.loved}</p>
            <p className="text-gray-400 text-sm mt-1">Films loved (4★+)</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-3xl font-medium text-white">{stats.watchLater}</p>
            <p className="text-gray-400 text-sm mt-1">Watch later</p>
          </div>
        </div>
      )}

      {topFilms.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-medium mb-3">Films you loved</h2>
          <div className="grid grid-cols-3 gap-2">
            {topFilms.map(film => (
              <div key={film.film_id}>
                {film.film_poster ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${film.film_poster}`}
                    alt={film.film_title}
                    className="w-full rounded-xl mb-1"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-800 rounded-xl mb-1 flex items-center justify-center">
                    <span className="text-gray-500 text-xs text-center p-2">{film.film_title}</span>
                  </div>
                )}
                <p className="text-xs text-gray-300 leading-tight">{film.film_title}</p>
                <p className="text-xs text-yellow-400">{film.rating}★</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {watchLaterFilms.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-medium mb-3">🕐 Watch later</h2>
          <div className="grid grid-cols-3 gap-2">
            {watchLaterFilms.map(film => (
              <div key={film.film_id}>
                {film.film_poster ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${film.film_poster}`}
                    alt={film.film_title}
                    className="w-full rounded-xl mb-1"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-800 rounded-xl mb-1 flex items-center justify-center">
                    <span className="text-gray-500 text-xs text-center p-2">{film.film_title}</span>
                  </div>
                )}
                <p className="text-xs text-gray-300 leading-tight">{film.film_title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratings.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400 mb-2">No ratings yet</p>
          <p className="text-gray-500 text-sm">Join a session and rate some films to build your taste profile.</p>
          <a href="/" className="block mt-4 bg-purple-700 text-white py-2 rounded-xl text-sm font-medium">
            Start a session
          </a>
        </div>
      )}
    </main>
  )
}