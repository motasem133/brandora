import type { LogoRound } from '@/lib/logo-rounds'
import type { BrandingAsset, GeneratedFile } from '@/server/db/schema'
import { BrandSheet } from './brand-sheet'
import { LogoStudio } from './logo-studio'

/**
 * The brand section: the mark on the stage, everything else beneath it.
 *
 * This used to be the whole page's worth of cards in one component. It is a
 * composition now — the studio owns the decision, the sheet owns the reference
 * material — which is what let the history rail and the canvas be built without
 * dragging the palette and the brand story along with them.
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
}) {
  return (
    <div className="space-y-6">
      <LogoStudio
        projectId={projectId}
        round={activeRound}
        concept={activeConcept}
        isLatestRound={!activeRound || activeRound.round === rounds[0]?.round}
        primaryId={primaryId}
        markLogoFileId={branding.markLogoFileId}
        logoBrief={logoBrief}
        logoCost={logoCost}
        affordable={creditBalance >= logoCost}
        isGenerating={isGenerating}
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
