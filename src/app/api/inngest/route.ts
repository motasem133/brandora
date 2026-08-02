import { serve } from 'inngest/next'

import { inngest } from '@/server/inngest/client'
import { generateBrand } from '@/server/inngest/generate'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrand],
})
