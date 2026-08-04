'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from '@/i18n/navigation'
import { deleteProject } from '@/server/actions/projects'

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const t = useTranslations('Projects')
  const tc = useTranslations('Common')
  const router = useRouter()

  const [asking, setAsking] = useState(false)

  const { execute, isPending } = useAction(deleteProject, {
    onSuccess: () => router.push('/dashboard/projects'),
    onError: () => setAsking(false),
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
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={tc('delete')}
        title={tc('delete')}
        disabled={isPending}
        className="text-fg-muted hover:text-danger"
        onClick={() => setAsking(true)}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>

      {/*
        The dialog stays mounted while the delete runs, so the confirm button
        can show it working. Closing on click would leave the customer looking
        at an unchanged page wondering whether anything happened.
      */}
      <ConfirmDialog
        open={asking}
        pending={isPending}
        onClose={() => setAsking(false)}
        onConfirm={() => execute({ id: projectId })}
        title={t('deleteTitle')}
        body={t('deleteConfirm')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        destructive
      />
    </>
  )
}
