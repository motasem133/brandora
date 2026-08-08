'use client'

import { useTranslations } from 'next-intl'

import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { usePathname, useRouter } from '@/i18n/navigation'
import type { StudioBrand } from '@/server/db/queries/content'

/**
 * Which brand the studio is writing for.
 *
 * The choice goes in the URL rather than into state or a session column. Every
 * other choice in this app already works that way — the project tab, the logo
 * round, the billing currency — and it means the page renders on the server
 * with the brand already applied, and a link to it carries the brand along.
 */
export function BrandPicker({ brands, selectedId }: { brands: StudioBrand[]; selectedId: string }) {
  const t = useTranslations('Studio')
  const router = useRouter()
  const pathname = usePathname()

  // One brand is not a choice; showing a select with a single option is noise.
  if (brands.length < 2) return null

  return (
    <Field label={t('brandLabel')} hint={t('brandHint')}>
      <Select
        value={selectedId}
        onChange={(event) => router.push(`${pathname}?brand=${event.target.value}`)}
      >
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </Select>
    </Field>
  )
}
