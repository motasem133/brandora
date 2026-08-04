import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { publicUrl } from '@/server/storage/r2'
import type { LogoRound } from '@/lib/logo-rounds'
import type { BrandingAsset, GeneratedFile } from '@/server/db/schema'
import { BrandSheet } from './brand-sheet'
import { BrandSystem } from './brand-system'
import { LogoStudio } from './logo-studio'
import { LogoUsage } from './logo-usage'

/**
 * The brand section, composed as a spread rather than stacked as a column.
 *
 * Eight panels of equal width and equal weight ran down this page — concepts,
 * composer, favicon explainer, slogan, names, palette, fonts, story — which
 * read as a list of the features the team built. A brand book puts the artifact
 * being decided on one side and the system it belongs to on the other, so the
 * mark is judged next to the type and the colour it will actually live with.
 *
 * Below the spread sits the reference material: where the mark ends up, the
 * names still on the table, the story, and the file variations.
 */
export async function BrandingView({
  branding,
  files = [],
  projectId,
  chosenName,
  creditBalance,
  logoCost,
  logoBrief,
  isGenerating,
  rounds,
  activeRound,
  activeConcept,
  primaryId,
  chosenId,
  language,
  emailVerified,
  userEmail,
}: {
  branding: BrandingAsset
  /** Every file the project has, so the variations panel can pair them up. */
  files?: GeneratedFile[]
  projectId: string
  chosenName: string | null
  creditBalance: number
  logoCost: number
  logoBrief: string | null
  isGenerating: boolean
  rounds: LogoRound[]
  activeRound?: LogoRound
  activeConcept?: GeneratedFile
  primaryId: string | null
  /** The decision itself, null until one is made. */
  chosenId: string | null
  language: string
  emailVerified: boolean
  userEmail: string
}) {
  const t = await getTranslations('Branding')

  return (
    <div className="space-y-8">
      {/*
        The history, as a strip rather than as a column.

        It used to sit in a 15rem rail whose only other content was four links,
        leaving most of a screen-height of empty column beneath it. Laid across
        the top it costs one row, stays beside the canvas it changes, and the
        page gets its left edge back.
      */}
      {rounds.length > 1 && (
        <nav aria-label={t('history')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {rounds.map((entry, index) => {
            const current = entry.round === activeRound?.round
            const cover = entry.concepts.find((c) => c.id === primaryId) ?? entry.concepts[0]

            return (
              <Link
                key={entry.round}
                href={`/dashboard/projects/${projectId}?round=${entry.round}`}
                scroll={false}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-control border p-1.5 pe-3.5 transition-colors',
                  current
                    ? 'border-brand/50 bg-elevated'
                    : 'border-line hover:border-line-strong hover:bg-elevated/50',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicUrl(cover.r2Key) ?? `/api/files/${cover.id}`}
                  alt=""
                  loading="lazy"
                  className="size-8 rounded-md bg-white object-contain p-0.5"
                />
                <span
                  className={cn(
                    'whitespace-nowrap text-sm',
                    current ? 'font-semibold text-fg' : 'text-fg-secondary',
                  )}
                >
                  {index === 0 ? t('latestRound') : t('earlierRound', { round: entry.round })}
                </span>
              </Link>
            )
          })}
        </nav>
      )}

      {/*
        Seven and five, not six and six. An even split makes two columns of
        equal importance; the decision being made is the mark, and the system
        beside it is what that decision has to agree with.
      */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <LogoStudio
            projectId={projectId}
            round={activeRound}
            concept={activeConcept}
            isLatestRound={!activeRound || activeRound.round === rounds[0]?.round}
            chosenId={chosenId}
            logoBrief={logoBrief}
            logoCost={logoCost}
            affordable={creditBalance >= logoCost}
            creditBalance={creditBalance}
            isGenerating={isGenerating}
            palette={branding.colorPalette}
            emailVerified={emailVerified}
            userEmail={userEmail}
          />
        </div>

        <div className="min-w-0 lg:col-span-5">
          <BrandSystem
            palette={branding.colorPalette}
            fonts={branding.fontRecommendations}
            name={chosenName || ''}
            slogan={branding.slogan}
            language={language}
          />
        </div>
      </div>

      {/*
        Directly under the spread, deliberately: pressing "use as icon" on the
        canvas changes the favicon and the avatar in the frames below it, so the
        control demonstrates itself.
      */}
      <LogoUsage
        files={files}
        businessName={chosenName}
        slogan={branding.slogan}
      />

      <BrandSheet
        branding={branding}
        files={files}
        projectId={projectId}
        chosenName={chosenName}
      />
    </div>
  )
}
