'use client'

import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef, useState } from 'react'

import { EmailVerification } from '@/components/features/settings/email-verification'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Link, useRouter } from '@/i18n/navigation'
import { EVENTS, capture } from '@/lib/analytics'
import { contrast } from '@/lib/brand-theme'
import { cn } from '@/lib/utils'
import { BRAND_STYLES, COUNTRIES, INDUSTRY_KEYS } from '@/lib/validations/project'
import { generateProject } from '@/server/actions/generation'
import { createProject } from '@/server/actions/projects'

const TOTAL_STEPS = 8

/**
 * The eight questions, told as three chapters.
 *
 * "Step 4 of 8" is a progress bar's caption, not a journey — it says how much
 * is left and nothing about what is being asked or why. Named chapters let
 * someone see they are past the facts and into the brand itself, and give the
 * halfway point a meaning other than "four more".
 */
const CHAPTERS = [
  { key: 'chapterBusiness', steps: [1, 2, 3] },
  { key: 'chapterBrand', steps: [4, 5, 6] },
  { key: 'chapterKit', steps: [7, 8] },
] as const

/**
 * Colour choices, each with a name.
 *
 * The buttons used to contain nothing but a tick when selected, so an
 * unselected swatch had no text node at all and a screen reader announced ten
 * anonymous buttons. The name is what makes a colour a choice rather than a
 * square.
 */
const SWATCHES = [
  { hex: '#7c3aed', key: 'violet' },
  { hex: '#06b6d4', key: 'cyan' },
  { hex: '#f43f5e', key: 'rose' },
  { hex: '#f59e0b', key: 'amber' },
  { hex: '#10b981', key: 'emerald' },
  { hex: '#3b82f6', key: 'blue' },
  { hex: '#ec4899', key: 'pink' },
  { hex: '#14b8a6', key: 'teal' },
  { hex: '#111827', key: 'ink' },
  { hex: '#d4af37', key: 'gold' },
] as const

/** Three is the cap the model works best from — and it is now said out loud. */
const MAX_COLORS = 3

/** The point at which the brief carries enough for the model to work from. */
const BRIEF_MIN = 20

/** Both ends of the name, matching `createProjectSchema` so the two agree. */
const NAME_MIN = 2
const NAME_MAX = 60

type FormState = {
  businessName: string
  industry: string
  country: string
  brandBrief: string
  brandStyle: (typeof BRAND_STYLES)[number] | ''
  preferredColors: string[]
  needsWebsite: boolean
  needsSocialMedia: boolean
}

const INITIAL: FormState = {
  businessName: '',
  industry: '',
  country: '',
  brandBrief: '',
  brandStyle: '',
  preferredColors: [],
  needsWebsite: true,
  needsSocialMedia: true,
}

export type WizardEntitlements = {
  planName: string
  websiteBuilder: boolean
  socialMediaKit: boolean
}

export type WizardPricing = { base: number; website: number; social: number }

export type CarriedOver = {
  from: string
  industry: string
  country: string
  brandStyle: (typeof BRAND_STYLES)[number]
} | null

