'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Monitor,
  MousePointerClick,
  Palette,
  Pencil,
  Plus,
  Redo2,
  Smartphone,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import {
  BlockRenderer,
  claimImages,
  fontHref,
  registerStyle,
  resolveTheme,
  type SiteImages,
} from '@/components/blocks/block-renderer'
import { SiteFooter, SiteHeader } from '@/components/blocks/site-chrome'
import type { RegisterName } from '@/lib/register'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedButton, SegmentedControl } from '@/components/ui/segmented-control'
import { Sheet } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import {
  BLOCK_TYPES,
  isBlank,
  blockKey,
  createBlock,
  PAGE_KEYS,
  type Block,
  type PageKey,
  type Pages,
  type Theme,
} from '@/lib/blocks'
import { updateWebsiteContent } from '@/server/actions/website'
import { PublishPanel } from './publish-panel'

const MAX_HISTORY = 50

/**
 * Reading order for a section's fields.
 *
 * `Object.entries` walks the stored JSON, whose key order is whatever the
 * generator happened to write — which put "Body text" above "Heading" on a text
 * section. Fields are shown in the order somebody reads them on the page.
 */
/** What a list's controls are called when a section has no words of its own. */
const fallbackWord = {
  itemLabels: 'itemNumber',
  itemAdd: 'addItem',
  itemRemove: 'removeItem',
} as const

/**
 * One line, once, per browser.
 *
 * Read through `useSyncExternalStore` rather than an effect: localStorage does
 * not exist on the server, and the server must render the same thing the client
 * does on its first pass. `true` on the server means the strip is absent until
 * the browser says otherwise, which is the honest direction to be wrong in — a
 * line that appears is better than one that flashes and vanishes.
 */
const INTRO_SEEN = 'brandora.builder.intro'
const INTRO_EVENT = 'brandora:intro-seen'

function subscribeToIntro(onChange: () => void) {
  window.addEventListener(INTRO_EVENT, onChange)
  return () => window.removeEventListener(INTRO_EVENT, onChange)
}

function dismissIntro() {
  window.localStorage.setItem(INTRO_SEEN, '1')
  window.dispatchEvent(new Event(INTRO_EVENT))
}

const FIELD_ORDER = [
  'title',
  'subtitle',
  'heading',
  'quote',
  'attribution',
  'body',
  'cta',
  'ctaHref',
  'email',
  'phone',
  'note',
]

/**
 * The website editor.
 *
 * Rebuilt against the design system after a review found it was the one surface
 * in the product that could not be operated at all without a mouse: a section
 * was selected by clicking a bare `<div>`, and selecting is the only route to
 * the inspector. Below 1280px it was worse than unusable — the library and the
 * inspector were display-hidden while delete and reorder stayed, so a phone
 * could destroy sections but not create or edit them.
 *
 * Three things changed structurally. Selection is a real control. The panels
 * become sheets rather than disappearing. And the editor says whose site it is,
 * with a way back to the brand it belongs to — it used to render no heading at
 * all, so its accessible outline began with the fixture site's own "About us".
 */
