import type { GeneratedFile } from '@/server/db/schema'

/**
 * One generation of logo concepts, as the history rail and the canvas both
 * need to see it.
 *
 * The grouping used to live inside the logo grid, which meant the rail could
 * not agree with the stage about what "round 2" was. It is a pure function of
 * the files now, so every surface reads the same history.
 */
export type LogoRound = {
  round: number
  /** The direction that produced this round, when one was given. */
  brief: string | null
  concepts: GeneratedFile[]
  /** The earliest concept in the round — when this direction was answered. */
  createdAt: Date
}

/**
 * Newest round first.
 *
 * Concepts generated before rounds existed carry no round number and group
 * together as round 1, which is what they were.
 */
export function groupLogoRounds(logos: GeneratedFile[]): LogoRound[] {
  const byRound = new Map<number, GeneratedFile[]>()

  for (const logo of logos) {
    const round = Number(logo.metadata?.round ?? 1)
    byRound.set(round, [...(byRound.get(round) ?? []), logo])
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => b - a)
    .map(([round, concepts]) => ({
      round,
      brief:
        (concepts.map((c) => c.metadata?.brief).find((b) => typeof b === 'string' && b) as
          | string
          | undefined) ?? null,
      concepts,
      createdAt: concepts.reduce(
        (earliest, file) => (file.createdAt < earliest ? file.createdAt : earliest),
        concepts[0].createdAt,
      ),
    }))
}

/**
 * The round the URL asks for, or the newest one.
 *
 * A round number that no longer exists — a stale link, a deleted project —
 * resolves to the newest rather than to an empty stage.
 */
export function resolveRound(rounds: LogoRound[], requested: string | undefined) {
  const asked = Number(requested)
  return rounds.find((r) => r.round === asked) ?? rounds[0]
}

/**
 * The concept the URL asks for, then the chosen mark, then the first.
 *
 * Falling through the chosen one matters when switching rounds: the id in the
 * URL belongs to the round being left, so without this every switch would land
 * on a concept nobody picked.
 */
export function resolveConcept(
  round: LogoRound | undefined,
  requested: string | undefined,
  primaryLogoFileId: string | null,
) {
  if (!round) return undefined

  return (
    round.concepts.find((c) => c.id === requested) ??
    round.concepts.find((c) => c.id === primaryLogoFileId) ??
    round.concepts[0]
  )
}
