'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoaded(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setMenuOpen(false)
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-black bg-opacity-80 backdrop-blur-sm border-b border-gray-900">
      <a href="/" className="text-xl font-medium">
        watch<span className="text-purple-400">with</span>
      </a>

      <div className="flex items-center gap-3">
        {!loaded ? (
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
        ) : user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-sm font-medium hover:bg-purple-600 transition-all"
            >
             {user?.user_metadata?.avatar || user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-44 shadow-xl">
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm text-white truncate">{user?.user_metadata?.username || user?.email}</p>
                </div>
                <a
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profile
                </a>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:bg-gray-800 transition-all text-left border-t border-gray-800"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
            <a
          href="/auth"
            className="text-sm text-gray-300 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-all"
          >
            Sign in
          </a>
        )}
      </div>
    </nav>
  )
}