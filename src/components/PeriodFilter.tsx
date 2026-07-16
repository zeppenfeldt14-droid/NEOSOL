'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentMonth = new Date().getMonth()
  const currentPeriod = searchParams.get('period') || currentMonth.toString()

  // Texto a mostrar en el botón
  const getLabel = (val: string) => {
    if (val.startsWith('Q')) return TRIMESTRES.find(t => t.value === val)?.label || val
    const m = parseInt(val)
    return MESES.find(mes => mes.value === m)?.label || val
  }

  const handleSelect = (val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', val.toString())
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <Calendar size={15} style={{ color: 'var(--accent-primary)' }} />
        {getLabel(currentPeriod)}
        <ChevronDown size={14} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          minWidth: '220px',
          background: '#111625',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Trimestres */}
          <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Trimestres
          </div>
          {TRIMESTRES.map(t => (
            <button
              key={t.value}
              onClick={() => handleSelect(t.value)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 16px',
                background: currentPeriod === t.value ? 'rgba(var(--accent-rgb), 0.15)' : 'transparent',
                color: currentPeriod === t.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: currentPeriod === t.value ? 600 : 400,
                cursor: 'pointer',
                border: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (currentPeriod !== t.value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (currentPeriod !== t.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {t.label}
            </button>
          ))}

          {/* Divisor */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          {/* Meses */}
          <div style={{ padding: '4px 12px 4px', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Meses
          </div>
          {MESES.map(m => {
            const isFuture = m.value > currentMonth
            const isSelected = currentPeriod === m.value.toString()
            return (
              <button
                key={m.value}
                onClick={() => !isFuture && handleSelect(m.value.toString())}
                disabled={isFuture}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 16px',
                  background: isSelected ? 'rgba(var(--accent-rgb), 0.15)' : 'transparent',
                  color: isFuture ? 'var(--text-secondary)' : isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: isFuture ? 'default' : 'pointer',
                  border: 'none',
                  opacity: isFuture ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isFuture && !isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isFuture && !isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {m.label}
                {isFuture && <span style={{ fontSize: '10px', opacity: 0.5 }}>próximo</span>}
              </button>
            )
          })}
          <div style={{ height: '8px' }} />
        </div>
      )}
    </div>
  )
}
