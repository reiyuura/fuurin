import { Suspense } from 'react'
import { LoginExperience } from './login-experience'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20" role="status" aria-live="polite">
          <span className="size-9 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
          <p className="text-[12.5px] text-muted-foreground">Memuat…</p>
        </div>
      }
    >
      <LoginExperience />
    </Suspense>
  )
}
