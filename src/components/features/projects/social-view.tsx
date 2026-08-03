import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import type { SocialMediaAsset } from '@/server/db/schema'

export async function SocialView({ social }: { social: SocialMediaAsset }) {
  const t = await getTranslations('Social')
  const ad = social.adCopy

  return (
    <div className="space-y-6">
      {social.instagramBio && (
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle>{t('bio')}</CardTitle>
            <div className="flex items-baseline gap-2">
              {/* Instagram hard-caps bios at 150 characters. Latin digits and a
                  slash, so it is pinned LTR rather than re-ordered in Arabic. */}
              <span dir="ltr" className="text-xs text-fg-muted">
                {social.instagramBio.length}/150
              </span>
              <CopyButton value={social.instagramBio} label={t('bio')} />
            </div>
          </div>
          <p className="text-sm leading-relaxed">{social.instagramBio}</p>
        </Card>
      )}

      {social.instagramPosts.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">
            {t('posts', { count: social.instagramPosts.length })}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {social.instagramPosts.map((post, index) => (
              <Card key={index} className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="brand">{post.type}</Badge>
                  <span dir="ltr" className="text-xs text-fg-muted">
                    #{index + 1}
                  </span>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed">{post.caption}</p>

                {post.hashtags?.length > 0 && (
                  <p dir="ltr" className="text-xs text-brand rtl:text-end">
                    {post.hashtags.map((tag) => `#${tag}`).join(' ')}
                  </p>
                )}

                {/*
                  Caption and hashtags together, in the order they get pasted
                  into the composer. Copying them separately is two trips for
                  something that is always used as one post.
                */}
                <div className="mt-auto flex justify-end border-t border-line pt-2">
                  <CopyButton
                    value={[post.caption, post.hashtags?.map((tag) => `#${tag}`).join(' ')]
                      .filter(Boolean)
                      .join('\n\n')}
                    label={`${t('post', { number: index + 1 })}`}
                    showLabel
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {social.storyTemplates.length > 0 && (
        <Card className="space-y-4">
          <CardTitle>{t('stories')}</CardTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            {(social.storyTemplates as { title: string; body: string }[]).map((story, index) => (
              <div key={index} className="rounded-control border border-line bg-elevated/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{story.title}</p>
                  <CopyButton value={`${story.title}\n\n${story.body}`} label={story.title} />
                </div>
                <p className="mt-1 text-sm text-fg-secondary">{story.body}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {ad && (
        <Card className="space-y-4">
          <CardTitle>{t('adCopy')}</CardTitle>
          <dl className="space-y-4">
            {[
              ['headline', ad.headline],
              ['body', ad.body],
              ['cta', ad.cta],
              ['facebookAd', ad.facebookAd],
              ['googleAd', ad.googleAd],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-fg-muted">
                    {t(`ad.${key}`)}
                    <CopyButton value={String(value)} label={t(`ad.${key}`)} />
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
                </div>
              ))}
          </dl>
        </Card>
      )}

      {social.hashtags.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{t('hashtags')}</CardTitle>
            <CopyButton
              value={social.hashtags.map((tag) => `#${tag}`).join(' ')}
              label={t('hashtags')}
              showLabel
            />
          </div>
          <ul dir="ltr" className="flex flex-wrap gap-2 rtl:justify-end">
            {social.hashtags.map((tag) => (
              <li key={tag} className="rounded-full bg-elevated px-3 py-1 text-sm text-brand">
                #{tag}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
