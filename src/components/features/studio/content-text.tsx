import { getTranslations } from 'next-intl/server'

import { CopyButton } from '@/components/ui/copy-button'
import type { AdItem, SocialPostItem } from '@/lib/content'

/**
 * The written types, opened rather than summarised.
 *
 * The library listed two clamped lines and nothing else, which is enough for a
 * carousel — its rows carry the frames themselves — and not enough for words.
 * A customer who asked for three captions could read the first half of the
 * first one, and the only way to the rest was to select text out of a truncated
 * paragraph. Copy generated to be pasted somewhere else has to be gettable.
 *
 * A native `<details>` per piece, same as `Disclosure`: closed the list still
 * scans, open the whole set is there with a copy control on every part a
 * customer pastes separately. For an ad that is four separate things — the
 * headline, the body and the button label go into three different boxes in
 * Meta's composer, and pasting one blob means pulling it apart by hand.
 */
export async function ContentText({
  kind,
  items,
}: {
  kind: 'social_post' | 'ad'
  items: SocialPostItem[] | AdItem[]
}) {
  const t = await getTranslations('Studio')

  return (
    <div className="mt-3 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-control border border-line bg-surface/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-fg-muted">{item.intent}</span>
            <CopyButton
              value={
                kind === 'ad'
                  ? [
                      (item as AdItem).headline,
                      (item as AdItem).body,
                      (item as AdItem).cta,
                    ].join('\n\n')
                  : [
                      (item as SocialPostItem).caption,
                      (item as SocialPostItem).hashtags.map((tag) => `#${tag}`).join(' '),
                    ].join('\n\n')
              }
              label={t('copyWhole')}
            />
          </div>

          {kind === 'ad' ? (
            <dl className="mt-2.5 space-y-2.5">
              {(
                [
                  ['headline', (item as AdItem).headline],
                  ['body', (item as AdItem).body],
                  ['cta', (item as AdItem).cta],
                ] as const
              ).map(([field, value]) => (
                <div key={field} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <dt className="text-xs text-fg-muted">{t(`ad_${field}`)}</dt>
                    <dd dir="auto" className="mt-0.5 text-sm text-fg-secondary">
                      {value}
                    </dd>
                  </div>
                  {/* Each field separately, because each goes in its own box. */}
                  <CopyButton value={value} label={t(`ad_${field}`)} />
                </div>
              ))}
            </dl>
          ) : (
            <>
              <p dir="auto" className="mt-2 whitespace-pre-wrap text-sm text-fg-secondary">
                {(item as SocialPostItem).caption}
              </p>
              <p dir="auto" className="mt-2 text-xs text-fg-muted">
                {(item as SocialPostItem).hashtags.map((tag) => `#${tag}`).join(' ')}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
