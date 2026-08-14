import { getTranslations } from 'next-intl/server'

import { CopyButton } from '@/components/ui/copy-button'
import { Disclosure } from '@/components/ui/disclosure'
import type { BrandingAsset, GeneratedFile } from '@/server/db/schema'
import { BrandCopy } from './brand-copy'
import { LogoVariations } from './logo-variations'
import { NamePicker, type RenameImpact } from './name-picker'

/**
 * The reference material: what is still open, and what is consulted rarely.
 *
 * The mark, the type and the colour have moved up into the spread, where the
 * decision is actually made. What is left here is the names still on the table,
 * the written brand, and the file variations — read once or twice each, so they
 * sit below the fold and the two rarest fold away entirely.
 */
export async function BrandSheet({
  branding,
  files,
  projectId,
  chosenName,
  renameImpact,
}: {
  branding: BrandingAsset
  files: GeneratedFile[]
  projectId: string
  chosenName: string | null
  /** What a rename would leave carrying the old name. Absent when nothing does. */
  renameImpact?: RenameImpact
}) {
  const t = await getTranslations('Branding')

  const hasNames = branding.businessNameIdeas.length > 0

  return (
    <div className="space-y-4">
      {hasNames && (
        <section className="rounded-panel border border-line p-7">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {t('nameIdeas')}
          </h2>
          <p className="mt-1.5 text-sm text-fg-muted">{t('nameIdeasHint')}</p>
          <div className="mt-4">
            <NamePicker
              projectId={projectId}
              ideas={branding.businessNameIdeas}
              selected={chosenName}
              impact={renameImpact}
            />
          </div>
        </section>
      )}

      {/*
        Always rendered, where it used to appear only once a run had written
        something into it. It is the editor now, and a section that hides
        itself when a field is empty is a section you cannot use to fill it.
      */}
      <Disclosure
          title={t('story')}
          /*
            Open when there is something in it.

            Folded shut, the brand's story, voice and values were invisible
            unless you knew to click a heading — and a customer reported
            exactly that: "I couldn't see the brand story or voice." A section
            that hides the words somebody just paid for is not restraint.

            The cost is that the slogan now appears twice on the page: once on
            the identity plate in the brand's own type, and once here as a
            labelled field. That is a brand book's own habit — the line on the
            cover and the line in the specification — and it is the price of
            the slogan being editable anywhere at all, since the plate takes no
            controls.
          */
          open={Boolean(branding.brandStory || branding.brandVoice || branding.brandValues.length)}
          meta={
            branding.brandStory ? (
              <CopyButton value={branding.brandStory} label={t('story')} />
            ) : undefined
          }
        >
          {/*
            The slogan is back in this section, and it is not a repetition.

            It is set in the brand's own accent on the identity plate at the top
            of the page, and that plate takes no app controls — a chrome button
            on a generated ground is the one thing that breaks the illusion it
            exists for. So the place it is *shown* and the place it is *changed*
            are deliberately different, and this section folds away by default,
            which means the page still shows the slogan exactly once.
          */}
          <BrandCopy
            projectId={projectId}
            slogan={branding.slogan}
            brandStory={branding.brandStory}
            brandVoice={branding.brandVoice}
            brandValues={branding.brandValues}
          />
      </Disclosure>

      <LogoVariations
        files={files}
        primaryLogoFileId={branding.primaryLogoFileId}
        markLogoFileId={branding.markLogoFileId}
      />
    </div>
  )
}
