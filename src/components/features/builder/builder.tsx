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
  Pencil,
  Plus,
  Redo2,
  Smartphone,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockRenderer, registerStyle, resolveTheme } from '@/components/blocks/block-renderer'
import type { RegisterName } from '@/lib/register'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SegmentedButton, SegmentedControl } from '@/components/ui/segmented-control'
import { Sheet } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import {
  BLOCK_TYPES,
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
  initialTheme,
  brandTheme,
  register,
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
  /** Overrides only — and what autosave writes back. */
  initialTheme: Theme
  /** The generated identity the published site is set in. */
  brandTheme: Theme
  /** The brand's bearing, the same one the published site resolves. */
  register: RegisterName
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
  const [selected, setSelected] = useState<number | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [dirty, setDirty] = useState(false)
  const [sheet, setSheet] = useState<'library' | 'inspector' | null>(null)

  // Snapshots of the whole page map. Cheap at this size, and it makes undo
  // correct across page switches rather than only within one page.
  const past = useRef<Pages[]>([])
  const future = useRef<Pages[]>([])

  // Overrides win over the generated identity, exactly as the site resolves it.
  const theme = resolveTheme({ ...brandTheme, ...initialTheme })
  /* Memoised because it is a new array whenever the page has no blocks, and
     every callback below depends on it. */
  const blocks = useMemo(() => pages[page] ?? [], [pages, page])
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
    (next: Pages) => {
      past.current = [...past.current.slice(-MAX_HISTORY + 1), pages]
      future.current = []
      setPages(next)
      setDirty(true)
    },
    [pages],
  )

  const setBlocks = useCallback(
    (next: Block[]) => commit({ ...pages, [page]: next }),
    [commit, pages, page],
  )

  const undo = useCallback(() => {
    const previous = past.current.pop()
    if (!previous) return
    future.current = [pages, ...future.current]
    setPages(previous)
    setDirty(true)
    setSelected(null)
  }, [pages])

  const redo = useCallback(() => {
    const [next, ...rest] = future.current
    if (!next) return
    past.current = [...past.current, pages]
    future.current = rest
    setPages(next)
    setDirty(true)
    setSelected(null)
  }, [pages])

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

  const removeSelected = useCallback(() => {
    if (selected === null) return
    setBlocks(blocks.filter((_, index) => index !== selected))
    setSelected(null)
    setSheet(null)
  }, [blocks, selected, setBlocks])

  // Autosave rather than relying on the user to press Save. The 1.5s debounce
  // keeps a burst of typing to a single write.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => save({ projectId, pages, theme: initialTheme }), 1500)
    return () => clearTimeout(timer)
  }, [dirty, pages, projectId, save, initialTheme])

  // Warn before losing edits that have not been flushed yet.
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

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
      onDelete={removeSelected}
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

  return (
    <div className="flex h-dvh flex-col">
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
            <Button variant="ghost" size="icon" onClick={undo} aria-label={t('undo')}>
              <Undo2 />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} aria-label={t('redo')}>
              <Redo2 />
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
                onClick={() => save({ projectId, pages, theme: initialTheme })}
              >
                {t('retry')}
              </Button>
            )}

            <PublishPanel
              projectId={projectId}
              initialSubdomain={initialSubdomain}
              initialCustomDomain={initialCustomDomain}
              isPublished={isPublished}
              canPublish={canPublish}
              planAllowsPublish={planAllowsPublish}
              canUseCustomDomain={canUseCustomDomain}
              atDomainLimit={atDomainLimit}
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
                setSelected(null)
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
            {blocks.length === 0 ? (
              <p className="p-16 text-center text-sm text-fg-muted">{t('emptyPage')}</p>
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
                      onDelete={() => {
                        setBlocks(blocks.filter((_, i) => i !== index))
                        setSelected(null)
                      }}
                    >
                      <BlockRenderer block={block} theme={theme} register={register} preview />
                    </SortableBlock>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </main>

        <aside
          className="hidden w-80 shrink-0 overflow-y-auto border-s border-line p-4 xl:block"
          data-testid="inspector"
        >
          {inspector(false) ?? <p className="text-sm text-fg-muted">{t('selectPrompt')}</p>}
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
          className="flex-1"
          data-testid="edit-section"
          disabled={!selectedBlock}
          onClick={() => setSheet('inspector')}
        >
          <Pencil />
          {selectedBlock ? t(`blocks.${selectedBlock.type}`) : t('editSection')}
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
    </div>
  )
}

function SortableBlock({
  id,
  name,
  selected,
  onSelect,
  onDelete,
  children,
}: {
  id: string
  name: string
  selected: boolean
  onSelect: () => void
  onDelete: () => void
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
        Visible on hover *and* on focus. They were hover-only, so a keyboard
        user tabbed into controls they could not see.
      */}
      <div className="absolute end-2 top-2 z-20 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-control bg-fg/80 p-1.5 text-bg"
          aria-label={t('reorderSection', { section: name })}
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          className="rounded-control bg-danger/90 p-1.5 text-white"
          aria-label={t('deleteSection', { section: name })}
        >
          <Trash2 className="size-3.5" />
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
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
          <Button variant="ghost" size="icon" aria-label={t('delete')} onClick={onDelete}>
            <Trash2 />
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {t('itemNumber', { number: itemIndex + 1 })}
              </p>
              <Field label={t('fields.title')}>
                <Input
                  value={item.title}
                  placeholder={t('hints.title')}
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
              <Field label={t('fields.body')}>
                <Textarea
                  value={item.body}
                  placeholder={t('hints.body')}
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
                  {t('removeItem')}
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
              {t('addItem')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
