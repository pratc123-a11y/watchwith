'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OnboardingPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
        return
      }
      if (data.user.user_metadata?.username) {
        router.push('/')
        return
      }
      setUser(data.user)
      if (data.user.user_metadata?.full_name) {
        setUsername(data.user.user_metadata.full_name.split(' ')[0])
      }
    })
  }, [])

  async function saveUsername() {
    if (!username.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({
      data: { username: username.trim() }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-medium mb-2">
            watch<span className="text-purple-400">with</span>
          </h1>
          <p className="text-gray-400 text-sm">One last step</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <div className="text-center mb-6">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-16 h-16 rounded-full mx-auto mb-3"
              />
            )}
            <h2 className="text-lg font-medium text-white mb-1">
              Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
            </h2>
            <p className="text-gray-400 text-sm">Pick a username for your WatchWith profile</p>
          </div>

          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveUsername()}
            placeholder="Username"
            maxLength={20}
            className="w-full border border-gray-700 rounded-xl px-4 py-3 mb-4 outline-none focus:border-purple-500 bg-gray-800 text-white placeholder-gray-500 text-sm"
          />

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button
            onClick={saveUsername}
            disabled={loading || !username.trim()}
            className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-all text-sm"
          >
            {loading ? 'Saving...' : 'Get started'}
          </button>
        </div>
      </div>
    </main>
  )
}