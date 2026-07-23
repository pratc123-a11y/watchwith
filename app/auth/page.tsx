'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleAuth() {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-medium mb-2">
            watch<span className="text-purple-400">with</span>
          </h1>
          <p className="text-gray-400 text-sm">Movie nights, sorted.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-medium text-white mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isSignUp
              ? 'Save your taste profile and get smarter recommendations over time'
              : 'Sign in to access your taste profile'}
          </p>

          <div className="flex flex-col gap-3 mb-6">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 bg-gray-800 text-white placeholder-gray-500 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              className="w-full border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 bg-gray-800 text-white placeholder-gray-500 text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="bg-green-900 border border-green-700 rounded-xl px-4 py-3 mb-4">
              <p className="text-green-300 text-sm">{message}</p>
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading || !email || !password}
            className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-all text-sm"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </div>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full border border-gray-700 text-gray-200 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        <a
          href="/"
          className="block text-center text-gray-500 text-xs mt-4 hover:text-gray-300"
        >
          Continue without account
        </a>
      </div>
    </main>
  )
}