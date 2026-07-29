'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth'; return }
      const { data } = await supabase
        .from('session_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setHistory(data)
      setLoading(false)
    }
    load()
  }, [])

  function timeAgo(date: string) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  if (loading) return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/profile" className="text-gray-400">←</a>
        <h1 className="text-xl font-medium text-white">Session history</h1>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="mb-4 bg-gray-900 rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-12 h-16 bg-gray-800 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-800 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-800 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      ))}
    </main>
  )

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto pb-16">
      <div className="flex items-center gap-3 mb-6">
        <a href="/profile" className="text-gray-400 hover:text-white">←</a>
        <h1 className="text-xl font-medium text-white">Session history</h1>
        <span className="text-gray-500 text-sm ml-auto">{history.length} sessions</span>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 border border-gray-800 rounded-2xl">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-white font-medium mb-2">No sessions yet</p>
          <p className="text-gray-500 text-sm mb-6">Start a session and view results to build your history.</p>
          <a href="/" className="inline-block bg-purple-700 text-white py-2.5 px-6 rounded-xl text-sm font-medium">
            Start a session
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map(session => (
            <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex gap-3 items-start">
                {session.top_film_poster ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${session.top_film_poster}`}
                    alt={session.top_film_title}
                    className="w-12 rounded-lg flex-shrink-0"
                    style={{height: '72px', objectFit: 'cover'}}
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span className="text-gray-500 text-lg">🎬</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white text-sm font-medium leading-tight truncate">
                      {session.top_film_title}
                    </p>
                    <span className="text-gray-500 text-xs flex-shrink-0">{timeAgo(session.created_at)}</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">
                    Top pick · {session.top_film_year}
                  </p>
                  <p className="text-gray-500 text-xs mb-2">
                    With {session.participant_names.join(', ')}
                  </p>
                  {session.genres && session.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {session.genres.map((g: string) => (
                        <span key={g} className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}