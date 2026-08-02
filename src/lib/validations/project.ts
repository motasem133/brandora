import { z } from 'zod'

export const BRAND_STYLES = [
  'luxury',
  'modern',
  'playful',
  'minimal',
  'arabic',
  'corporate',
] as const

export const INDUSTRY_KEYS = [
  'technology',
  'food',
  'fashion',
  'health',
  'realEstate',
  'education',
  'finance',
  'beauty',
  'travel',
  'consulting',
  'retail',
  'creative',
] as const

/** Gulf-first, then the wider set. Value is the stored English name. */
export const COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Jordan',
  'Egypt',
  'Lebanon',
  'Morocco',
  'United Kingdom',
  'United States',
  'Germany',
  'France',
  'Turkey',
  'India',
  'Pakistan',
  'Other',
] as const

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #7c3aed')

/**
 * Shared by the onboarding form and the createProject action. Validating with
 * one schema on both sides is what keeps client and server in agreement.
 */
export const createProjectSchema = z.object({
  businessName: z.string().trim().max(60).optional().or(z.literal('')),
  industry: z.string().trim().min(2, 'Please choose or type an industry.').max(60),
  country: z.string().trim().min(2, 'Please select a country.').max(60),
  targetAudience: z
    .string()
    .trim()
    .min(10, 'Please add a little more detail (at least 10 characters).')
    .max(600),
  brandStyle: z.enum(BRAND_STYLES),
  preferredColors: z.array(hexColor).max(3).default([]),
  needsWebsite: z.boolean().default(false),
  needsSocialMedia: z.boolean().default(false),
  language: z.enum(['en', 'ar']).default('en'),
})

export type CreateProjectInput = z.input<typeof createProjectSchema>

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120).optional(),
})

export const projectIdSchema = z.object({ id: z.uuid() })
