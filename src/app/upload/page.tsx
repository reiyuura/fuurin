import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { ProtectedShell } from '@/components/auth/protected-shell'
import { UploadWorkspace } from '@/components/upload/upload-workspace'
import { Permissions } from '@/types/auth'

export default function UploadPage() {
  return (
    <>
      <Header active="/upload" />
      <main className="w-full mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <PageHeader
          title="Upload"
          lead="Tarik foto ke sini, atau pilih dari perangkat. Mock pipeline — backend menyusul."
        />

        <section className="mt-6 sm:mt-10">
          <Suspense
            fallback={
              <div className="space-y-6" aria-busy="true" aria-label="Memuat upload workspace">
                <div className="shimmer h-[220px] rounded-[1.5rem]" />
                <div className="shimmer h-24 rounded-[1.25rem]" />
              </div>
            }
          >
            <ProtectedShell permission={Permissions.MediaUpload}>
              <UploadWorkspace />
            </ProtectedShell>
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/upload" />
    </>
  )
}
