'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function generateId() {
  return Math.random().toString(36).substring(2, 8)
}

export default function Home() {
  const router = useRouter()

  async function createSession() {
    const id = generateId()
    const { data, error } = await supabase.from('sessions').insert({ id, films: [] })
    console.log('session insert:', data, error)
    router.push(`/session/${id}`)
  }

  return (
    <main className="min-h-screen p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-medium mt-16 mb-4">
        Stop arguing about what to watch.
      </h1>
      <p className="text-gray-500 mb-8">
        Everyone rates a few films. We find what works for the whole group.
      </p>
      <button
        onClick={createSession}
        className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium mb-3"
      >
        Start a session →
      </button>
    </main>
  )
}