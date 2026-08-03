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
import { GripVertical, Monitor, Plus, Redo2, Smartphone, Trash2, Undo2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BlockRenderer, resolveTheme } from '@/components/blocks/block-renderer'
import { Button } from '@/components/ui/button'
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

export function Builder({
  projectId,
  initialPages,
  initialTheme,
  initialSubdomain,
  initialCustomDomain,
  isPublished,
  canPublish,
  canUseCustomDomain,
}: {
  projectId: string
  initialPages: Pages
  initialTheme: Theme
  initialSubdomain: string | null
  initialCustomDomain: string | null
  isPublished: boolean
  canPublish: boolean
  canUseCustomDomain: boolean
}) {
  const t = useTranslations('Builder')

  const [pages, setPages] = useState<Pages>(initialPages)
  const [page, setPage] = useState<PageKey>('home')
  const [selected, setSelected] = useState<number | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [dirty, setDirty] = useState(false)

  // Snapshots of the whole page map. Cheap at this size, and it makes undo
  // correct across page switches rather than only within one page.
  const past = useRef<Pages[]>([])
  const future = useRef<Pages[]>([])

  const theme = resolveTheme(initialTheme)
  const blocks = pages[page]

  const { execute: save, isPending: saving } = useAction(updateWebsiteContent, {
    onSuccess: () => setDirty(false),
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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1" data-testid="page-tabs">
          {PAGE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => {
                setPage(key)
                setSelected(null)
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm capitalize transition-colors',
                key === page ? 'bg-elevated font-medium text-fg' : 'text-fg-secondary hover:text-fg',
              )}
            >
              {t(`pages.${key}`)}
            </button>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={undo} aria-label={t('undo')}>
            <Undo2 />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} aria-label={t('redo')}>
            <Redo2 />
          </Button>

          <div className="flex rounded-lg border border-line">
            <button
              onClick={() => setDevice('desktop')}
              aria-label={t('desktop')}
              className={cn('px-2.5 py-2', device === 'desktop' && 'bg-elevated')}
            >
              <Monitor className="size-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              aria-label={t('mobile')}
              className={cn('px-2.5 py-2', device === 'mobile' && 'bg-elevated')}
            >
              <Smartphone className="size-4" />
            </button>
          </div>

          <span
            className="text-xs text-fg-muted"
            data-testid="save-status"
            data-state={saving ? 'saving' : dirty ? 'dirty' : 'saved'}
          >
            {saving ? t('saving') : dirty ? t('unsaved') : t('saved')}
          </span>

          <PublishPanel
            projectId={projectId}
            initialSubdomain={initialSubdomain}
            initialCustomDomain={initialCustomDomain}
            isPublished={isPublished}
            canPublish={canPublish}
            canUseCustomDomain={canUseCustomDomain}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden w-48 shrink-0 overflow-y-auto border-e border-line p-3 lg:block"
          data-testid="block-library"
        >
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
            {t('addSection')}
          </p>
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                setBlocks([...blocks, createBlock(type)])
                setSelected(blocks.length)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm text-fg-secondary hover:bg-elevated hover:text-fg"
            >
              <Plus className="size-3.5" />
              {t(`blocks.${type}`)}
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-elevated/30 p-4" data-testid="canvas">
          <div
            className={cn(
              'mx-auto overflow-hidden rounded-xl border border-line bg-white transition-all',
              device === 'mobile' ? 'max-w-sm' : 'max-w-4xl',
            )}
          >
            {blocks.length === 0 ? (
              <p className="p-16 text-center text-sm text-gray-500">{t('emptyPage')}</p>
            ) : (
              <DndContext
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
                      selected={selected === index}
                      onSelect={() => setSelected(index)}
                      onDelete={() => {
                        setBlocks(blocks.filter((_, i) => i !== index))
                        setSelected(null)
                      }}
                    >
                      <BlockRenderer block={block} theme={theme} />
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
          {selected !== null && blocks[selected] ? (
            <Inspector
              block={blocks[selected]}
              onChange={(next) =>
                setBlocks(blocks.map((block, i) => (i === selected ? next : block)))
              }
            />
          ) : (
            <p className="text-sm text-fg-muted">{t('selectPrompt')}</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function SortableBlock({
  id,
  selected,
  onSelect,
  onDelete,
  children,
}: {
  id: string
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      data-testid="canvas-block"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={cn(
        'group relative cursor-pointer',
        selected && 'ring-2 ring-inset ring-violet-500',
        isDragging && 'opacity-50',
      )}
    >
      <div className="absolute end-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-md bg-gray-900/80 p-1.5 text-white"
          aria-label="Reorder"
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          className="rounded-md bg-red-600/90 p-1.5 text-white"
          aria-label="Delete"
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
 */
function Inspector({ block, onChange }: { block: Block; onChange: (next: Block) => void }) {
  const t = useTranslations('Builder')

  const set = (key: string, value: unknown) => onChange({ ...block, [key]: value } as Block)

  const listKey = 'items' in block ? 'items' : 'services' in block ? 'services' : null
  const list = (listKey ? (block as unknown as Record<string, unknown>)[listKey] : null) as
    | { title: string; body: string; price?: string }[]
    | null

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {t(`blocks.${block.type}`)}
      </p>

      {Object.entries(block)
        .filter(([key]) => !['type', 'items', 'services'].includes(key))
        .map(([key, value]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs capitalize text-fg-secondary">{key}</span>
            {typeof value === 'string' && value.length > 90 ? (
              <textarea
                value={value}
                onChange={(event) => set(key, event.target.value)}
                className="min-h-28 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            ) : (
              <input
                value={String(value ?? '')}
                onChange={(event) => set(key, event.target.value)}
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none"
              />
            )}
          </label>
        ))}

      {list && listKey && (
        <div className="space-y-3 border-t border-line pt-3">
          {list.map((item, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-line p-3">
              <input
                value={item.title}
                onChange={(event) =>
                  set(
                    listKey,
                    list.map((entry, i) =>
                      i === index ? { ...entry, title: event.target.value } : entry,
                    ),
                  )
                }
                className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm focus:border-brand focus:outline-none"
              />
              <textarea
                value={item.body}
                onChange={(event) =>
                  set(
                    listKey,
                    list.map((entry, i) =>
                      i === index ? { ...entry, body: event.target.value } : entry,
                    ),
                  )
                }
                className="min-h-20 w-full rounded-md border border-line bg-surface px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
