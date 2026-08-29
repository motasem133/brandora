import { ArrowRight, Plus, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { BrandSpecimen } from '@/components/features/projects/brand-specimen'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Cell } from '@/components/ui/horizon'
import { Input } from '@/components/ui/input'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { SegmentedControl, SegmentedLink } from '@/components/ui/segmented-control'
import { Link } from '@/i18n/navigation'
import { BRAND_COST } from '@/server/billing/credits'
import { listBrandSpecimens, type BrandSpecimen as Specimen } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

/**
 * The sorts this list offers, and the order they are offered in.
 *
 * Three, not five. "Recently created" is what a returning customer almost always
 * wants and is the default; "oldest" and "by name" are the two that answer a
 * question the default cannot — finding the first brand made for a client, and
 * finding one by a name half-remembered. A status filter was considered and left
 * out: a failed run is rare, it already says so on the card, and a filter for a
 * state most accounts never have is a control that is empty for everybody.
 */
const SORTS = ['recent', 'oldest', 'name'] as const
type Sort = (typeof SORTS)[number]

function isSort(value: string | undefined): value is Sort {
  return SORTS.includes(value as Sort)
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { locale } = await params
  const { q, sort } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Projects')

  return (
    <div className="space-y-7">
      {/* The same action is lit at the end of the app bar on every screen; a
          second copy here said it twice. The empty state below still carries
          its own, because a page with nothing on it needs one. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
        </div>

        {/* A GET form keeps the search in the URL and needs no client
            JavaScript — the same shape the admin screens use. It sits with the
            page's own heading rather than above the grid, because it filters
            the page rather than the one list on it. */}
        <form className="flex gap-2" role="search">
          <label htmlFor="project-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <Input
            id="project-search"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder={t('searchLabel')}
            className="w-56 sm:w-64"
          />
          {/* Carried across the search, so searching does not silently throw
              away a sort the customer chose a moment ago. */}
          {isSort(sort) && sort !== 'recent' && <input type="hidden" name="sort" value={sort} />}
        </form>
      </div>

      {/*
        Scoped to the list rather than declared as a route-level loading.tsx.
        A loading.tsx here would cover the whole segment including
        /projects/[id], and a segment that streams answers 200 before it knows
        the project exists — which turned a cross-tenant 404 into a 200.
      */}
      {/*
        Deliberately unkeyed on the query.

        Keying it per search re-mounts the boundary, so every keystroke's worth
        of navigation threw the list away and painted the skeleton — a flash on
        a filter that resolves in one indexed read. Unkeyed, React holds the
        previous list through the transition and swaps when the new one is
        ready, which is the same behaviour the rest of the app's navigations
        have. The skeleton still covers the first load, which is what it is for.
      */}
      <Suspense fallback={<ProjectsSkeleton label={t('loading')} />}>
        <ProjectList locale={locale} search={q} sort={isSort(sort) ? sort : 'recent'} />
      </Suspense>
    </div>
  )
}

/**
 * Search and sort, in the URL and without client JavaScript.
 *
 * PRODUCT.md names the returning freelancer as the account that matters, and
 * this is the screen they live on — nine brands in, the way to a particular one
 * was to read every card. A GET form and a row of links is the pattern the admin
 * screens already use for exactly this, so the choice is shareable, survives a
 * reload and needs nothing to hydrate.
 *
 * Filtered in memory rather than in SQL. `listBrandSpecimens` already loads the
 * organisation's whole list to build the cards, so a WHERE clause here would be
 * a second round trip to narrow a set that is already in hand — and at the size
 * these accounts actually reach, the comparison is not the cost.
 */
/**
 * The fields a customer would expect to search by, including the one the card
 * actually shows.
 *
 * `businessName` before `title`: the card's heading is
 * `businessName || title`, so leaving it out meant typing a brand's own name as
 * it appears on screen and being told nothing matched. `title` stays as well —
 * it is what the project was called before a name was chosen, and a brand still
 * mid-run has only that.
 */
function matches(specimen: Specimen, needle: string) {
  const { project, slogan } = specimen
  return [project.businessName, project.title, project.industry, project.country, slogan]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.toLowerCase().includes(needle))
}

/** What the card puts in its heading, and therefore what "by name" has to mean. */
function displayName(specimen: Specimen) {
  return specimen.project.businessName || specimen.project.title
}

function sortSpecimens(specimens: Specimen[], sort: Sort, locale: string) {
  const sorted = [...specimens]
  if (sort === 'name') {
    /* `localeCompare` with the page's own locale, because an Arabic list sorted
       by code points is not sorted — and on the displayed name, because a sort
       the reader cannot verify against what is on screen reads as broken. */
    return sorted.sort((a, b) => displayName(a).localeCompare(displayName(b), locale))
  }
  const direction = sort === 'oldest' ? 1 : -1
  return sorted.sort(
    (a, b) =>
      direction * (a.project.createdAt.getTime() - b.project.createdAt.getTime()),
  )
}