export function Builder({
  projectId,
  projectName,
  initialPages,
  publishedPages,
  publishedTheme,
  initialTheme,
  brandTheme,
  register,
  language,
  logoFileId,
  images,
  year,
  initialSubdomain,
  initialCustomDomain,
  isPublished,
  canPublish,
  planAllowsPublish,
  canUseCustomDomain,
  atDomainLimit,
}: {
  projectId: string
  projectName: string
  initialPages: Pages
  /** What visitors are getting. Null until the site has been online once. */
  publishedPages: Pages | null
  publishedTheme: Theme | null
  /** Overrides only — and what autosave writes back. */
  initialTheme: Theme
  /** The generated identity the published site is set in. */
  brandTheme: Theme
  /** The brand's bearing, the same one the published site resolves. */
  register: RegisterName
  /** The brand's language, which is what its nav is written in. */
  language: 'en' | 'ar'
  /** The transparent logo, when the customer has bought a kit. */
  logoFileId: string | null
  /** The project's own pictures, exactly as the published site resolves them. */
  images: SiteImages
  /** Read on the server, so the canvas and the published footer cannot differ. */
  year: number
  initialSubdomain: string | null
  initialCustomDomain: string | null
  isPublished: boolean
  /** The plan sells it *and* this member may do it. */
  canPublish: boolean
  /** Which of the two is missing, so the panel can say which. */
  planAllowsPublish: boolean
  canUseCustomDomain: boolean
  atDomainLimit: boolean
}) {
  const t = useTranslations('Builder')

  const [pages, setPages] = useState<Pages>(initialPages)
  const [page, setPage] = useState<PageKey>('home')
  /* Open on the first section rather than on an empty column — and decided
     here and at the page tabs rather than in an effect, so nothing reselects
     mid-typing and steals focus out of the field being edited. */
  const [selected, setSelected] = useState<number | null>(
    initialPages.home?.length ? 0 : null,
  )
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [dirty, setDirty] = useState(false)
  const [sheet, setSheet] = useState<'library' | 'inspector' | 'style' | null>(null)

  /*
   * The colours and faces the customer has overridden, if any.
   *
   * Held in state rather than read from the prop, which is what made the
   * palette unchangeable: autosave has always sent a `theme`, and it has always
   * sent back the same frozen value it was given. Empty for every project that
   * has never overridden anything — the brand's own identity is underneath.
   */
  const [themeOverrides, setThemeOverrides] = useState<Theme>(initialTheme)

  // Snapshots of the whole document. Cheap at this size, and it makes undo
  // correct across page switches rather than only within one page — and across
  // a colour change, which is the edit a customer is most likely to regret.
  /* The panel, not the heading inside it: passing a ref down as a prop trips
     the compiler's "cannot access refs during render" rule, and the panel is
     the only element this component owns. */
  const inspectorPanel = useRef<HTMLElement>(null)

  const past = useRef<{ pages: Pages; theme: Theme }[]>([])
  const future = useRef<{ pages: Pages; theme: Theme }[]>([])
  /* Mirrored into state because a ref does not re-render, which is why both
     buttons have always looked available and silently done nothing. */
  const [history, setHistory] = useState({ past: 0, future: 0 })

  // Overrides win over the generated identity, exactly as the site resolves it.
  const theme = resolveTheme({ ...brandTheme, ...themeOverrides })
  /* Memoised because it is a new array whenever the page has no blocks, and
     every callback below depends on it. */
  const blocks = useMemo(() => pages[page] ?? [], [pages, page])

  /* The same allocation the published page makes, by the same function — the
     canvas showed no photographs at all while production was photo-led. */
  const blockImages = useMemo(() => claimImages(blocks, images), [blocks, images])
  const selectedBlock = selected !== null ? blocks[selected] : undefined

  /*
   * A failed save used to say nothing at all.
   *
   * `useAction` had no `onError`, so a rejected write left "Unsaved changes" in
   * the header for as long as the customer kept working — the same words as a
   * pending save — and the autosave loop does not retry on its own. A field one
   * character over its limit, a session that expired, a member editing a
   * project they no longer belong to: all of them looked exactly like a save
   * that had not happened yet, and the work was lost on the next reload with
   * the beforeunload warning as the only clue.
   */
  const [saveError, setSaveError] = useState<string | null>(null)

  const { execute: save, isPending: saving } = useAction(updateWebsiteContent, {
    onSuccess: () => {
      setDirty(false)
      setSaveError(null)
    },
    /* The server's own words when it has any — `handleServerError` returns the
       message of an expected failure, which is written for a person — and the
       generic line only when the failure was a validation one, where the
       details name Zod paths nobody outside this file can read. */
    onError: ({ error }) => setSaveError(error.serverError ?? t('saveFailed')),
  })

  const commit = useCallback(
    (next: { pages?: Pages; theme?: Theme }) => {
      past.current = [...past.current.slice(-MAX_HISTORY + 1), { pages, theme: themeOverrides }]
      future.current = []
      setHistory({ past: past.current.length, future: 0 })
      if (next.pages) setPages(next.pages)
      if (next.theme) setThemeOverrides(next.theme)
      setDirty(true)
    },
    [pages, themeOverrides],
  )

  const setBlocks = useCallback(
    (next: Block[]) => commit({ pages: { ...pages, [page]: next } }),
    [commit, pages, page],
  )

  /** One colour or face at a time, each its own undo step. */
  const setThemeKey = useCallback(
    (key: keyof Theme, value: string) => commit({ theme: { ...themeOverrides, [key]: value } }),
    [commit, themeOverrides],
  )

  const undo = useCallback(() => {
    const previous = past.current.pop()
    if (!previous) return
    future.current = [{ pages, theme: themeOverrides }, ...future.current]
    setHistory({ past: past.current.length, future: future.current.length })
    setPages(previous.pages)
    setThemeOverrides(previous.theme)
    setDirty(true)
    setSelected(null)
  }, [pages, themeOverrides])

  const redo = useCallback(() => {
    const [next, ...rest] = future.current
    if (!next) return
    past.current = [...past.current, { pages, theme: themeOverrides }]
    future.current = rest
    setHistory({ past: past.current.length, future: rest.length })
    setPages(next.pages)
    setThemeOverrides(next.theme)
    setDirty(true)
    setSelected(null)
  }, [pages, themeOverrides])

  /** Reordering without a pointer, and without a drag anyone has to discover. */
  const move = useCallback(
    (from: number, direction: -1 | 1) => {
      const to = from + direction
      if (to < 0 || to >= blocks.length) return
      setBlocks(arrayMove(blocks, from, to))
      setSelected(to)
    },
    [blocks, setBlocks],
  )

  const addBlock = useCallback(
    (type: (typeof BLOCK_TYPES)[number]) => {
      setBlocks([...blocks, createBlock(type)])
      setSelected(blocks.length)
      setSheet(null)
    },
    [blocks, setBlocks],
  )

  /*
   * Deleting a section asks first.
   *
   * It used to go on a single press of a small red circle sitting two pixels
   * from the grip people drag with — less friction than deleting a draft
   * project, which has always asked. Undo covers it, but only if the customer
   * knows undo exists and notices in time.
   */
  const [removing, setRemoving] = useState<number | null>(null)

  const introSeen = useSyncExternalStore(
    subscribeToIntro,
    () => window.localStorage.getItem(INTRO_SEEN) === '1',
    () => true,
  )


  const removeSelected = useCallback(
    (index: number) => {
      setBlocks(blocks.filter((_, i) => i !== index))
      setSelected(null)
      setSheet(null)
      setRemoving(null)
    },
    [blocks, setBlocks, setRemoving],
  )

  // Autosave rather than relying on the user to press Save. The 1.5s debounce
  // keeps a burst of typing to a single write.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => save({ projectId, pages, theme: themeOverrides }), 1500)
    return () => clearTimeout(timer)
  }, [dirty, pages, projectId, save, themeOverrides])

  // Warn before losing edits that have not been flushed yet.
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  /*
   * Which pages differ from what visitors are getting.
   *
   * Compared per page rather than counted: "changes on Home and Contact" is
   * something a person can act on, and a number is not. A live site whose
   * published copy is missing — which cannot happen after the backfill — is
   * treated as having everything waiting rather than nothing.
   */
  const [live, setLive] = useState<{ pages: Pages | null; theme: Theme | null }>({
    pages: publishedPages,
    theme: publishedTheme,
  })
  const [onlineState, setOnlineState] = useState({ published: isPublished })

  const changedPages = useMemo(() => {
    if (!live.pages) return []
    return PAGE_KEYS.filter(
      (key) => JSON.stringify(pages[key] ?? []) !== JSON.stringify(live.pages?.[key] ?? []),
    )
  }, [pages, live.pages])

  const styleChanged = useMemo(
    () => JSON.stringify(themeOverrides) !== JSON.stringify(live.theme ?? {}),
    [themeOverrides, live.theme],
  )

  const waiting = changedPages.length > 0 || styleChanged

  /* Two pages named, then counted — a list of seven is not a sentence. */
  const changedList = useMemo(() => {
    const names = changedPages.map((key) => t(`pages.${key}`))
    if (styleChanged && names.length === 0) return t('theColours')
    if (names.length <= 2) return names.join(t('and'))
    return t('andOthers', { first: names.slice(0, 2).join(t('and')), count: names.length - 2 })
  }, [changedPages, styleChanged, t])

  /*
   * Selecting a section takes you to its fields.
   *
   * The inspector is after the canvas in the document, so from the select
   * button a keyboard user tabbed through that section's own controls and then
   * every remaining section's three controls — about thirty stops on a full
   * page — before reaching the field they had just opened. Selection has
   * exactly one purpose, so it moves focus, and a screen reader announces the
   * section's name on arrival.
   */
  useEffect(() => {
    if (selected === null) return
    inspectorPanel.current?.querySelector<HTMLElement>('[data-inspector-title]')?.focus()
  }, [selected])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = blocks.findIndex((_, i) => blockKey(i) === active.id)
    const to = blocks.findIndex((_, i) => blockKey(i) === over.id)
    if (from === -1 || to === -1) return

    setBlocks(arrayMove(blocks, from, to))
    setSelected(to)
  }

  /**
   * The site's own colours and faces, always on screen.
   *
   * The column this sits in showed one grey sentence — "Select a section to
   * edit it." — for as long as nothing was selected, which is a quarter of a
   * 1440px screen doing nothing. And nothing anywhere in the editor showed the
   * customer their own palette, let alone let them change it, though the schema
   * and the save action have both accepted a theme since the day they shipped.
   *
   * A native colour input beside a hex field: the platform owns the picker, it
   * works from a keyboard, and a customer holding a brand hex on a piece of
   * paper can type it. The typefaces are shown and not editable — a family name
   * that is not a Google Font renders as the fallback with nothing to say it
   * failed, and a real font picker is a curated list, which is other work.
   */
  const styles = (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
        {t('siteStyle')}
      </p>

      {(
        [
          ['primaryColor', 'primary'],
          ['secondaryColor', 'secondary'],
          ['backgroundColor', 'background'],
          ['textColor', 'text'],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={t(`colors.${label}`)}>
          <div className="flex items-center gap-2">
            {/*
              A raw input rather than the Input primitive: both controls sit in
              one Field and the primitive claims the Field's id, so the two would
              fight over the label. The swatch keeps the 44px target the rest of
              the editor holds to.
            */}
            <input
              type="color"
              value={theme[key]}
              aria-label={t(`colors.${label}`)}
              onChange={(event) => setThemeKey(key, event.target.value)}
              className="size-11 shrink-0 cursor-pointer rounded-control border border-line bg-transparent p-1"
            />
            <Input
              value={theme[key]}
              onChange={(event) => setThemeKey(key, event.target.value)}
              className="font-mono uppercase"
            />
          </div>
        </Field>
      ))}

      <div className="space-y-2 border-t border-line pt-4">
        {(
          [
            ['fontHeading', t('typeHeading')],
            ['fontBody', t('typeBody')],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-fg-muted">{label}</span>
            {/* Set in the face itself — the name alone means nothing to most
                people, and the specimen is the whole point. */}
            <span
              className="truncate text-sm text-fg"
              style={{ fontFamily: `'${theme[key]}', sans-serif` }}
            >
              Aa — {theme[key]}
            </span>
          </div>
        ))}
      </div>

      {/* The only route back for someone who has broken their colours.
          `checkedSiteColors` keeps text legible whatever they choose, but it
          cannot restore the brand. */}
      {Object.keys(themeOverrides).length > 0 && (
        <Button variant="secondary" size="sm" className="w-full" onClick={() => commit({ theme: {} })}>
          {t('resetTheme')}
        </Button>
      )}
    </div>
  )

  const inspector = (inSheet: boolean) => selectedBlock ? (
    <Inspector
      block={selectedBlock}
      showTitle={!inSheet}
      index={selected as number}
      count={blocks.length}
      onChange={(next) =>
        setBlocks(blocks.map((block, i) => (i === selected ? next : block)))
      }
      onMove={(direction) => move(selected as number, direction)}
      onDelete={() => setRemoving(selected)}
    />
  ) : null

  const library = (
    <div className="space-y-1">
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => addBlock(type)}
          className="flex min-h-11 w-full items-center gap-2 rounded-control px-2.5 text-start text-sm text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
        >
          <Plus className="size-3.5 shrink-0" />
          {t(`blocks.${type}`)}
        </button>
      ))}
    </div>
  )

  /*
   * The brand's own typefaces.
   *
   * Linked in the published site's layout and nowhere else, so every block in
   * this canvas fell back to the app's Jakarta while production drew the same
   * words in the brand's face. React hoists and dedupes this into <head>.
   */
  const fonts = fontHref(theme)

  return (
    <div className="flex h-dvh flex-col">
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      <header className="shrink-0 border-b border-line">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          {/*
            Whose site this is, and the way back to it. The editor used to carry
            neither: no heading, no mark, no link — you reached the project page
            again through Projects and finding it a second time.
          */}
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex min-h-11 items-center gap-2 rounded-control px-2 text-sm text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            <span className="sr-only sm:not-sr-only">{t('backToBrand')}</span>
          </Link>

          {/* The space is a real text node: without it the accessible name
              read "Fixture CoWebsite", since margin is not a word break. */}
          <h1 className="min-w-0 truncate font-display text-sm font-semibold">
            {projectName}{' '}
            <span className="font-sans text-xs font-normal text-fg-muted">{t('website')}</span>
          </h1>

          <div className="ms-auto flex items-center gap-2">
            {/* Disabled when there is nothing to undo. They were always
                available and did nothing, which teaches a person that the
                control is broken rather than that the history is empty. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={history.past === 0}
              aria-label={t('undo')}
            >
              <Undo2 />
              <span className="hidden xl:inline">{t('undo')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={history.future === 0}
              aria-label={t('redo')}
            >
              <Redo2 />
              <span className="hidden xl:inline">{t('redo')}</span>
            </Button>

            <SegmentedControl label={t('preview')} className="hidden sm:inline-flex">
              <SegmentedButton
                active={device === 'desktop'}
                onClick={() => setDevice('desktop')}
                label={t('desktop')}
              >
                <Monitor className="size-4" />
              </SegmentedButton>
              <SegmentedButton
                active={device === 'mobile'}
                onClick={() => setDevice('mobile')}
                label={t('mobile')}
              >
                <Smartphone className="size-4" />
              </SegmentedButton>
            </SegmentedControl>

            {/*
              Autosave state, announced. It changed silently before, which is
              the one thing an autosaving editor must not do: the only signal
              that work is safe was eight pixels of grey text.
            */}
            <span
              role="status"
              aria-live="polite"
              className={cn('text-xs', saveError ? 'text-danger' : 'text-fg-muted')}
              data-testid="save-status"
              data-state={saveError ? 'error' : saving ? 'saving' : dirty ? 'dirty' : 'saved'}
            >
              {saveError ?? (saving ? t('saving') : dirty ? t('unsaved') : t('saved'))}
            </span>

            {/* Retrying is the customer's call, not a loop's: a save that failed
                on a field that is too long will fail again every 1.5 seconds
                until the field is fixed. */}
            {saveError && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save({ projectId, pages, theme: themeOverrides })}
              >
                {t('retry')}
              </Button>
            )}

            {/*
              What is true about the site itself, which is a different question
              from whether the last keystroke reached the database. The dot
              carries the word rather than replacing it.
            */}
            <span className="hidden items-center gap-2 text-xs text-fg-muted sm:inline-flex">
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  !onlineState.published
                    ? 'bg-fg-muted/50'
                    : waiting
                      ? 'bg-warning'
                      : 'bg-success',
                )}
              />
              <span data-testid="online-status">
                {!onlineState.published
                  ? t('notOnline')
                  : waiting
                    ? t('changesWaiting', { pages: changedList })
                    : t('onlineAndCurrent')}
              </span>
            </span>

            <PublishPanel
              projectId={projectId}
              initialSubdomain={initialSubdomain}
              initialCustomDomain={initialCustomDomain}
              isPublished={onlineState.published}
              canPublish={canPublish}
              planAllowsPublish={planAllowsPublish}
              canUseCustomDomain={canUseCustomDomain}
              atDomainLimit={atDomainLimit}
              waiting={waiting}
              changedPages={changedPages.map((key) => t(`pages.${key}`))}
              onPublished={() => {
                setOnlineState({ published: true })
                setLive({ pages, theme: themeOverrides })
              }}
              onTakenOffline={() => setOnlineState({ published: false })}
              onDiscarded={(restored, theme) => {
                setPages(restored)
                setThemeOverrides(theme)
                setSelected(null)
                past.current = []
                future.current = []
                setHistory({ past: 0, future: 0 })
              }}
            />
          </div>
        </div>

        <nav
          aria-label={t('pagesLabel')}
          data-testid="page-tabs"
          className="flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* The pages this site actually has, in the vocabulary's order. */}
          {PAGE_KEYS.filter((key) => pages[key]).map((key) => (
            <button
              key={key}
              onClick={() => {
                setPage(key)
                setSelected(pages[key]?.length ? 0 : null)
              }}
              aria-current={key === page ? 'page' : undefined}
              className={cn(
                'min-h-11 shrink-0 rounded-control px-3 text-sm capitalize transition-colors',
                key === page
                  ? 'bg-elevated font-medium text-fg'
                  : 'text-fg-secondary hover:text-fg',
              )}
            >
              {t(`pages.${key}`)}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden w-48 shrink-0 overflow-y-auto border-e border-line p-3 xl:block"
          data-testid="block-library"
        >
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {t('addSection')}
          </p>
          {library}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-elevated/30 p-4 pb-24 xl:pb-4" data-testid="canvas">
          {/*
            Three sentences, once: what the screen is, how to act on it, and
            that it is safe. Dismissed into localStorage because it is a
            preference, not data — and the alternative, a tour, needs a popover
            this app has deliberately never had.
          */}
          {!introSeen && (
            <div className="mx-auto mb-4 flex max-w-4xl items-start gap-4 rounded-card border border-line bg-surface p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t('firstRunTitle')}</p>
                <p className="mt-1 text-sm text-fg-secondary">{t('firstRunBody')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ms-auto shrink-0"
                onClick={dismissIntro}
              >
                {t('firstRunDismiss')}
              </Button>
            </div>
          )}

          {/*
            The canvas takes the brand's own ground, as the published page does.
            Hardcoded white, a dark-ground brand previewed at 1.18:1 here and
            shipped at 15.4:1 — the file's promise that the preview cannot drift
            from production was true of the blocks and false of what sits behind
            them.
          */}
          {/* The register's scale, rhythm and corners, so the canvas is set the
              way the published page is rather than in the renderer's defaults. */}
          <div
            style={{ ...registerStyle(register), backgroundColor: theme.safe.paper }}
            className={cn(
              'mx-auto overflow-hidden rounded-card border border-line transition-all',
              device === 'mobile' ? 'max-w-sm' : 'max-w-4xl',
            )}
          >
            {/* The header and footer the published page draws, so the canvas
                is a picture of a website rather than a stack of sections. The
                nav marks the page being edited, and lists only the pages that
                have something on them — the same rule the live site follows. */}
            <SiteHeader
              name={projectName}
              logoUrl={logoFileId ? `/api/site-image/${logoFileId}` : undefined}
              nav={PAGE_KEYS.filter((key) => pages[key]?.length)}
              active={page}
              theme={theme}
              register={register}
              language={language}
              preview
            />

            {blocks.length === 0 ? (
              <div className="p-12 text-center" style={{ color: theme.safe.muted }}>
                <p className="text-sm">{t('emptyPage')}</p>
                {/* The fact nothing said out loud: an empty page silently
                    disappears from the site's own menu. */}
                <p className="mt-1 text-sm">{t('emptyPageNotInMenu')}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-5"
                  onClick={() => setSheet('library')}
                >
                  <Plus />
                  {t('addSection')}
                </Button>
              </div>
            ) : (
              <DndContext
                /*
                 * Without an explicit id, dnd-kit numbers its descriptions from
                 * a module counter that differs between the server render and
                 * the client one — which was the only console error in the
                 * product, on every load of this page.
                 */
                id="builder-blocks"
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={blocks.map((_, i) => blockKey(i))}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block, index) => (
                    <SortableBlock
                      key={blockKey(index)}
                      id={blockKey(index)}
                      name={t(`blocks.${block.type}`)}
                      selected={selected === index}
                      onSelect={() => setSelected(index)}
                    >
                      {/* A section with nothing in it renders as a tall
                          nothing — and the rule that it will not be published
                          was a secret the renderer kept. Said in the site's own
                          checked colours, so it stays inside the preview. */}
                      {isBlank(block) ? (
                        <div
                          className="flex min-h-32 items-center justify-center border-y border-dashed px-6 py-10 text-center"
                          style={{ borderColor: theme.safe.line }}
                        >
                          <span
                            className="text-sm"
                            style={{
                              color: theme.safe.muted,
                              fontFamily: `'${theme.fontBody}', sans-serif`,
                            }}
                          >
                            {t('blankSection', { section: t(`blocks.${block.type}`) })}
                          </span>
                        </div>
                      ) : (
                        <BlockRenderer
                          block={block}
                          index={index}
                          images={blockImages[index]}
                          theme={theme}
                          register={register}
                          preview
                        />
                      )}
                    </SortableBlock>
                  ))}
                </SortableContext>
              </DndContext>
            )}

            <SiteFooter name={projectName} theme={theme} year={year} />
          </div>
        </main>

        <aside
          ref={inspectorPanel}
          className="hidden w-80 shrink-0 overflow-y-auto border-s border-line p-4 xl:block"
          data-testid="inspector"
        >
          {inspector(false) ?? (
            <EmptyState
              className="mb-6 py-6"
              icon={<MousePointerClick className="size-5" />}
              title={t('pickSectionTitle')}
              body={t('pickSectionBody')}
            />
          )}
          <div className={cn(selectedBlock && 'mt-6 border-t border-line pt-6')}>{styles}</div>
        </aside>
      </div>

      {/*
        Below the width that fits three columns, the panels become sheets rather
        than vanishing. Every edit available at 1440px is available here; one
        panel at a time is the only difference.
      */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-line bg-surface/95 px-4 py-2.5 backdrop-blur xl:hidden">
        <Button
          variant="secondary"
          size="sm"
          className="min-w-0 flex-1"
          data-testid="edit-section"
          disabled={!selectedBlock}
          onClick={() => setSheet('inspector')}
        >
          <Pencil />
          {/* The Arabic block names are long and this bar now carries five
              controls at 390px. */}
          <span className="min-w-0 truncate">
            {selectedBlock ? t(`blocks.${selectedBlock.type}`) : t('editSection')}
          </span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          data-testid="add-section"
          onClick={() => setSheet('library')}
        >
          <Plus />
          {t('add')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          data-testid="site-style"
          aria-label={t('siteStyle')}
          onClick={() => setSheet('style')}
        >
          <Palette />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('moveUp')}
          disabled={selected === null || selected === 0}
          onClick={() => selected !== null && move(selected, -1)}
        >
          <ChevronUp />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('moveDown')}
          disabled={selected === null || selected === blocks.length - 1}
          onClick={() => selected !== null && move(selected, 1)}
        >
          <ChevronDown />
        </Button>
      </div>

      <Sheet
        open={sheet === 'library'}
        onClose={() => setSheet(null)}
        title={t('addSection')}
      >
        {library}
      </Sheet>

      <Sheet
        open={sheet === 'inspector'}
        onClose={() => setSheet(null)}
        title={selectedBlock ? t(`blocks.${selectedBlock.type}`) : t('editSection')}
      >
        {/* The sheet's own header already names the section; repeating it
            inside would be the title twice, forty pixels apart. */}
        {inspector(true)}
      </Sheet>

      {/* Named in the customer's own vocabulary, because "Remove section" is
          not what they are about to lose. */}
      <ConfirmDialog
        open={removing !== null}
        destructive
        onClose={() => setRemoving(null)}
        onConfirm={() => removing !== null && removeSelected(removing)}
        title={t('removeTitle', {
          section: removing !== null && blocks[removing] ? t(`blocks.${blocks[removing].type}`) : '',
        })}
        body={t('removeBody')}
        confirmLabel={t('removeConfirm')}
        cancelLabel={t('keepIt')}
      />

      <Sheet open={sheet === 'style'} onClose={() => setSheet(null)} title={t('siteStyle')}>
        {styles}
      </Sheet>
    </div>
  )
}

