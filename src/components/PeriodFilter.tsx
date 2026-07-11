'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar } from 'lucide-react'

const MESES = [
  { value: 0, label: 'Enero' },
  { value: 1, label: 'Febrero' },
  { value: 2, label: 'Marzo' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Mayo' },
  { value: 5, label: 'Junio' },
  { value: 6, label: 'Julio' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Septiembre' },
  { value: 9, label: 'Octubre' },
  { value: 10, label: 'Noviembre' },
  { value: 11, label: 'Diciembre' },
]

const TRIMESTRES = [
  { value: 'Q1', label: '1er Trimestre (Ene-Mar)' },
  { value: 'Q2', label: '2do Trimestre (Abr-Jun)' },
  { value: 'Q3', label: '3er Trimestre (Jul-Sep)' },
  { value: 'Q4', label: '4to Trimestre (Oct-Dic)' },
]

export function PeriodFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentMonth = new Date().getMonth()
  const currentPeriod = searchParams.get('period') || currentMonth.toString()

  const handlePeriodChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', val)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg border border-border">
      <Calendar size={16} className="text-muted-foreground ml-2" />
      <select
        value={currentPeriod}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="bg-transparent text-sm border-none focus:ring-0 text-white cursor-pointer py-1.5 pr-8 outline-none"
      >
        <optgroup label="Trimestres">
          {TRIMESTRES.map((t) => (
            <option key={t.value} value={t.value} className="bg-secondary">
              {t.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Meses">
          {MESES.map((m) => {
            const isFuture = m.value > currentMonth
            return (
              <option 
                key={m.value} 
                value={m.value.toString()} 
                className="bg-secondary"
                disabled={isFuture}
              >
                {m.label} {isFuture ? '(Futuro)' : ''}
              </option>
            )
          })}
        </optgroup>
      </select>
    </div>
  )
}
