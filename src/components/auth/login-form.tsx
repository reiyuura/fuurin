'use client'

/**
 * LoginForm — render-only login form.
 *
 * All state + side effects live in the consumer (page). Submits via
 * the form's `onSubmit` callback, which the page wires to `useAuth()`.
 */

import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

export type LoginFormProps = {
  onSubmit: (input: { email: string; password: string }) => Promise<void>
  pending: boolean
  errorMessage: string | null
  /** Optional pre-filled values for the demo seed (Sprint 12 only). */
  defaultEmail?: string
  defaultPassword?: string
}

export function LoginForm({ onSubmit, pending, errorMessage, defaultEmail = '', defaultPassword = '' }: LoginFormProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    onSubmit({ email: email.trim(), password })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-describedby={errorMessage ? 'login-error' : undefined}
      className="card-paper w-full max-w-md rounded-[1.5rem] border border-border/60 p-6 sm:p-7"
    >
      <div className="mb-5 space-y-1">
        <h1 className="font-jp text-[20px] font-bold tracking-tight text-foreground-strong sm:text-[22px]">
          Masuk
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Masuk untuk melanjutkan ke ruang editor Fuurin.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 inline-flex items-center text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Email
          </span>
          <span className="relative block">
            <Mail
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rei@fuurin.id"
              className="w-full rounded-[14px] border border-border bg-background/60 py-2.5 pl-9 pr-3 text-[13.5px] text-foreground-strong placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 inline-flex items-center text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Kata sandi
          </span>
          <span className="relative block">
            <Lock
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-[14px] border border-border bg-background/60 py-2.5 pl-9 pr-10 text-[13.5px] text-foreground-strong placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-hover hover:text-foreground-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {showPassword ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
            </button>
          </span>
        </label>

        {errorMessage && (
          <p
            id="login-error"
            role="alert"
            className="rounded-[12px] border border-primary/30 bg-primary-subtle px-3 py-2 text-[12px] font-medium text-primary-strong"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !email || !password}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(200,124,141,0.28)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
              />
              Memproses…
            </>
          ) : (
            'Login'
          )}
        </button>
      </div>


    </form>
  )
}
