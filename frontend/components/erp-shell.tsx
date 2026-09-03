'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Boxes, ClipboardList, PackageCheck, ShoppingCart, ArrowLeftRight, LogOut, Menu, X, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AuthUser, Role } from '@/lib/erp-types'
import { roleAccess, roleLabels } from '@/lib/erp-types'
import { apiLogout, getCurrentUser } from '@/lib/erp-api'

const nav = [
  { key: 'dashboard', href: '/dashboard', label: 'Overview', icon: PackageCheck },
  { key: 'inventory', href: '/dashboard/inventory', label: 'Inventory', icon: Boxes },
  { key: 'work-orders', href: '/dashboard/work-orders', label: 'Work Orders', icon: ClipboardList },
  { key: 'transfers', href: '/dashboard/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { key: 'orders', href: '/dashboard/orders', label: 'Customer Orders', icon: ShoppingCart },
]

export function ErpShell({ children, role = 'ADMIN' as Role }: { children: React.ReactNode; role?: Role }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  const activeRole: Role = currentUser?.role || role
  const userName = currentUser?.name || (activeRole === 'ADMIN' ? 'Alex Rivera' : activeRole === 'SALES_USER' ? 'Sam Patel' : 'Casey Brooks')
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const current = nav.find((item) => pathname === item.href) ?? nav[0]
  const allowedKeys = roleAccess[activeRole] || roleAccess.ADMIN

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold tracking-tight text-sidebar-foreground">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PackageCheck />
            </span>
            <span>
              Fundsroom
              <br />
              <small className="brand-subtitle">Operations ERP</small>
            </span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="px-3 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Primary navigation">
            {nav
              .filter((item) => allowedKeys.includes(item.key))
              .map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-sidebar-accent ${
                      isActive ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70'
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                )
              })}
          </nav>
        </div>
        <div className="border-t p-4">
          <div className="sidebar-profile flex items-center gap-3 rounded-lg p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="sidebar-profile-name truncate text-sm font-medium">{userName}</p>
              <p className="sidebar-profile-role truncate text-xs">{roleLabels[activeRole]}</p>
            </div>
            <button className="sidebar-profile-logout" onClick={() => apiLogout()} aria-label="Log out" title="Log out">
              <LogOut />
            </button>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b bg-background/95 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu />
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{current?.label ?? 'Dashboard'}</h1>
            </div>
          </div>
          <div className="header-account">
            <button className="header-icon" aria-label="View notifications">
              <Bell />
            </button>
            <div className="header-user">
              <span>{userName}</span>
              <small>{roleLabels[activeRole]}</small>
            </div>
            <button className="header-logout" onClick={() => apiLogout()} aria-label="Log out">
              <LogOut /> <span>Log out</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-5 lg:p-10">{children}</main>
      </div>
    </div>
  )
}