function SortableBlock({
  id,
  name,
  selected,
  onSelect,
  children,
}: {
  id: string
  name: string
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  const t = useTranslations('Builder')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      data-testid="canvas-block"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative',
        selected && 'ring-2 ring-inset ring-brand',
        isDragging && 'opacity-50',
      )}
    >
      {/*
        Selection is a button covering the section, rather than a click handler
        on the section itself. A rendered block contains its own headings and
        links, so it cannot legally be a button — and a `<div onClick>` is
        reachable by exactly one input device. This is keyboard-operable, states
        what it selects, and reports whether it is the current selection.
      */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={t('selectSection', { section: name })}
        className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      />

      {/*
        One cluster rather than two loose circles, and it carries the section's
        name — which was the only thing in the canvas that never said what you
        were looking at.
        
        In the app's own tokens with a border and a shadow, because these sit on
        the customer's page: a white grip on white paper was invisible, and a
        red delete circle was the loudest object on a preview of somebody's
        website. The danger colour arrives on intent now, not at rest.

        Visible on hover *and* on focus — they were hover-only, so a keyboard
        user tabbed into controls they could not see — and always while the
        section is selected.
      */}
      <div
        className={cn(
          'absolute end-2 top-2 z-20 flex items-center gap-0.5 rounded-control border border-line bg-surface/95 p-0.5 shadow-lg backdrop-blur',
          'opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100',
          selected && 'opacity-100',
        )}
      >
        <span className="max-w-32 truncate px-2 text-xs text-fg-muted">{name}</span>
        {/* "Edit" as a word: the section was clickable through an invisible
            overlay, and nothing on the page said so. */}
        <button
          onClick={onSelect}
          className="rounded-control px-2 py-1.5 text-xs font-medium text-fg-secondary hover:bg-elevated hover:text-fg"
        >
          {t('editThis')}
        </button>
        {/* The bin is gone from here. A destructive control does not belong two
            pixels from the grip a customer drags with; it lives in the panel
            where the section is being edited, with its word visible. */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-control p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg"
          aria-label={t('reorderSection', { section: name })}
        >
          <GripVertical className="size-3.5" />
        </button>
      </div>

      {children}
    </div>
  )
}

