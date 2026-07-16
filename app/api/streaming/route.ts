import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get('tmdbId')

  if (!tmdbId) return NextResponse.json({ error: 'No ID' }, { status: 400 })

  const res = await fetch(
    `https://streaming-availability.p.rapidapi.com/shows/movie/${tmdbId}?country=au`,
    {
      headers: {
        'x-rapidapi-host': 'streaming-availability.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!
      }
    }
  )

  const data = await res.json()
  return NextResponse.json(data)
}