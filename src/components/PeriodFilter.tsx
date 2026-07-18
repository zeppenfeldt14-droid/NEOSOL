'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import SharedPeriodFilter from './SharedPeriodFilter'

export function PeriodFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPeriod = searchParams.get('period') || 'mes'

  const handlePeriodChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', val)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <SharedPeriodFilter 
      currentPeriod={currentPeriod}
      onPeriodChange={handlePeriodChange}
      align="right"
    />
  )
}
