import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageHeader } from '@/components/ui/page-header'

const VALUES = [
  {
    icon: '🤝',
    title: '誰も置いていかない',
    desc: 'わからない人がいたら、みんなで戻った。',
  },
  {
    icon: '😊',
    title: '笑って終わる',
    desc: 'どんな日も最後は冗談で締めた。',
  },
  {
    icon: '📸',
    title: '残しておく',
    desc: 'だからこのアルバムがある。',
  },
]

export default function AboutPage() {
  return (
    <>
      <Header active="/about" />
      <main className="flex-1 pt-[52px]">
        <PageHeader
          title="クラスについて"
          lead="風鈴のクラスは、風の音がよく聞こえる二階の教室から始まった。"
        />
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <article className="space-y-12">
              <div>
                <h2 className="font-jp text-xl font-semibold text-foreground-strong">
                  この教室のこと
                </h2>
                <p className="mt-4 text-sm leading-8 text-foreground">
                  窓辺に下がった風鈴が鳴るたび、誰かが顔を上げた。板張りの床、午後の光、抹茶みたいな緑の黒板。特別な場所ではないけれど、私たちにとっては全部だった。
                </p>
              </div>

              <div className="relative aspect-[21/9] overflow-hidden rounded-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85"
                  alt=""
                  fill
                  sizes="(max-width: 896px) 100vw, 896px"
                  className="object-cover"
                />
              </div>

              <div>
                <h2 className="font-jp text-xl font-semibold text-foreground-strong">
                  大切にしていたこと
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  {VALUES.map((v) => (
                    <div
                      key={v.title}
                      className="rounded-2xl border border-border/50 bg-surface p-5 dark:bg-[#2a2d31]"
                    >
                      <div className="text-2xl" aria-hidden="true">
                        {v.icon}
                      </div>
                      <h3 className="mt-3 font-jp text-sm font-semibold text-foreground-strong">
                        {v.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-6 text-foreground">
                        {v.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
