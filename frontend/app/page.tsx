'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/erp-api'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const token = getToken()
    if (token) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="skeleton wide" style={{ maxWidth: 400, height: 80 }} />
    </div>
  )
}
