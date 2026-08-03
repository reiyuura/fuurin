'use client'

/**
 * LoginExperience — feature composer for the /login page.
 *
 * Owns the submit lifecycle (pending state, error). Pages compose
 * `<LoginExperience nextPath={…} />`; the form itself stays
 * presentation-only.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/hooks/use-auth'

/** Path-safe — blocks open-redirect attempts to non-app URLs. */
function safeNext(raw: string | null): string {
  if (!raw) return '/albums'
  if (typeof raw !== 'string') return '/albums'
  if (!raw.startsWith('/')) return '/albums'
  if (raw.startsWith('//')) return '/albums'
  return raw
}

export function LoginExperience() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams?.get('next'))
  const { status, login } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already authenticated, bounce to `next`.
  if (status === 'authenticated') {
    if (typeof window !== 'undefined') {
      router.replace(next)
    }
  }

  async function handleSubmit(input: { email: string; password: string }) {
    setError(null)
    setPending(true)
    try {
      await login(input.email, input.password)
      router.replace(next)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login gagal. Coba lagi.'
      setError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Header active="/login" />
      <main className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1100px] items-center justify-center px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div className="hidden lg:block">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[.22em] text-primary-ink">
              風鈴のクラス
            </p>
            <h1 className="font-jp text-[28px] font-semibold leading-tight tracking-tight text-foreground-strong">
              Album kelas, dikurasi dengan tenang.
            </h1>
            <p className="mt-3 max-w-md text-[13px] leading-7 text-muted-foreground">
              Masuk untuk mengelola album, mempublikasikan kenangan, dan menambahkan foto baru ke Media Library.
            </p>
            <ul className="mt-6 space-y-2 text-[12.5px] text-foreground-strong">
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Editor + Admin bisa mengelola album
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Upload pipeline + Photo picker tetap reuse Media Library
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                Sesi disimpan lokal; Sprint berikutnya pakai auth sungguhan
              </li>
            </ul>
          </div>

          <LoginForm onSubmit={handleSubmit} pending={pending} errorMessage={error} />
        </div>
      </main>
      <Footer />
      <TabBar active="/login" />
    </>
  )
}