async function ProjectList({
  locale,
  search,
  sort,
}: {
  locale: string
  search: string | undefined
  sort: Sort
}) {
  const t = await getTranslations('Projects')
  const { org } = await requireOrg()
  const specimens = await listBrandSpecimens(org.id)

  if (specimens.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-line">
        {/* An empty state with nothing to press is a dead end: this one stated
            that there were no brands and left the visitor to find the way to
            making one somewhere else on the page. */}
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Link href="/onboarding" className={buttonVariants({ size: 'sm' })}>
              {t('emptyCta')}
              <ArrowRight className="rtl:rotate-180" />
            </Link>
          }
        />
      </div>
    )
  }

  const needle = search?.trim().toLowerCase() ?? ''
  const found = needle ? specimens.filter((specimen) => matches(specimen, needle)) : specimens
  const shown = sortSpecimens(found, sort, locale)

  const sortHref = (next: Sort) => {
    const query = new URLSearchParams()
    if (needle) query.set('q', search!.trim())
    /* The default is the absence of the parameter, so the plain URL and the
       explicitly-default URL are the same page rather than two. */
    if (next !== 'recent') query.set('sort', next)
    const suffix = query.toString()
    return `/dashboard/projects${suffix ? `?${suffix}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <SegmentedControl label={t('sortLabel')}>
          {SORTS.map((option) => (
            <SegmentedLink key={option} href={sortHref(option)} active={sort === option}>
              {t(`sort.${option}`)}
            </SegmentedLink>
          ))}
        </SegmentedControl>
      </div>

      {shown.length === 0 ? (
        /*
          Not the same as having no brands, and it must not look like it. The
          way out is the point: a customer who has searched into an empty page
          needs the search cleared, not an invitation to generate another brand.
        */
        <div className="rounded-panel border border-dashed border-line p-10 text-center">
          <p className="text-fg-secondary">{t('noMatches', { query: search!.trim() })}</p>
          <Link
            href="/dashboard/projects"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}
          >
            {t('clearSearch')}
          </Link>
        </div>
      ) : (
        /*
          The grid is the field so that a card entered on the way past knows how
          the pointer was travelling — a card can only measure velocity it was
          there for, and by the time one is entered the movement that mattered
          has happened somewhere else in the grid.

          `lift={false}`: the cards now answer the hover themselves, and a
          wrapper that also lifts would carry the card out from under the cursor
          and make it enter itself again.
        */
        /*
          A grid, not a wall.

          The three-column deal and the pinned sheets were the board's
          composition — a sheet kept the height of what was on it and the
          shortest column was the last one, which is how a critique wall reads.
          The world that replaced the board has no pins and no sheets, and the
          comp this page was approved from is an even grid: every brand the same
          frame, so the only thing that differs between two cards is the brand
          itself. That is the whole argument of the new world, and a masonry
          would put our composition back in front of it.

          `MomentumField` stays. It is not board vocabulary — it measures how the
          pointer was travelling so a card entered on the way past knows, and a
          card can only measure velocity it was there for.
        */
        <MomentumField className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((specimen, index) => (
            <Cell key={specimen.project.id} index={index} lift={false}>
              <MomentumItem className="h-full">
                <BrandSpecimen specimen={specimen} locale={locale} />
              </MomentumItem>
            </Cell>
          ))}

          {/*
            The way to the next brand, in the grid rather than only in the rail.

            It is last rather than first: a returning customer comes here to
            find a brand they already made, and putting the empty frame in the
            first cell puts the thing they are not looking for where their eye
            lands. It carries the price and the duration because this control
            spends real money, and PRODUCT.md is explicit that anything which
            can spend credits says so at the control that spends them.

            Only shown on an unfiltered list: in a set of search results it is
            not one of the results, and the card that looks like a result and is
            not is the oldest trick in a bad grid.
          */}
          {!needle && (
            <Link
              href="/onboarding"
              className="group flex min-h-[15rem] flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-line-strong bg-elevated/60 p-6 text-center transition-colors hover:border-brand/40 hover:bg-elevated"
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface text-accent shadow-[var(--shadow-soft),var(--lit-inset)] transition-transform duration-200 group-hover:scale-105">
                <Plus className="size-[1.15rem]" />
              </span>
              <span className="text-sm font-semibold text-fg">{t('emptyCta')}</span>
              <span className="font-mono text-xs text-fg-muted tabular-nums">
                {t('newBrandCost', { credits: BRAND_COST })}
              </span>
            </Link>
          )}
        </MomentumField>
      )}
    </div>
  )
}

/** Same shapes as the specimens it stands in for, so nothing jumps on arrival. */
function ProjectsSkeleton({ label }: { label: string }) {
  return (
    /*
      Named for assistive technology, which the shimmer alone never was — and
      under `prefers-reduced-motion` the shimmer is gone entirely, so without
      this the loading state is three silent grey boxes.
    */
    <div role="status" aria-label={label} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-64 flex-col overflow-hidden rounded-panel ring-1 ring-line"
        >
          <div className="flex-1 bg-elevated shimmer-surface" />
          <div className="space-y-2 p-6">
            <div className="h-5 w-2/3 rounded bg-elevated shimmer-surface" />
            <div className="h-4 w-1/2 rounded bg-elevated shimmer-surface" />
          </div>
          <div className="h-2.5 bg-elevated shimmer-surface" />
        </div>
      ))}
    </div>
  )
}
