/**
 * What a run costs, and what a balance is worth.
 *
 * Isomorphic on purpose. This is arithmetic over constants with no database
 * access at all, and it lived in `server/billing/credits.ts` behind
 * `server-only` alongside the ledger writes — which meant three pages and two
 * components had to reach into the billing server module to ask what a plan
 * buys, and meant the one calculation that decides what a customer is *sold*
 * could not be unit tested at all, because `server-only` does not resolve
 * outside the bundler.
 *
 * The ledger, the reservations and the settlement stay where they were. Only
 * the arithmetic moved.
 */

/**
 * Credit costs per generated section. 1 credit ~ $0.05 of upstream AI cost.
 *
 * Logos dominate: four Seedream images cost ~$0.30 against ~$0.012 for all the
 * text combined. Pricing levers belong on image count, not tokens.
 */
export const CREDIT_COSTS = {
  branding: 1,
  logos: 6,
  website: 1,
  social: 1,
  /*
   * Three generated photographs at $0.0675 each, plus eight renders and a
   * printed document that cost only time. Priced beside `logos`, which is six
   * credits for two images — a kit is more machine work and less model work,
   * so it sits below it.
   */
  kit: 4,
} as const

export type GenerationSection = keyof typeof CREDIT_COSTS

/**
 * What one brand costs, in credits.
 *
 * Customers are sold brands, not credits: "20 brands a month" is a number
 * someone can act on and "260 credits" is not. This is the exchange rate
 * between the two, and every plan's headline is derived from it rather than
 * written down twice — so a change to any section's price moves the pricing
 * page with it instead of quietly making it wrong.
 *
 * Everything a paid plan can produce: the naming and story, both logo
 * concepts, the website, the written social copy, and the designed kit.
 */
export const BRAND_COST =
  CREDIT_COSTS.branding +
  CREDIT_COSTS.logos +
  CREDIT_COSTS.website +
  CREDIT_COSTS.social +
  CREDIT_COSTS.kit

/**
 * What one brand costs on a plan that cannot publish a site or design a kit.
 *
 * The free plan's brand is a smaller object than a paid one — the naming, the
 * story, both logos and the written social copy — so counting it at the full
 * rate would report "0 brands" for a plan whose entire promise is one.
 */
export const BRAND_COST_STARTER =
  CREDIT_COSTS.branding + CREDIT_COSTS.logos + CREDIT_COSTS.social

/**
 * How many brands a balance is worth on a given plan.
 *
 * One function for every surface that shows the number — the pricing cards,
 * the comparison table and the billing page — because the moment it is
 * written twice the three of them start disagreeing about what a plan buys.
 *
 * The rate depends on what the plan can produce: a plan without the website
 * and the designed kit makes a smaller brand, and counting it at the full rate
 * reports zero for a plan whose entire promise is one.
 */
export function brandsFrom(
  credits: number,
  plan: { websiteBuilder: boolean; socialMediaKit: boolean },
) {
  const full = plan.websiteBuilder && plan.socialMediaKit
  return Math.floor(credits / (full ? BRAND_COST : BRAND_COST_STARTER))
}

export function creditsForSections(sections: GenerationSection[]): number {
  return sections.reduce((total, section) => total + CREDIT_COSTS[section], 0)
}
