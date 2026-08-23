import 'dotenv/config'
import assert from 'node:assert/strict'

import { MODELS } from '../src/server/ai/models'

/**
 * Every model in the registry can actually be served under our routing rules.
 *
 * `runModel` sends `provider: { require_parameters: true }`, so OpenRouter will
 * only route to a provider that supports everything in the request — including
 * the JSON schema. A model whose providers all lack `structured_outputs` is
 * therefore not a slow model or an unreliable one: it is refused in under two
 * hundred milliseconds, every time, and the chain falls to the next entry.
 *
 * That is exactly how `qwen/qwen3.7-flash` stopped being able to serve
 * `utility`, and nothing announced it. It is a dead entry that still typechecks,
 * still looks deliberate in the registry, and shows up only as an `error` row
 * per call in a table nobody reads hourly. The same thing happens silently if a
 * provider drops support later, or if someone adds a model without checking.
 *
 * Spends no tokens — this asks OpenRouter what its endpoints support, it does
 * not call them. Skips rather than fails without a key, because that is a
 * machine without credentials and not a broken registry.
 *
 * Run with `pnpm test:model-routing`.
 */
const key = process.env.OPENROUTER_API_KEY
if (!key) {
  console.log('model-routing: no OPENROUTER_API_KEY, skipped')
  process.exit(0)
}

const models = [...new Set(Object.values(MODELS).flatMap((spec) => [spec.primary, ...spec.fallbacks]))]

async function main() {
  const dead: string[] = []

  for (const model of models) {
    const response = await fetch(`https://openrouter.ai/api/v1/models/${model}/endpoints`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    assert.ok(response.ok, `${model}: OpenRouter answered ${response.status}`)

    const endpoints: { provider_name: string; supported_parameters?: string[] }[] =
      (await response.json())?.data?.endpoints ?? []
    const eligible = endpoints.filter((e) => e.supported_parameters?.includes('structured_outputs'))

    console.log(`  ${model.padEnd(28)} ${String(eligible.length).padStart(2)}/${String(endpoints.length).padStart(2)} providers`)
    if (eligible.length === 0) dead.push(model)
  }

  assert.deepEqual(
    dead,
    [],
    `No provider supports structured outputs for: ${dead.join(', ')}. ` +
      'Under require_parameters these are refused on every call — replace them in MODELS.',
  )
  console.log(`model-routing: ${models.length} models, all servable`)
}

main()
