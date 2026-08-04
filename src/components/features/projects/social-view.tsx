import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import type { SocialMediaAsset } from '@/server/db/schema'

/**
 * The social kit, as a working surface.
 *
 * Unlike the website section beside it, this one is used rather than admired:
 * every caption, bio and hashtag set here exists to be pasted into somewhere
 * else, which is why each carries its own copy control. So the detail stays and
 * only the packaging changed.
 *
 * What went is the nesting. Each group used to be a card containing bordered
 * cards containing bordered items — three edges deep, against the one rule the
 * design system states flatly. A group is a heading and a rule now, and the
 * only thing with an edge is the item you actually copy.
 */
export async function SocialView({ social }: { social: SocialMediaAsset }) {
  const t = await getTranslations('Social')
  const ad = social.adCopy

  /* Everything, in the order it gets used, for the trip where someone is
     scheduling a week rather than posting once. */
  const allPosts = social.instagramPosts
    .map((post) =>
      [post.caption, post.hashtags?.map((tag) => `#${tag}`).join(' ')].filter(Boolean).join('\n\n'),
    )
    .join('\n\n---\n\n')

  return (
    <div className="space-y-10">
      {social.instagramBio && (
        <section className="space-y-3">
          <GroupHeading title={t('bio')}>
            {/* Instagram hard-caps bios at 150 characters. Latin digits and a
                slash, so it is pinned LTR rather than re-ordered in Arabic. */}
            <span dir="ltr" className="text-xs text-fg-muted">
              {social.instagramBio.length}/150
            </span>
            <CopyButton value={social.instagramBio} label={t('bio')} />
          </GroupHeading>
          <p className="max-w-[70ch] text-sm leading-relaxed">{social.instagramBio}</p>
        </section>
      )}

      {social.instagramPosts.length > 0 && (
        <section className="space-y-4">
          <GroupHeading title={t('posts', { count: social.instagramPosts.length })}>
            <CopyButton value={allPosts} label={t('allPosts')} showLabel />
          </GroupHeading>

          <ol className="grid gap-4 sm:grid-cols-2">
            {social.instagramPosts.map((post, index) => (
              <li
                key={index}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface/60 p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="brand">{post.type}</Badge>
                  <span dir="ltr" className="text-xs text-fg-muted">
                    #{index + 1}
                  </span>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed">{post.caption}</p>

                {post.hashtags?.length > 0 && (
                  <p dir="ltr" className="text-xs accent-text rtl:text-end">
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
                    label={t('post', { number: index + 1 })}
                    showLabel
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {social.storyTemplates.length > 0 && (
        <section className="space-y-4">
          <GroupHeading title={t('stories')} />
          <ul className="grid gap-4 sm:grid-cols-3">
            {(social.storyTemplates as { title: string; body: string }[]).map((story, index) => (
              <li key={index} className="rounded-card border border-line bg-surface/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{story.title}</p>
                  <CopyButton value={`${story.title}\n\n${story.body}`} label={story.title} />
                </div>
                <p className="mt-1 text-sm text-fg-secondary">{story.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ad && (
        <section className="space-y-4">
          <GroupHeading title={t('adCopy')} />
          <dl className="max-w-[70ch] space-y-4">
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
        </section>
      )}

      {social.hashtags.length > 0 && (
        <section className="space-y-3">
          <GroupHeading title={t('hashtags')}>
            <CopyButton
              value={social.hashtags.map((tag) => `#${tag}`).join(' ')}
              label={t('hashtags')}
              showLabel
            />
          </GroupHeading>
          <ul dir="ltr" className="flex flex-wrap gap-2 rtl:justify-end">
            {social.hashtags.map((tag) => (
              <li key={tag} className="rounded-full bg-elevated px-3 py-1 text-sm accent-text">
                #{tag}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * A group's name and its actions, over a rule.
 *
 * The rule is what a card used to do — separate this group from the last —
 * without adding an edge around content that already has edges of its own.
 */
function GroupHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">{title}</h3>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
