#!/usr/bin/env node
/**
 * validate-env.mjs — fail-fast env gate for `npm run build` (prebuild).
 *
 * Mirrors `loadEnvironment()` in src/config/env.ts: production builds
 * must not produce an artifact backed by a partially invalid runtime
 * configuration. Reads .env, checks required vars, exits non-zero on
 * failure.
 *
 * Kept dependency-free (plain Node ESM) so prebuild runs before tsc.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const REQUIRED = ['DATABASE_URL', 'STORAGE_DRIVER', 'NODE_ENV']
const NUMERIC = [
  ['PORT', 1, 65535],
  ['API_PORT', 1, 65535],
]

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes
    out[key] = val.replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...process.env, ...loadEnv() }
const errors = []

for (const key of REQUIRED) {
  if (!env[key]) errors.push(`missing ${key}`)
}

for (const [key, min, max] of NUMERIC) {
  if (env[key] === undefined) continue
  const n = Number(env[key])
  if (!Number.isInteger(n) || n < min || n > max) errors.push(`invalid ${key}: ${env[key]}`)
}

if (env.NODE_ENV === 'production' && !env.DATABASE_URL?.startsWith('postgres')) {
  errors.push('DATABASE_URL must be a postgres:// URL in production')
}

// Mirrors the superRefine in src/config/env.ts: production must never run
// with the public dev JWT secret (unset counts — the schema default applies).
const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production-replace-me!!'
if (env.NODE_ENV === 'production') {
  if (!env.JWT_SECRET || env.JWT_SECRET === DEV_JWT_SECRET) {
    errors.push('JWT_SECRET must be set to a real secret in production (generate with: openssl rand -hex 32)')
  } else if (env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters')
  }
}

if (errors.length > 0) {
  console.error('[validate-env] FAILED:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log('[validate-env] OK')