/**
 * Field editor for the selected block.
 *
 * Driven by the block's own shape rather than a per-type form, so adding a
 * block type to the schema does not require a matching editor to be written.
 * The labels are looked up rather than derived: the schema's keys are
 * `ctaHref` and `subtitle`, and printing those capitalised put an engineer's
 * vocabulary in front of a customer editing their own website.
 */
function Inspector({
  block,
  index,
  count,
  showTitle,
  onChange,
  onMove,
  onDelete,
}: {
  block: Block
  index: number
  count: number
  showTitle: boolean
  onChange: (next: Block) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const t = useTranslations('Builder')

  const set = (key: string, value: unknown) => onChange({ ...block, [key]: value } as Block)

  const listKey = 'items' in block ? 'items' : 'services' in block ? 'services' : null

  /*
   * The same two stored fields mean different things in different sections.
   *
   * `title` and `body` are what the schema calls them, and the editor said so:
   * an opening-hours section asked for a "Title" and "Body text" when it wanted
   * a day and its hours, and a question and its answer got the same two words.
   * The stored shape stays; only what the customer is asked changes.
   */
  const itemWord = (field: 'title' | 'body') =>
    t.has(`itemFields.${block.type}.${field}`)
      ? t(`itemFields.${block.type}.${field}`)
      : t(`fields.${field}`)

  const itemHint = (field: 'title' | 'body') =>
    t.has(`itemHints.${block.type}.${field}`)
      ? t(`itemHints.${block.type}.${field}`)
      : t(`hints.${field}`)

  const listWord = (key: 'itemLabels' | 'itemAdd' | 'itemRemove', values?: Record<string, number>) =>
    t.has(`${key}.${block.type}`) ? t(`${key}.${block.type}`, values) : t(fallbackWord[key], values)

  /*
   * How many items this block may hold.
   *
   * A customer could edit the three items a block arrived with and nothing
   * else: no way to add a fourth service, no way to remove one they did not
   * offer. The ceilings are the ones `lib/blocks` enforces — offering a fourth
   * where the schema allows three would fail autosave, which until today failed
   * silently.
   */
  const MAX_ITEMS: Partial<Record<Block['type'], number>> = {
    features: 4,
    services: 4,
    faq: 8,
    hours: 7,
  }
  const max = MAX_ITEMS[block.type] ?? 4
  const list = (listKey ? (block as unknown as Record<string, unknown>)[listKey] : null) as
    | { title: string; body: string; price?: string }[]
    | null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {showTitle ? (
          <p
            data-inspector-title
            tabIndex={-1}
            className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted outline-none focus-visible:outline-2 focus-visible:outline-brand"
          >
            {t(`blocks.${block.type}`)}
          </p>
        ) : (
          <span />
        )}

        {/* Reordering that does not require a drag — the same move the grip
            makes, available to a keyboard and to a thumb. */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('moveUp')}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('moveDown')}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 />
            {t('remove')}
          </Button>
        </div>
      </div>

      {Object.entries(block)
        .filter(([key]) => !['type', 'items', 'services'].includes(key))
        .sort(([a], [b]) => FIELD_ORDER.indexOf(a) - FIELD_ORDER.indexOf(b))
        .map(([key, value]) => (
          <Field key={key} label={t(`fields.${key}`)}>
            {/* The guidance that used to be typed into the canvas as content.
                A placeholder cannot be published by being left alone. */}
            {typeof value === 'string' && value.length > 90 ? (
              <Textarea
                value={value}
                placeholder={t(`hints.${key}`)}
                onChange={(event) => set(key, event.target.value)}
              />
            ) : (
              <Input
                value={String(value ?? '')}
                placeholder={t(`hints.${key}`)}
                onChange={(event) => set(key, event.target.value)}
              />
            )}
          </Field>
        ))}

      {list && listKey && (
        <div className="space-y-3 border-t border-line pt-4">
          {list.map((item, itemIndex) => (
            <div key={itemIndex} className="space-y-3 rounded-control border border-line p-3">
              {/* Its own title once there is one — the rule the project page
                  already follows for pages, for the same reason: "Item 3" is
                  the editor's word for a thing the customer has named. */}
              <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {item.title?.trim() || listWord('itemLabels', { number: itemIndex + 1 })}
              </p>
              <Field label={itemWord('title')}>
                <Input
                  value={item.title}
                  placeholder={itemHint('title')}
                  onChange={(event) =>
                    set(
                      listKey,
                      list.map((entry, i) =>
                        i === itemIndex ? { ...entry, title: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={itemWord('body')}>
                <Textarea
                  value={item.body}
                  placeholder={itemHint('body')}
                  className="min-h-20"
                  onChange={(event) =>
                    set(
                      listKey,
                      list.map((entry, i) =>
                        i === itemIndex ? { ...entry, body: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </Field>
              {'price' in (list[0] ?? {}) && (
                <Field label={t('fields.price')}>
                  <Input
                    value={item.price ?? ''}
                    placeholder={t('hints.price')}
                    onChange={(event) =>
                      set(
                        listKey,
                        list.map((entry, i) =>
                          i === itemIndex ? { ...entry, price: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </Field>
              )}

              {/* The last item stays: a features block with no features is a
                  heading with nothing under it, and the schema refuses it. */}
              {list.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set(listKey, list.filter((_, i) => i !== itemIndex))}
                >
                  <Trash2 className="size-3.5" />
                  {listWord('itemRemove')}
                </Button>
              )}
            </div>
          ))}

          {list.length < max && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => set(listKey, [...list, { title: '', body: '' }])}
            >
              <Plus className="size-4" />
              {listWord('itemAdd')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
