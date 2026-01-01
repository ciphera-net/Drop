'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

export default function UserMenu() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded bg-neutral-100" />
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          Dashboard
        </Link>
        <button
          onClick={logout}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/login"
        className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="btn-primary text-sm"
      >
        Sign up
      </Link>
    </div>
  )
}
