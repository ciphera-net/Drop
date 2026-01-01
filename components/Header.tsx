import Link from 'next/link'
import UserMenu from './UserMenu'

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 border-b border-neutral-100 bg-white/80 backdrop-blur-md transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
            D
          </div>
          <span className="text-xl font-bold text-neutral-900 tracking-tight">Drop</span>
        </Link>
      </div>
      <UserMenu />
    </header>
  )
}
