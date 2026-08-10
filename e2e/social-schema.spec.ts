import { expect, test } from '@playwright/test'

import { socialSchema } from '@/server/ai/schemas'

/**
 * The contract that decides whether a model's answer is good enough to keep.
 *
 * `runModel` walks a chain of models and only moves to the next when one
 * *fails*, so this schema is the thing that makes a fallback happen. When every
 * field had a maximum and no minimum it accepted the first answer whatever it
 * said — and one real run stored an empty bio, ten identical hashtags and `<br>`
 * through every caption, because each of those satisfied `string().max(30)`.
 *
 * No browser needed; this is the contract on its own.
 */

/** Nine posts, three stories, ten tags — the shape a good answer has. */
const good = {
  instagramBio: 'Independent research into how the human system regulates itself. Rigor over motivation.',
  instagramPosts: Array.from({ length: 9 }, (_, index) => ({
    type: 'education',
    caption:
      'Stop optimizing for output and start regulating the system. We map the cognitive, ' +
      `biological and computational layers rather than guessing at them. Post ${index + 1}.`,
    hashtags: ['humanoptimization', 'systemregulation', 'cognitiveresearch'],
  })),
  storyTemplates: Array.from({ length: 3 }, (_, index) => ({
    title: `Story ${index + 1}`,
    body: 'A short prompt that fits inside a story frame and still says something.',
  })),
  adCopy: {
    headline: 'Understand the system you inhabit',
    body: 'A technical repository detailing the regulatory relationships between cognitive, nutritional and computational states.',
    cta: 'Request access',
    facebookAd:
      'Independent research into human regulation. Structured data for people who value rigor over motivation, with no promises attached.',
    googleAd: 'Structured inquiry into human regulation. Request access to the technical portal.',
  },
  hashtags: [
    'humanoptimization',
    'systemregulation',
    'cognitiveresearch',
    'biocomputation',
    'systemsbiology',
    'regulatorysystems',
    'cognitiveload',
    'semanticmapping',
    'datamodeling',
    'selfexperimentation',
  ],
}

test.describe('social copy contract', () => {
  test('a complete answer is accepted', () => {
    expect(socialSchema.safeParse(good).success).toBe(true)
  })

  /*
   * Each of these is a thing a model actually produced and the old schema
   * stored, on a run a customer then received an email about.
   */
  test('the answer that reached a customer is now refused', () => {
    const brokenBio = { ...good, instagramBio: '' }
    expect(socialSchema.safeParse(brokenBio).success).toBe(false)

    const repeatedTags = { ...good, hashtags: Array.from({ length: 10 }, () => 'test') }
    expect(socialSchema.safeParse(repeatedTags).success).toBe(false)

    const markupInCaption = {
      ...good,
      instagramPosts: good.instagramPosts.map((post, index) =>
        index === 0
          ? { ...post, caption: post.caption.replace('. ', '.<br><br>') }
          : post,
      ),
    }
    expect(socialSchema.safeParse(markupInCaption).success).toBe(false)

    const emptyHeadline = { ...good, adCopy: { ...good.adCopy, headline: '' } }
    expect(socialSchema.safeParse(emptyHeadline).success).toBe(false)
  })

  /*
   * The rule that decides a hashtag has to hold for Arabic, which is half the
   * product. An ASCII-only pattern would fail every Arabic run.
   */
  test('Arabic hashtags are valid', () => {
    const arabic = {
      ...good,
      hashtags: [
        'تحسين_الإنسان',
        'تنظيم_الأنظمة',
        'بحث_معرفي',
        'الحوسبة_الحيوية',
        'بيولوجيا_الأنظمة',
        'الأنظمة_التنظيمية',
        'الحمل_المعرفي',
        'الخرائط_الدلالية',
        'نمذجة_البيانات',
        'التجريب_الذاتي',
      ],
    }
    expect(socialSchema.safeParse(arabic).success).toBe(true)
  })
})
