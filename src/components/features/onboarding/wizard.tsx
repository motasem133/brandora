'use client'

import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Link, useRouter } from '@/i18n/navigation'
import { EVENTS, capture } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { BRAND_STYLES, COUNTRIES, INDUSTRY_KEYS } from '@/lib/validations/project'
import { createProject } from '@/server/actions/projects'

const TOTAL_STEPS = 8

const SWATCHES = [
  '#7c3aed', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981',
  '#3b82f6', '#ec4899', '#14b8a6', '#111827', '#d4af37',
]

type FormState = {
  businessName: string
  industry: string
  country: string
  targetAudience: string
  brandStyle: (typeof BRAND_STYLES)[number] | ''
  preferredColors: string[]
  needsWebsite: boolean
  needsSocialMedia: boolean
}

const INITIAL: FormState = {
  businessName: '',
  industry: '',
  country: '',
  targetAudience: '',
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

export function OnboardingWizard({ entitlements }: { entitlements: WizardEntitlements }) {
  const t = useTranslations('Onboarding')
  const tc = useTranslations('Common')
  const locale = useLocale()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    // Start locked features off, so what the user sees is what gets created.
    needsWebsite: entitlements.websiteBuilder,
    needsSocialMedia: entitlements.socialMediaKit,
  })
  const [error, setError] = useState<string>()

  const { execute, isPending, result } = useAction(createProject, {
    onSuccess: ({ data }) => {
      capture(EVENTS.projectCreated)
      if (data?.projectId) router.push(`/dashboard/projects/${data.projectId}`)
    },
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(undefined)
  }

  /** Client-side gate only — the same rules run again in the Server Action. */
  function validateStep(current: number): string | undefined {
    if (current === 2 && form.industry.trim().length < 2) return t('errors.industryRequired')
    if (current === 3 && !form.country) return t('errors.countryRequired')
    if (current === 4) {
      if (!form.targetAudience.trim()) return t('errors.audienceRequired')
      if (form.targetAudience.trim().length < 10) return t('errors.audienceTooShort')
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
    if (step < TOTAL_STEPS) setStep(step + 1)
    else submit()
  }

  function submit() {
    execute({
      businessName: form.businessName.trim() || undefined,
      industry: form.industry.trim(),
      country: form.country,
      targetAudience: form.targetAudience.trim(),
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

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-display text-lg font-semibold">{t('title')}</span>
          <span className="text-fg-muted">{t('stepOf', { current: step, total: TOTAL_STEPS })}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ inlineSize: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="surface-card p-6 sm:p-8">
        <StepHeader title={t(`step${step}Title`)} subtitle={t(`step${step}Subtitle`)} />

        <div className="mt-6">
          {step === 1 && (
            <Input
              autoFocus
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              placeholder={t('step1Placeholder')}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              </div>
              <Input
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder={t('step2Placeholder')}
              />
            </div>
          )}

          {step === 3 && (
            <select
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-fg focus:border-brand focus:outline-none"
            >
              <option value="">—</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          )}

          {step === 4 && (
            <Textarea
              autoFocus
              value={form.targetAudience}
              onChange={(e) => set('targetAudience', e.target.value)}
              placeholder={t('step4Placeholder')}
            />
          )}

          {step === 5 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {BRAND_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => set('brandStyle', style)}
                  className={cn(
                    'rounded-lg border p-4 text-start transition-colors',
                    form.brandStyle === style
                      ? 'border-brand bg-brand/10'
                      : 'border-line hover:border-line-strong',
                  )}
                >
                  <span className="block font-medium">{t(`styles.${style}`)}</span>
                  <span className="mt-0.5 block text-sm text-fg-secondary">
                    {t(`styles.${style}Desc`)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-wrap gap-3">
              {SWATCHES.map((color) => {
                const selected = form.preferredColors.includes(color)
                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleColor(color)}
                    style={{ backgroundColor: color }}
                    className={cn(
                      'flex size-11 items-center justify-center rounded-full transition-transform',
                      selected ? 'scale-110 ring-2 ring-brand ring-offset-2 ring-offset-surface' : 'hover:scale-105',
                    )}
                  >
                    {selected && <Check className="size-4 text-white drop-shadow" />}
                  </button>
                )
              })}
            </div>
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

        <FieldError message={error ?? result?.serverError} />

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isPending}
          >
            <ArrowLeft className="rtl:rotate-180" />
            {tc('back')}
          </Button>

          <Button onClick={next} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {step === TOTAL_STEPS
              ? isPending
                ? t('creating')
                : t('createProject')
              : tc('next')}
            {step < TOTAL_STEPS && <ArrowRight className="rtl:rotate-180" />}
          </Button>
        </div>
      </div>
    </div>
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
    <div className="rounded-lg border border-line bg-elevated/50 p-5">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-fg-muted" />
        <div>
          <p className="text-sm text-fg-secondary">{message}</p>
          <Link
            href="/dashboard/billing"
            className="mt-2 inline-block text-sm text-brand hover:underline"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  )
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-fg-secondary">{subtitle}</p>
    </div>
  )
}

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
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2.5 text-sm transition-colors',
        selected ? 'border-brand bg-brand/10 font-medium' : 'border-line hover:border-line-strong',
      )}
    >
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
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.val)}
          className={cn(
            'rounded-lg border p-5 text-center font-medium transition-colors',
            value === option.val
              ? 'border-brand bg-brand/10'
              : 'border-line hover:border-line-strong',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
