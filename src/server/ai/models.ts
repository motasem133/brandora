/**
 * The model registry.
 *
 * Every model choice in the product lives here. Changing which model runs a
 * task is a one-line diff, and `ai_usage` records what actually served each
 * call so the decision can be revisited with real cost and latency data.
 *
 * Prices are USD per million tokens, verified against the OpenRouter catalogue.
 * They are used only to estimate cost when a provider omits it from the
 * response — never to bill a customer.
 */

export type ModelTask =
  | 'brandingEn'
  | 'brandingAr'
  | 'website'
  | 'social'
  | 'utility'
  | 'assistant'

type ModelSpec = {
  primary: string
  fallbacks: string[]
}

export const MODELS: Record<ModelTask, ModelSpec> = {
  // Naming and positioning are reasoning tasks: the model must hold industry,
  // audience, and style constraints at once. DeepSeek gives the best
  // reasoning-per-dollar of the Chinese models.
  brandingEn: {
    primary: 'deepseek/deepseek-v4-pro',
    fallbacks: ['z-ai/glm-5.2', 'qwen/qwen3.7-plus'],
  },

  // Qwen leads general-purpose models on Arabic (BALSAM, ArabicMMLU) and,
  // critically, produces names that work culturally in the Gulf rather than
  // literal translations of English ideas. Worth 5x on the highest-value output.
  brandingAr: {
    primary: 'qwen/qwen3.7-max',
    fallbacks: ['qwen/qwen3.7-plus', 'z-ai/glm-5.2'],
  },

  // Emitting a deeply nested multi-page block tree rewards strict schema
  // adherence over raw intelligence.
  website: {
    primary: 'z-ai/glm-5.2',
    fallbacks: ['deepseek/deepseek-v4-pro', 'qwen/qwen3.7-plus'],
  },

  // Short punchy copy with emoji and hashtag instincts; flagship reasoning adds
  // nothing here, so this runs 4x cheaper than the branding tier.
  social: {
    primary: 'qwen/qwen3.7-plus',
    fallbacks: ['z-ai/glm-5.2', 'deepseek/deepseek-v4-flash'],
  },

  /*
   * Classification, tagging, titles. Effectively free — never spend a flagship
   * model on a task like this.
   *
   * `qwen/qwen3.7-flash` was the primary and cannot be, since `runModel` began
   * requiring providers that support the schema it sends. It has exactly one
   * provider, and that provider does not advertise `structured_outputs` for
   * this model — so every utility call was refused in under 200ms and fell to
   * the model below. It answered valid JSON when it was allowed to, which is
   * the tempting part: what it does not offer is the *guarantee*, and a task
   * that silently depends on a provider's good behaviour is the fault this
   * whole change exists to remove. Listing it as a fallback would only buy a
   * refused round trip and an `error` row on every call.
   *
   * The replacement was already this chain's fallback, so no new model enters
   * the product: 12 of its 17 providers keep the guarantee, measured. It is
   * roughly 4x the token price of what it replaces and that is a rounding
   * error here — a title is a couple of hundred tokens, so this is hundredths
   * of a cent a call.
   */
  utility: {
    primary: 'deepseek/deepseek-v4-flash',
    fallbacks: ['z-ai/glm-5.2'],
  },

  // Most reliable tool-calling of the Chinese models, and cheap enough that
  // chat can stay unmetered.
  assistant: {
    primary: 'z-ai/glm-5.2',
    fallbacks: ['deepseek/deepseek-v4-pro'],
  },
}

/** USD per million tokens. Fallback estimation only. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'deepseek/deepseek-v4-pro': { input: 0.435, output: 0.87 },
  'deepseek/deepseek-v4-flash': { input: 0.14, output: 0.28 },
  'qwen/qwen3.7-max': { input: 1.475, output: 4.425 },
  'qwen/qwen3.7-plus': { input: 0.32, output: 1.28 },
  'qwen/qwen3.7-flash': { input: 0.03, output: 0.13 },
  'z-ai/glm-5.2': { input: 0.2842, output: 0.8932 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICING[model]
  if (!price) return 0
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000
}

/** Ordered attempt chain: primary first, then each fallback. */
export function modelChain(task: ModelTask): string[] {
  return [MODELS[task].primary, ...MODELS[task].fallbacks]
}

/** Branding is the one task where output language changes the model. */
export function brandingTask(language: 'en' | 'ar'): ModelTask {
  return language === 'ar' ? 'brandingAr' : 'brandingEn'
}
