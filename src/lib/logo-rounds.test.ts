import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { GeneratedFile } from '@/server/db/schema'
import { groupLogoRounds, resolveConcept, resolveRound } from './logo-rounds'

/**
 * The logo history, as the rail and the canvas both read it.
 *
 * A round of concepts is six credits — the most expensive thing a customer can
 * buy and the one they buy repeatedly — so a grouping bug shows up as work
 * someone paid for that the page will not display. The grouping used to live
 * inside the grid, where the rail and the stage could disagree about what
 * "round 2" was.
 */

/** Only the fields these functions actually read. */
function file(
  id: string,
  options: { round?: number; brief?: string; at?: string } = {},
): GeneratedFile {
  return {
    id,
    createdAt: new Date(options.at ?? '2026-08-01T00:00:00Z'),
    metadata: {
      ...(options.round === undefined ? {} : { round: options.round }),
      ...(options.brief === undefined ? {} : { brief: options.brief }),
    },
  } as unknown as GeneratedFile
}

test('rounds come back newest first', () => {
  const rounds = groupLogoRounds([
    file('a', { round: 1 }),
    file('c', { round: 3 }),
    file('b', { round: 2 }),
  ])

  assert.deepEqual(
    rounds.map((r) => r.round),
    [3, 2, 1],
  )
})

test('concepts generated before rounds existed group as round 1', () => {
  // Rows written before the column existed carry no round, and they were
  // round 1 — dropping them would hide the first thing a customer ever bought.
  const rounds = groupLogoRounds([file('old'), file('older'), file('new', { round: 2 })])

  assert.equal(rounds.length, 2)
  assert.equal(rounds[1].round, 1)
  assert.deepEqual(
    rounds[1].concepts.map((c) => c.id),
    ['old', 'older'],
  )
})

test('a round is dated by its earliest concept, whatever order they arrive in', () => {
  const rounds = groupLogoRounds([
    file('late', { round: 1, at: '2026-08-04T12:00:00Z' }),
    file('early', { round: 1, at: '2026-08-04T09:00:00Z' }),
  ])

  assert.equal(rounds[0].createdAt.toISOString(), '2026-08-04T09:00:00.000Z')
})

test('a round takes the brief from whichever concept carries one', () => {
  // The direction is written onto the round's files, but not necessarily all
  // of them, and an empty string is not a brief.
  const rounds = groupLogoRounds([
    file('a', { round: 1, brief: '' }),
    file('b', { round: 1, brief: 'warmer, less geometric' }),
  ])

  assert.equal(rounds[0].brief, 'warmer, less geometric')
  assert.equal(groupLogoRounds([file('c', { round: 1 })])[0].brief, null)
})

test('a stale round number lands on the newest round, not an empty stage', () => {
  const rounds = groupLogoRounds([file('a', { round: 1 }), file('b', { round: 2 })])

  assert.equal(resolveRound(rounds, '2').round, 2)
  assert.equal(resolveRound(rounds, '99').round, 2, 'a deleted round falls back to newest')
  assert.equal(resolveRound(rounds, undefined).round, 2)
  assert.equal(resolveRound(rounds, 'nonsense').round, 2)
})

test('switching rounds lands on the chosen mark, not on nothing', () => {
  /*
   * The id in the URL belongs to the round being left. Without the fallback
   * every round switch would resolve to a concept that is not in this round,
   * and the stage would render empty.
   */
  const [round] = groupLogoRounds([file('x', { round: 1 }), file('y', { round: 1 })])

  assert.equal(resolveConcept(round, 'y', null)?.id, 'y', 'an id in this round wins')
  assert.equal(resolveConcept(round, 'from-another-round', 'y')?.id, 'y', 'then the chosen mark')
  assert.equal(resolveConcept(round, 'from-another-round', null)?.id, 'x', 'then the first')
  assert.equal(resolveConcept(undefined, 'y', null), undefined)
})
