'use client'

import { useState } from 'react'

const FILMS = [
  { id: 27205, title: 'Inception', year: '2010', poster: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
  { id: 155, title: 'The Dark Knight', year: '2008', poster: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { id: 680, title: 'Pulp Fiction', year: '1994', poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
  { id: 13, title: 'Forrest Gump', year: '1994', poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg' },
  { id: 120, title: 'The Lord of the Rings', year: '2001', poster: '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg' },
  { id: 603, title: 'The Matrix', year: '1999', poster: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg' },
  { id: 289, title: 'Casablanca', year: '1942', poster: '/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg' },
  { id: 129, title: 'Spirited Away', year: '2001', poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg' },
  { id: 389, title: '12 Angry Men', year: '1957', poster: '/ppd84D2i9W8jXmsyInGyihiSyqz.jpg' },
  { id: 637, title: 'Life is Beautiful', year: '1997', poster: '/74hLDKjD5aGYOotO6esUVaeISa2.jpg' },
  { id: 424, title: "Schindler's List", year: '1993', poster: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg' },
  { id: 98, title: 'Gladiator', year: '2000', poster: '/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg' },
]

type Vote = 'loved' | 'meh' | 'no' | 'unseen' | null

const VOTE_OPTIONS = [
  { value: 'loved', emoji: '❤️', active: 'bg-green-100 border-green-300 text-green-700' },
  { value: 'meh', emoji: '😐', active: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'no', emoji: '👎', active: 'bg-red-100 border-red-300 text-red-700' },
  { value: 'unseen', emoji: '👀', active: 'bg-blue-100 border-blue-300 text-blue-700' },
]

export default function Quiz() {
  const [votes, setVotes] = useState<Record<number, Vote>>({})
  const [done, setDone] = useState(false)

  function vote(id: number, value: Vote) {
    setVotes(prev => ({ ...prev, [id]: value }))
  }

  const allVoted = FILMS.every(f => votes[f.id])

  if (done) {
    const groups = [
      { label: '❤️ Loved', films: FILMS.filter(f => votes[f.id] === 'loved') },
      { label: '😐 Meh', films: FILMS.filter(f => votes[f.id] === 'meh') },
      { label: '👎 No', films: FILMS.filter(f => votes[f.id] === 'no') },
      { label: '👀 Not seen', films: FILMS.filter(f => votes[f.id] === 'unseen') },
    ]
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-2">Your taste profile</h1>
        <p className="text-gray-500 mb-8">Here's what you told us</p>
        {groups.map(group => (
          <div key={group.label} className="mb-6">
            <p className="font-medium mb-3">{group.label} ({group.films.length})</p>
            <div className="flex flex-wrap gap-2">
              {group.films.map(f => (
               <span key={f.id} className="text-sm bg-gray-700 text-white rounded-full px-3 py-1">{f.title}</span>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={() => { setVotes({}); setDone(false) }}
          className="text-sm text-gray-400 underline"
        >
          Start over
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-medium mb-1">Quick taste check</h1>
      <p className="text-gray-500 mb-2">Rate these films — be honest</p>
      <p className="text-sm text-gray-400 mb-8">{Object.keys(votes).length} of {FILMS.length} rated</p>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {FILMS.map(film => (
          <div key={film.id} className="rounded-xl overflow-hidden border border-gray-100">
            <img
              src={`https://image.tmdb.org/t/p/w300${film.poster}`}
              alt={film.title}
              className="w-full"
            />
            <div className="p-2">
              <p className="text-xs font-medium mb-1 leading-tight">{film.title}</p>
              <p className="text-xs text-gray-400 mb-2">{film.year}</p>
              <div className="flex gap-1">
                {VOTE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => vote(film.id, opt.value as Vote)}
                    className={`flex-1 text-xs py-1 rounded-lg border transition-all ${
                      votes[film.id] === opt.value
                        ? opt.active
                        : 'border-gray-200 text-gray-400'
                    }`}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {allVoted && (
        <button
          onClick={() => setDone(true)}
          className="w-full bg-black text-white py-3 rounded-xl font-medium"
        >
          See my taste profile →
        </button>
      )}
    </main>
  )
}