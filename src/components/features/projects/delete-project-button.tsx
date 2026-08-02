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

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm(t('deleteConfirm'))) execute({ id: projectId })
      }}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      {tc('delete')}
    </Button>
  )
}