export function OnboardingWizard({
  entitlements,
  pricing,
  balance,
  mustVerify,
  userEmail,
  carriedOver,
}: {
  entitlements: WizardEntitlements
  pricing: WizardPricing
  balance: number
  mustVerify: boolean
  userEmail: string
  carriedOver: CarriedOver
}) {
  const t = useTranslations('Onboarding')
  const tc = useTranslations('Common')
  const locale = useLocale()
  const router = useRouter()
  const reduced = useReducedMotion()

  const [step, setStep] = useState(1)
  /** Which way the last move went, so the panels travel with the journey. */
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    /*
     * The answers that stay true between one client and the next arrive filled
     * in, marked as carried over so they read as a starting point rather than
     * as something already decided.
     */
    industry: carriedOver?.industry ?? '',
    country: carriedOver?.country ?? '',
    brandStyle: carriedOver?.brandStyle ?? '',
    // Start locked features off, so what the user sees is what gets created.
    needsWebsite: entitlements.websiteBuilder,
    needsSocialMedia: entitlements.socialMediaKit,
  })
  const [error, setError] = useState<string>()
  const [leaving, setLeaving] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  /*
   * What this run costs, live, as the deliverables are chosen.
   *
   * PRODUCT.md's second principle is that anything which can spend credits says
   * so before it does, at the control that spends them. The wizard asked eight
   * questions and never mentioned that the answer cost anything; the price was
   * first stated on the next page, after the decision.
   */
  const cost =
    pricing.base +
    (form.needsWebsite ? pricing.website : 0) +
    (form.needsSocialMedia ? pricing.social : 0)

  const affordable = balance >= cost
  const blocked = mustVerify || !affordable

  const generate = useAction(generateProject)

  const { execute, isPending, result } = useAction(createProject, {
    onSuccess: async ({ data }) => {
      capture(EVENTS.projectCreated)
      if (!data?.projectId) return

      /*
       * One intent, one commitment. Creating the project and starting its run
       * used to be two presses on two screens, the second one worded as though
       * nothing had happened yet.
       *
       * If the run cannot start the project still exists, and the project page
       * is where the reason lives — so the destination is the same either way.
       */
      await generate.executeAsync({ projectId: data.projectId })
      router.push(`/dashboard/projects/${data.projectId}`)
    },
  })

  /**
   * True while a carried-over answer is untouched.
   *
   * It stops being marked the moment it is edited, because after that it is
   * this brand's answer rather than the last one's.
   */
  const carried = (key: 'industry' | 'country' | 'brandStyle') =>
    Boolean(carriedOver) && form[key] === carriedOver![key]

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    /*
     * Which of the eight questions people stop answering.
     *
     * Keyed on the step rather than on `next()`, so step 1 counts on arrival —
     * without an event for opening the wizard the first drop-off, which is
     * likely the largest, is the one that cannot be seen. Going back re-fires a
     * step already recorded; a funnel counts the first occurrence per person, so
     * that costs a row and changes no answer.
     */
    capture(EVENTS.onboardingStep, { step })
  }, [step])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(undefined)
  }

  /** Client-side gate only — the same rules run again in the Server Action. */
  function validateStep(current: number): string | undefined {
    /*
     * Step 1 was the one step with no gate at all.
     *
     * The name stays optional — the question says to leave it blank and be
     * given five — but "optional" was being read as "unchecked", so a single
     * letter became a brand, and sixty-one characters got through five more
     * questions before the Server Action rejected them at the end. That is the
     * same dead end as the verification one: a failure raised after the work,
     * about something typed before it.
     */
    if (current === 1) {
      const name = form.businessName.trim()
      if (name && name.length < NAME_MIN) return t('errors.nameTooShort')
      if (name.length > NAME_MAX) return t('errors.nameTooLong', { max: NAME_MAX })
    }
    if (current === 2 && form.industry.trim().length < 2) return t('errors.industryRequired')
    if (current === 3 && !form.country) return t('errors.countryRequired')
    if (current === 4) {
      if (!form.brandBrief.trim()) return t('errors.brandRequired')
      if (form.brandBrief.trim().length < BRIEF_MIN) return t('errors.brandTooShort')
    }
    if (current === 5 && !form.brandStyle) return t('errors.styleRequired')
    return undefined
  }

  function next() {
    const problem = validateStep(step)
    if (problem) {
      setError(problem)
      return
    }
    setDirection(1)
    if (step < TOTAL_STEPS) setStep(step + 1)
    else submit()
  }

  function back() {
    setDirection(-1)
    setStep((s) => Math.max(1, s - 1))
  }

  function submit() {
    execute({
      businessName: form.businessName.trim() || undefined,
      industry: form.industry.trim(),
      country: form.country,
      brandBrief: form.brandBrief.trim(),
      brandStyle: form.brandStyle as (typeof BRAND_STYLES)[number],
      preferredColors: form.preferredColors,
      needsWebsite: form.needsWebsite,
      needsSocialMedia: form.needsSocialMedia,
      language: locale === 'ar' ? 'ar' : 'en',
    })
  }

  function toggleColor(color: string) {
    setForm((prev) => ({
      ...prev,
      preferredColors: prev.preferredColors.includes(color)
        ? prev.preferredColors.filter((c) => c !== color)
        : prev.preferredColors.length < 3
          ? [...prev.preferredColors, color]
          : prev.preferredColors,
    }))
  }

  /*
   * Panels travel in the direction of the journey, mirrored for Arabic so
   * "forward" is always away from where the reader started rather than always
   * leftwards.
   */
  const travel = (locale === 'ar' ? -1 : 1) * 26

  /*
   * Anything the customer has actually typed or chosen. The two feature
   * toggles are excluded because they are seeded from the plan rather than
   * answered, so counting them would make an untouched form look half-filled
   * and warn about discarding nothing.
   */
  const dirty =
    form.businessName.trim() !== '' ||
    form.industry.trim() !== '' ||
    form.country !== '' ||
    form.brandBrief.trim() !== '' ||
    form.brandStyle !== '' ||
    form.preferredColors.length > 0

  /*
   * The way out.
   *
   * Onboarding is its own route with no sidebar and no top bar, so once someone
   * started it the only exit was the browser's back button — and on the first
   * step even "Back" is disabled. Anyone who opened it to look was stuck in it.
   *
   * Confirmed only when there is something to lose, using the same native
   * prompt the delete control uses; warning about discarding an empty form is
   * how a safeguard becomes noise people click through.
   */
  function cancel() {
    if (dirty) {
      setLeaving(true)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Link href="/dashboard" aria-label={tc('back')}>
          <Logo className="text-xl" markClassName="size-11" />
        </Link>

        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className="min-h-11 rounded-control px-3 text-sm text-fg-muted transition-colors hover:bg-elevated hover:text-fg disabled:opacity-50"
        >
          {tc('cancel')}
        </button>
      </div>

      <h1 className="text-center font-display text-2xl font-semibold tracking-[-0.02em]">
        {t('title')}
      </h1>

      <ChapterRail step={step} label={(key) => t(key)} />

      {/*
        The panel, lit from its own base.

        This was `surface-card` — a fill inside a uniform hairline, which is the
        one shape DESIGN.md names as what made the app read as a template beside
        its own marketing. It is the panel step rather than the card step
        because it holds a set of choices rather than being one.
      */}
      <div className="lit shadow-[var(--shadow-lifted)] [--lit-radius:var(--radius-panel)]">
        <div className="lit-inner bloom p-6 sm:p-8 [--bloom-strength:13%]">
        {/*
          The card is sized by the question it is asking.

          A fixed floor tall enough for the longest step made the first one — a
          single input — sit in a third of a screen of nothing. `popLayout`
          takes the outgoing panel out of flow the instant it starts leaving, so
          the container is never empty and never collapses; `layout` then
          animates the one height change that remains, and the card breathes
          between a short question and a long one instead of jumping.
        */}
        <motion.div
          role="group"
          aria-live="polite"
          aria-label={t('stepOf', { step, total: TOTAL_STEPS })}
          layout={!reduced}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * travel, filter: 'blur(5px)' }),
                center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                exit: (d: number) => ({ opacity: 0, x: d * -travel, filter: 'blur(5px)' }),
              }}
              initial={reduced ? false : 'enter'}
              animate="center"
              exit={reduced ? { opacity: 0 } : 'exit'}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                {/*
                  The heading takes focus on each step and the region announces
                  itself: pressing Next used to change the panel silently,
                  leaving focus on a button whose label had not changed and a
                  screen reader with nothing to read.

                  Focus moves in an effect keyed on the step — never in a ref
                  callback. React re-attaches an inline callback ref on every
                  render, and this panel re-renders on every keystroke, so
                  calling `.focus()` there stole the caret back to the heading
                  after each character: typing "Acme" left "A" in the field.
                */}
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-xl font-semibold tracking-[-0.02em] focus:outline-none"
                >
                  {t(`step${step}Title`)}
                </h2>
                <p className="mt-1.5 text-sm text-fg-secondary">{t(`step${step}Subtitle`)}</p>
              </div>

              <div className="mt-6">
                {step === 1 && (
                  /* `maxLength` so the ceiling is enforced by the field rather
                     than reported after it — the check above still runs, for
                     the paths a browser attribute cannot cover. */
                  <Input
                    autoFocus
                    maxLength={NAME_MAX}
                    value={form.businessName}
                    onChange={(e) => set('businessName', e.target.value)}
                    placeholder={t('step1Placeholder')}
                  />
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    {carried('industry') && (
                      <p className="text-xs text-fg-muted">
                        {t('carriedOver', { from: carriedOver!.from })}
                      </p>
                    )}
                    <Stagger className="grid grid-cols-2 gap-2 sm:grid-cols-3" reduced={reduced}>
                      {INDUSTRY_KEYS.map((key) => {
                        const label = t(`industries.${key}`)
                        return (
                          <OptionButton
                            key={key}
                            selected={form.industry === label}
                            onClick={() => set('industry', label)}
                          >
                            {label}
                          </OptionButton>
                        )
                      })}
                    </Stagger>
                    <Input
                      value={form.industry}
                      onChange={(e) => set('industry', e.target.value)}
                      placeholder={t('step2Placeholder')}
                    />
                  </div>
                )}

                {step === 3 && (
                  <Field
                    label={t('step3Label')}
                    hint={carried('country') ? t('carriedOver', { from: carriedOver!.from }) : undefined}
                  >
                    <Select value={form.country} onChange={(e) => set('country', e.target.value)}>
                      {/* An em dash is not a prompt. The empty option now says
                          what choosing one would mean. */}
                      <option value="">{t('step3Placeholder')}</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                {step === 4 && (
                  <BrandBrief
                    value={form.brandBrief}
                    onChange={(value) => set('brandBrief', value)}
                    placeholder={t('step4Placeholder')}
                    hints={[t('step4Hint1'), t('step4Hint2'), t('step4Hint3')]}
                    short={t('step4Short')}
                    good={t('step4Good')}
                  />
                )}

                {step === 5 && carried('brandStyle') && (
                  <p className="mb-3 text-xs text-fg-muted">
                    {t('carriedOver', { from: carriedOver!.from })}
                  </p>
                )}

                {step === 5 && (
                  <Stagger className="grid gap-3 sm:grid-cols-2" reduced={reduced}>
                    {BRAND_STYLES.map((style) => {
                      const selected = form.brandStyle === style

                      return (
                        <button
                          key={style}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => set('brandStyle', style)}
                          className={cn(
                            /* A tile with two lines of content in it, so the
                               control radius rather than a pill. */
                            'rounded-control border p-4 text-start transition-colors',
                            selected
                              ? 'control-lit border-brand bg-brand/15'
                              : 'border-line hover:border-line-strong',
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            {selected && <Check className="size-3.5 shrink-0 accent-text" />}
                            {t(`styles.${style}`)}
                          </span>
                          <span className="mt-0.5 block text-sm text-fg-secondary">
                            {t(`styles.${style}Desc`)}
                          </span>
                        </button>
                      )
                    })}
                  </Stagger>
                )}

                {step === 6 && (
                  <fieldset>
                    {/*
                      The cap was enforced silently: a fourth press did nothing,
                      with no counter and no message, so the control simply
                      stopped responding and did not say why.
                    */}
                    <legend className="mb-3 text-sm text-fg-secondary">
                      {t('colorsChosen', { chosen: form.preferredColors.length, max: MAX_COLORS })}
                    </legend>

                    <Stagger className="flex flex-wrap gap-3" reduced={reduced}>
                      {SWATCHES.map(({ hex, key }) => {
                        const selected = form.preferredColors.includes(hex)
                        const full = form.preferredColors.length >= MAX_COLORS && !selected

                        return (
                          <button
                            key={hex}
                            type="button"
                            aria-pressed={selected}
                            aria-label={t(`colors.${key}`)}
                            disabled={full}
                            onClick={() => toggleColor(hex)}
                            style={{ backgroundColor: hex }}
                            className={cn(
                              'flex size-11 items-center justify-center rounded-full transition-transform',
                              selected && 'scale-110 ring-2 ring-brand ring-offset-2 ring-offset-surface',
                              full && 'cursor-not-allowed opacity-40',
                              !selected && !full && 'hover:scale-105',
                            )}
                          >
                            {/*
                              The tick is the only mark of selection, so it is
                              picked per swatch: white measured 2.10:1 on the
                              gold and 2.15:1 on the amber.
                            */}
                            {selected && (
                              <Check
                                className={cn(
                                  'size-4',
                                  contrast('#ffffff', hex) >= 3 ? 'text-white' : 'text-black',
                                )}
                              />
                            )}
                          </button>
                        )
                      })}
                    </Stagger>
                  </fieldset>
                )}

                {step === 7 &&
                  (entitlements.websiteBuilder ? (
                    <YesNo
                      value={form.needsWebsite}
                      onChange={(v) => set('needsWebsite', v)}
                      yes={t('yes')}
                      no={t('no')}
                    />
                  ) : (
                    <LockedFeature
                      message={t('lockedWebsite', { plan: entitlements.planName })}
                      cta={t('seePlans')}
                    />
                  ))}

                {step === 8 &&
                  (entitlements.socialMediaKit ? (
                    <YesNo
                      value={form.needsSocialMedia}
                      onChange={(v) => set('needsSocialMedia', v)}
                      yes={t('yes')}
                      no={t('no')}
                    />
                  ) : (
                    <LockedFeature
                      message={t('lockedSocial', { plan: entitlements.planName })}
                      cta={t('seePlans')}
                    />
                  ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <FieldError message={error ?? result?.serverError ?? generate.result?.serverError} />

        {/*
          On the last step the price and the two things that can stop the run
          are stated above the control that spends the credits — not on the
          page after it.
        */}
        {step === TOTAL_STEPS && (
          <div className="mt-6 space-y-3">
            {/*
              The balance here, the price on the button. Stating the cost in
              both places put the same changing number forty pixels from
              itself; between them the two facts PRODUCT.md requires are each
              said once, at the control that spends them.
            */}
            <p className="border-t border-line pt-4 text-sm text-fg-secondary">
              {t('balanceLine', { balance })}
            </p>

            {/*
              Verification happens here, on the step it is blocking.

              This was a sentence with a link to Settings. Everything in this
              wizard is React state, so following that link threw away five
              answered questions — and it was the first thing a brand new
              account saw, because signing up lands straight on this page. The
              customer did the whole interview, was told at the end that they
              could not press the button, and pressing the only thing offered
              deleted the interview.

              The code component was built for exactly this and already sits in
              the generation panel: six digits typed into the blocked page,
              which then refreshes its own server props. `router.refresh()` does
              not remount client components, so the answers above are still
              here when the button unlocks.
            */}
            {mustVerify && (
              <div className="space-y-3 border-t border-line pt-4">
                <p className="text-sm text-warning">{t('verifyFirst')}</p>
                {/* Blocking, so it sends a code if none is live — see the panel. */}
                <EmailVerification email={userEmail} autoSend />
              </div>
            )}

            {!mustVerify && !affordable && (
              <p className="text-sm text-warning">
                {t('notEnoughCredits', { cost, balance })}{' '}
                <Link href="/dashboard/billing" className="accent-text hover:underline">
                  {t('topUp')}
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={back} disabled={step === 1 || isPending}>
            <ArrowLeft className="rtl:rotate-180" />
            {tc('back')}
          </Button>

          <Button onClick={next} disabled={isPending || (step === TOTAL_STEPS && blocked)}>
            {isPending && <Loader2 className="animate-spin" />}
            {step === TOTAL_STEPS
              ? isPending
                ? t('starting')
                : t('generateCta', { credits: cost })
              : tc('next')}
            {step < TOTAL_STEPS && <ArrowRight className="rtl:rotate-180" />}
          </Button>
          </div>
        </div>
      </div>

      {/*
        Rendered last on purpose. A native `<dialog>` is placed in the top layer
        wherever it is declared, so its position in the document costs nothing
        visually — and declared first, its title was the first heading on the
        page: a screen-reader user browsing by heading met "Leave without
        creating your brand?" before the question they had come to answer.
      */}
      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={() => router.push('/dashboard')}
        title={t('cancelTitle')}
        body={t('cancelConfirm')}
        confirmLabel={t('discard')}
        cancelLabel={t('keepGoing')}
        destructive
      />
    </div>
  )
}

/**
 * The journey, drawn as three chapters with the road filling behind you.
 *
 * The line fills continuously rather than snapping chapter to chapter, so a
 * step taken inside a chapter still visibly moves you along it — which is the
 * difference between a map and a set of milestones.
 */
function ChapterRail({ step, label }: { step: number; label: (key: string) => string }) {
  const travelled = (step - 1) / (TOTAL_STEPS - 1)

  return (
    <div className="my-8">
      <div className="relative">
        <div className="absolute inset-x-0 top-[0.4375rem] h-px bg-line" />
        {/*
          Scaled rather than widened. Animating `width` is a layout property —
          it re-runs layout every frame, eight times a session, for a line.
        */}
        <motion.div
          className="absolute inset-x-0 top-[0.4375rem] h-px origin-[left] bg-brand rtl:origin-[right]"
          initial={false}
          animate={{ scaleX: travelled }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />

        <ol className="relative flex justify-between">
          {CHAPTERS.map((chapter) => {
            const reached = step >= chapter.steps[0]
            const done = step > chapter.steps[chapter.steps.length - 1]

            return (
              <li key={chapter.key} className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    'grid size-3.5 place-items-center rounded-full border-2 transition-colors duration-300',
                    reached ? 'border-brand bg-brand' : 'border-line bg-surface',
                  )}
                >
                  {done && <Check className="size-2 text-brand-fg" strokeWidth={4} />}
                </span>
                <span
                  className={cn(
                    'text-xs transition-colors duration-300',
                    reached ? 'font-medium text-fg' : 'text-fg-muted',
                  )}
                >
                  {label(chapter.key)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/**
 * The one question the whole run is built on.
 *
 * It used to ask only who the customer sells to, and that is what the model
 * got: an audience with no business attached. Names, story, copy and the logo
 * are all generated from this paragraph, so it is given room, a worked example
 * to show the shape of a good answer, and a line that changes once there is
 * enough here to work from — because "at least 20 characters" tells someone
 * they have satisfied a validator, not that they have said something useful.
 */
function BrandBrief({
  value,
  onChange,
  placeholder,
  hints,
  short,
  good,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  hints: string[]
  short: string
  good: string
}) {
  const enough = value.trim().length >= BRIEF_MIN

  return (
    <div className="space-y-3">
      {/*
        16px against the app's 14px: this is the one field where somebody writes
        a sentence rather than fills a slot, and it is also what stops iOS
        zooming the page when it takes focus.
      */}
      <Textarea
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="min-h-40 text-base leading-relaxed"
      />

      <ul className="flex flex-wrap gap-x-2 gap-y-1.5 text-xs text-fg-muted">
        {hints.map((hint, index) => (
          <li key={hint} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden>·</span>}
            {hint}
          </li>
        ))}
      </ul>

      <motion.p
        key={enough ? 'good' : 'short'}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn('text-sm', enough ? 'text-fg-secondary' : 'text-fg-muted')}
      >
        {enough ? good : short}
      </motion.p>
    </div>
  )
}

/** Options arriving in sequence, so a grid of choices reads as a set being dealt. */
function Stagger({
  children,
  className,
  reduced,
}: {
  children: React.ReactNode
  className?: string
  reduced: boolean | null
}) {
  if (reduced) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.03 } } }}
    >
      {/*
        `display: contents` generates no box, so opacity and transform on this
        wrapper had no rendering effect whatsoever — Framer wrote styles every
        frame for an animation that could not be seen. The wrapper is a real
        box now, and `contents` is gone.
      */}
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 6 },
                shown: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  )
}

/**
 * Shown instead of the Yes/No choice when the plan does not include a feature.
 *
 * The server action drops these fields anyway, so offering the choice would
 * mean silently ignoring the answer — the user would pick "yes, I want a
 * website" and simply never get one.
 */
function LockedFeature({ message, cta }: { message: string; cta: string }) {
  return (
    <div className="rounded-control border border-line bg-elevated/50 p-5">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-fg-muted" />
        <div>
          <p className="text-sm text-fg-secondary">{message}</p>
          <Link
            href="/dashboard/billing"
            className="mt-2 inline-block text-sm accent-text hover:underline"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * One of the offered answers.
 *
 * A pill, because it is a control and every control in this product is one now.
 * Two things changed with it, and both were findings rather than taste:
 *
 * `aria-pressed` — the selected state was conveyed to a screen reader by
 * nothing at all. These are toggles in a group, not links, and the colour
 * swatches three steps later have always said so correctly.
 *
 * The tick — selection was carried by a tinted border and a 10% wash, which is
 * colour alone, and the wash measures a couple of percent of luminance against
 * the panel it sits on. The mark is the state; the colour agrees with it.
 */
function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-3.5 py-2.5 text-sm transition-colors',
        selected
          ? 'control-lit border-brand bg-brand/15 font-medium text-fg'
          : 'border-line text-fg-secondary hover:border-line-strong hover:text-fg',
      )}
    >
      {selected && <Check className="size-3.5 shrink-0 accent-text" />}
      {children}
    </button>
  )
}

function YesNo({
  value,
  onChange,
  yes,
  no,
}: {
  value: boolean
  onChange: (v: boolean) => void
  yes: string
  no: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { label: yes, val: true },
        { label: no, val: false },
      ].map((option) => {
        const selected = value === option.val

        return (
          <button
            key={option.label}
            type="button"
            /* Same finding as `OptionButton`: chosen and not chosen sounded
               identical, and looked different only in colour. */
            aria-pressed={selected}
            onClick={() => onChange(option.val)}
            className={cn(
              /* `shape="control"` territory: this is a surface you press rather
                 than a control-sized pill, and at 96px tall a full pill would
                 read as a capsule of empty space. */
              'flex min-h-11 items-center justify-center gap-2 rounded-control border p-5 text-center font-medium transition-colors',
              selected
                ? 'control-lit border-brand bg-brand/15 text-fg'
                : 'border-line text-fg-secondary hover:border-line-strong hover:text-fg',
            )}
          >
            {selected && <Check className="size-4 shrink-0 accent-text" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
