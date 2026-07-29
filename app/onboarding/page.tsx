'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  { emoji: '🔥', name: 'Katniss' },
  { emoji: '💫', name: 'Stardust' },
  { emoji: '🐺', name: 'Lupin' },
  { emoji: '🌊', name: 'Aquaman' },
  { emoji: '🎯', name: 'Hawkeye' },
  { emoji: '⚡', name: 'Thor' },
  { emoji: '🦋', name: 'Mothra' },
  { emoji: '🎪', name: 'The Ringmaster' },
  { emoji: '🎸', name: 'Dewey Finn' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'username' | 'avatar'>('username')
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return }
      if (data.user.user_metadata?.username) { router.push('/'); return }
      setUser(data.user)
      if (data.user.user_metadata?.full_name) {
        setUsername(data.user.user_metadata.full_name.split(' ')[0])
      }
      setChecking(false)
    })
  }, [])

  async function saveProfile() {
    if (!username.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({
      data: {
        username: username.trim(),
        avatar: selectedAvatar
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  if (checking) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-medium mb-2">
            watch<span className="text-purple-400">with</span>
          </h1>
          <p className="text-gray-400 text-sm">
            {step === 'username' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </p>
          <div className="flex gap-2 justify-center mt-3">
            <div className={`h-1 w-12 rounded-full transition-all ${step === 'username' ? 'bg-purple-500' : 'bg-purple-800'}`} />
            <div className={`h-1 w-12 rounded-full transition-all ${step === 'avatar' ? 'bg-purple-500' : 'bg-gray-700'}`} />
          </div>
        </div>

        {step === 'username' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
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
              onKeyDown={e => e.key === 'Enter' && username.trim() && setStep('avatar')}
              placeholder="Username"
              maxLength={20}
              className="w-full border border-gray-700 rounded-xl px-4 py-3 mb-4 outline-none focus:border-purple-500 bg-gray-800 text-white placeholder-gray-500 text-sm"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              onClick={() => setStep('avatar')}
              disabled={!username.trim()}
              className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-all text-sm"
            >
              Next — choose your character
            </button>
          </div>
        )}

        {step === 'avatar' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center mx-auto mb-3 text-4xl">
                {selectedAvatar || '?'}
              </div>
              <h2 className="text-lg font-medium text-white mb-1">Choose your character</h2>
              <p className="text-gray-400 text-sm">This will appear on your profile</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5 max-h-64 overflow-y-auto">
              {AVATARS.map(({ emoji, name }) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all hover:bg-gray-800 ${
                    selectedAvatar === emoji
                      ? 'bg-purple-900 border border-purple-600'
                      : ''
                  }`}
                >
                  <span className="text-3xl mb-1">{emoji}</span>
                  <span className="text-xs text-gray-400 text-center leading-tight">{name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('username')}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-all"
              >
                Back
              </button>
              <button
                onClick={saveProfile}
                disabled={loading}
                className="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-40 transition-all text-sm"
              >
                {loading ? 'Saving...' : selectedAvatar ? 'Get started' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}