'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

interface SharedPeriodFilterProps {
  currentPeriod: string
  onPeriodChange: (newPeriod: string) => void
  align?: 'left' | 'right'
}

export default function SharedPeriodFilter({ currentPeriod, onPeriodChange, align = 'right' }: SharedPeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getSelectedMonths = () => {
    if (['hoy', 'semana', 'todo', 'Q1', 'Q2', 'Q3', 'Q4'].includes(currentPeriod)) {
      return []
    }
    if (currentPeriod === 'mes') {
      return [new Date().getMonth()]
    }
    return currentPeriod.split(',').map(Number).filter(n => !isNaN(n))
  }

  const selectedMonths = getSelectedMonths()

  const handleSelectSimplePeriod = (period: 'hoy' | 'semana' | 'todo' | 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    onPeriodChange(period)
    setIsOpen(false)
  }

  const handleToggleMonth = (monthIndex: number) => {
    let newMonths = [...selectedMonths]
    if (newMonths.includes(monthIndex)) {
      if (newMonths.length > 1) {
        newMonths = newMonths.filter(m => m !== monthIndex)
      }
    } else {
      newMonths.push(monthIndex)
    }
    onPeriodChange(newMonths.sort((a, b) => a - b).join(','))
  }

  const getFilterLabel = () => {
    if (currentPeriod === 'hoy') return 'Hoy'
    if (currentPeriod === 'semana') return 'Últimos 7 días'
    if (currentPeriod === 'todo') return 'Historial completo'
    if (currentPeriod === 'Q1') return 'Trimestre 1 (Q1)'
    if (currentPeriod === 'Q2') return 'Trimestre 2 (Q2)'
    if (currentPeriod === 'Q3') return 'Trimestre 3 (Q3)'
    if (currentPeriod === 'Q4') return 'Trimestre 4 (Q4)'
    if (currentPeriod === 'mes') return `Mes: ${MONTH_NAMES[new Date().getMonth()]}`
    
    if (selectedMonths.length === 1) {
      return `Mes: ${MONTH_NAMES[selectedMonths[0]]}`
    }
    if (selectedMonths.length === 3) {
      return `${selectedMonths.map(m => MONTH_NAMES[m].substring(0, 3)).join(' + ')}`
    }
    return `${selectedMonths.length} Meses`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 text-xs font-bold bg-[#141E3C] border border-white/5 hover:border-primary/40 text-white rounded-xl shadow-xl flex items-center gap-2.5 transition-all duration-300"
      >
        <Calendar size={14} className="text-primary" />
        <span>{getFilterLabel()}</span>
        <ChevronDown size={12} className="text-secondary/70 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className={`absolute mt-3 w-[290px] sm:w-80 max-w-[calc(100vw-1rem)] backdrop-blur-xl bg-[#0e162d]/95 border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(59,130,246,0.15)] z-50 p-5 animate-fade-in ${
          align === 'right' ? 'right-0 origin-top-right' : 'right-0 md:right-auto md:left-0 origin-top-right md:origin-top-left'
        }`}>
          <div className="text-[10px] font-black text-primary uppercase tracking-wider mb-2.5">Períodos Predefinidos</div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button onClick={() => handleSelectSimplePeriod('hoy')} className={`text-center text-xs py-2 rounded-xl font-bold transition-all ${currentPeriod === 'hoy' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>Hoy</button>
            <button onClick={() => handleSelectSimplePeriod('semana')} className={`text-center text-xs py-2 rounded-xl font-bold transition-all ${currentPeriod === 'semana' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>7 Días</button>
            <button onClick={() => handleSelectSimplePeriod('todo')} className={`text-center text-xs py-2 rounded-xl font-bold transition-all ${currentPeriod === 'todo' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>Todo</button>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button onClick={() => handleSelectSimplePeriod('Q1')} className={`text-center text-xs py-1.5 rounded-xl font-bold transition-all ${currentPeriod === 'Q1' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>Q1</button>
            <button onClick={() => handleSelectSimplePeriod('Q2')} className={`text-center text-xs py-1.5 rounded-xl font-bold transition-all ${currentPeriod === 'Q2' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>Q2</button>
            <button onClick={() => handleSelectSimplePeriod('Q3')} className={`text-center text-xs py-1.5 rounded-xl font-bold transition-all ${currentPeriod === 'Q3' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>Q3</button>
            <button onClick={() => handleSelectSimplePeriod('Q4')} className={`text-center text-xs py-1.5 rounded-xl font-bold transition-all ${currentPeriod === 'Q4' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary bg-black/20 hover:bg-white/5 hover:text-white'}`}>Q4</button>
          </div>

          <div className="border-t border-white/5 my-3 pt-3">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">Meses (Selección Múltiple)</span>
              {selectedMonths.length > 1 && (
                <button onClick={() => onPeriodChange('mes')} className="text-[9px] font-bold text-red-400 hover:text-red-300 hover:underline">
                  Reestablecer
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {MONTH_NAMES.map((name, index) => {
                const isChecked = selectedMonths.includes(index)
                return (
                  <div key={index} onClick={() => handleToggleMonth(index)} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all duration-200 ${isChecked ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5 bg-black/20 text-secondary hover:border-white/20 hover:text-white'}`}>
                    <span>{name}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${isChecked ? 'bg-primary text-white' : 'border border-white/20 bg-black/40'}`}>
                      {isChecked && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
