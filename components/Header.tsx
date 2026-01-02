import Link from 'next/link'
import UserMenu from './UserMenu'

export default function Header() {
  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
      <div className="flex w-full max-w-5xl items-center justify-between rounded-full border border-neutral-200/50 bg-white/80 px-6 py-3 shadow-lg shadow-neutral-500/5 backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
            D
          </div>
          <span className="text-xl font-bold text-neutral-900 tracking-tight">Drop</span>
        </Link>
      </div>
      <UserMenu />
      </div>
    </header>
  )
}
