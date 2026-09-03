'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PackageCheck,
  Boxes,
  ClipboardList,
  Search,
  ArrowLeftRight,
  ShoppingCart,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import { apiLogin, apiGetMe, getToken } from '@/lib/erp-api'
import { Button } from '@/components/ui/button'

const FLOW_STEPS = [
  { icon: Boxes, label: 'Inventory', desc: 'Physical & reserved balance tracking' },
  { icon: ClipboardList, label: 'Work Orders', desc: 'Material requirement verification' },
  { icon: Search, label: 'Stock Check', desc: 'Authoritative backend shortage detection' },
  { icon: ArrowLeftRight, label: 'Transfers', desc: 'Multi-location dispatch & receipt lifecycle' },
  { icon: ShoppingCart, label: 'Reservations', desc: 'Atomic concurrency-safe customer allocation' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (token) {
      apiGetMe()
        .then(() => {
          router.replace('/dashboard')
        })
        .catch(() => {
          setCheckingSession(false)
        })
    } else {
      setCheckingSession(false)
    }
  }, [router])

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || !password || loading) return

    setLoading(true)
    setError('')

    try {
      await apiLogin({ email: email.trim(), password })
      window.location.href = '/dashboard'
    } catch (err: any) {
      if (err?.status === 401 || err?.code === 'INVALID_CREDENTIALS') {
        setError('Invalid email or password.')
      } else if (err?.status === 400 || err?.code === 'VALIDATION_ERROR') {
        setError(err?.message || 'Please enter a valid email address and password.')
      } else {
        setError(err?.message || 'Unable to connect to the backend server. Please try again.')
      }
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-[#0F172A] p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground animate-pulse shadow-lg shadow-primary/25">
            <PackageCheck className="size-6" />
          </span>
          <p className="text-sm text-slate-400 font-medium tracking-wide">
            Verifying session…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* Left Panel — Product & Operations Branding */}
      <section className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[#0F172A] border-r border-[#1E293B] text-white flex-col justify-between p-10 xl:p-14 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <PackageCheck className="size-5" />
          </span>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white leading-tight block">
              Fundsroom
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block -mt-0.5">
              Operations ERP
            </span>
          </div>
        </div>

        {/* Core Value Proposition & Subtle Flow Visual */}
        <div className="my-auto py-8 max-w-lg">
          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
            Control every operation.
          </h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Manage inventory, work orders, transfers, and customer reservations from one operational workspace.
          </p>

          {/* Operational Flow Visual Identity */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              Operational Flow
            </p>
            <div className="space-y-2.5">
              {FLOW_STEPS.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-800/90 text-blue-400 border border-slate-700/60">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-200 block leading-tight">
                        {step.label}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {step.desc}
                      </span>
                    </div>
                    {idx < FLOW_STEPS.length - 1 && (
                      <span className="text-slate-600 text-xs font-mono select-none px-1">
                        ↓
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Left Panel Footer */}
        <div className="pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span>Enterprise Core</span>
          <span>Transactional Integrity</span>
        </div>
      </section>

      {/* Right Panel — Authentication Experience */}
      <section className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[420px]">
          {/* Mobile/Tablet Brand Header (displayed only on < lg screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <PackageCheck className="size-5" />
            </span>
            <div>
              <span className="font-semibold text-lg tracking-tight text-slate-900 leading-tight block">
                Fundsroom
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 block -mt-0.5">
                Operations ERP
              </span>
            </div>
          </div>

          {/* Authentication Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
            {/* Desktop Brand Eyebrow */}
            <div className="hidden lg:flex items-center gap-2 mb-6">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackageCheck className="size-4" />
              </span>
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Operations Console
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 m-0">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Sign in to your operations console.
            </p>

            {/* Error Feedback Banner */}
            {error && (
              <div
                className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="email" className="text-xs font-bold text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="password" className="text-xs font-bold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                    disabled={loading}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:pointer-events-none"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-9 mt-1 font-semibold"
                disabled={loading || !email.trim() || !password}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-5 mb-0">
              Secure access to your operational workspace.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
