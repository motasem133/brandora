import { serve } from 'inngest/next'

import { inngest } from '@/server/inngest/client'
import { generateBrand, releaseStuckHolds } from '@/server/inngest/generate'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrand, releaseStuckHolds],
})
