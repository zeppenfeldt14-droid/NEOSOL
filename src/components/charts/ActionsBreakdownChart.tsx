'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

type Props = {
  data: {
    month: string
    visitas: number
    whatsapp: number
    correos: number
    llamadas: number
  }[]
}

const COLORS = {
  visitas: '#f97316',  // Naranja Neosol
  whatsapp: '#25d366', // Verde WhatsApp
  correos: '#3b82f6',  // Azul
  llamadas: '#fbbf24'  // Amarillo
}

export function ActionsBreakdownChart({ data }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const displayData = isMobile ? data.slice(-3) : data

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
          
          <YAxis
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          
          <XAxis
            dataKey="month"
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                visitas: '🟠 Visitas Presenciales',
                whatsapp: '🟢 WhatsApp',
                correos: '🔵 Correos',
                llamadas: '🟡 Llamadas',
              }
              return [`${value}`, labels[String(name)] ?? String(name)]
            }}
          />
          
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                visitas: 'Visitas',
                whatsapp: 'WhatsApp',
                correos: 'Correos',
                llamadas: 'Llamadas',
              }
              return <span style={{ color: '#d1d5db', fontSize: 12 }}>{labels[value] ?? value}</span>
            }}
          />
          
          {/* Stacked Bars */}
          <Bar dataKey="visitas" name="visitas" stackId="a" fill={COLORS.visitas} radius={[0, 0, 0, 0]} barSize={18} />
          <Bar dataKey="whatsapp" name="whatsapp" stackId="a" fill={COLORS.whatsapp} />
          <Bar dataKey="correos" name="correos" stackId="a" fill={COLORS.correos} />
          <Bar dataKey="llamadas" name="llamadas" stackId="a" fill={COLORS.llamadas} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
