'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RatedPage() {
  const [ratings, setRatings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }
      const { data } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('user_id', user.id)
        .gt('rating', 0)
        .order('rating', { ascending: false })
      if (data) setRatings(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <div className="h-6 w-32 bg-gray-800 rounded animate-pulse mt-4 mb-8" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <a href="/profile" className="text-gray-400 hover:text-white">←</a>
        <h1 className="text-xl font-medium text-white">All rated films</h1>
        <span className="text-gray-500 text-sm ml-auto">{ratings.length} films</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ratings.map(film => (
          <div key={film.film_id}>
            {film.film_poster ? (
              <img
                src={`https://image.tmdb.org/t/p/w200${film.film_poster}`}
                alt={film.film_title}
                className="w-full rounded-xl mb-1 aspect-[2/3] object-cover"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gray-800 rounded-xl mb-1 flex items-center justify-center">
                <span className="text-gray-500 text-xs text-center p-2">{film.film_title}</span>
              </div>
            )}
            <p className="text-xs text-gray-300 leading-tight truncate">{film.film_title}</p>
            <p className="text-xs text-yellow-400">{film.rating}★</p>
          </div>
        ))}
      </div>
    </main>
  )
}