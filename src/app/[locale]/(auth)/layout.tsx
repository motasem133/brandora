import { Logo } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 animate-fade-in">
        <Logo className="text-2xl" markClassName="size-9" animated />
      </Link>
      <div className="w-full max-w-sm animate-scale-in">{children}</div>
    </div>
  )
}
