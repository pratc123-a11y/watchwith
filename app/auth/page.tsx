'use client'

import { useState, useEffect } from 'react'
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
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`
      }
    })
  }
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/')
      }
    })
  }, [])

  async function handleAuth() {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      })
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
            {isSignUp && (
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 bg-gray-800 text-white placeholder-gray-500 text-sm"
        />
      )}
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

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-500 text-xs">or</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 transition-all text-sm"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
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