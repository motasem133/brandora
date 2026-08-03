'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { deleteProject } from '@/server/actions/projects'

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const t = useTranslations('Projects')
  const tc = useTranslations('Common')
  const router = useRouter()

  const { execute, isPending } = useAction(deleteProject, {
    onSuccess: () => router.push('/dashboard/projects'),
  })

  /*
   * Icon-only and quiet, deliberately.
   *
   * This was the only action in the project header, which made destroying the
   * brand the most prominent thing on a page whose actual job is handing the
   * brand over. It keeps its accessible name and its confirmation; it just
   * stops competing with the download.
   */
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={tc('delete')}
      title={tc('delete')}
      disabled={isPending}
      className="text-fg-muted hover:text-danger"
      onClick={() => {
        if (confirm(t('deleteConfirm'))) execute({ id: projectId })
      }}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  )
}
