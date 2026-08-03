import { NextResponse } from 'next/server'
import { getEnvironment } from '@/lib/config/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  const env = getEnvironment()
  return NextResponse.json(
    {
      status: 'ok',
      version: env.release,
      uptime: Number(process.uptime().toFixed(2)),
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}
