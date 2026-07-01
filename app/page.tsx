'use client'

import { useState } from 'react'

export default function Home() {
  const [query, setQuery] = useState('')
  const [films, setFilms] = useState([])

  async function searchFilms(e) {
    const value = e.target.value
    setQuery(value)
    if (value.length < 2) return setFilms([])
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${value}&api_key=${process.env.NEXT_PUBLIC_TMDB_KEY}`
    )
    const data = await res.json()
    console.log(data)
    setFilms((data.results || []).slice(0, 6))
  }

  return (
    <main className="min-h-screen p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-medium mt-16 mb-2">
        Stop arguing about what to watch.
      </h1>
      <p className="text-gray-500 mb-8">
        Everyone rates a few films. We find what works for the whole group.
      </p>
      <input
        type="text"
        value={query}
        onChange={searchFilms}
        placeholder="Search for a film..."
        className="w-full border border-gray-200 rounded-lg px-4 py-3 mb-6 outline-none focus:border-gray-400"
      />
      <div className="grid grid-cols-3 gap-3">
        {films.map((film: any) => (
          <div key={film.id}>
            {film.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w300${film.poster_path}`}
                alt={film.title}
                className="w-full rounded-lg mb-1"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg mb-1 flex items-center justify-center text-xs text-gray-400 text-center p-2">
                {film.title}
              </div>
            )}
            <p className="text-xs text-gray-600 font-medium leading-tight">{film.title}</p>
            <p className="text-xs text-gray-400">{film.release_date?.slice(0, 4)}</p>
          </div>
        ))}
      </div>
    </main>
  )
}