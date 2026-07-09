'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type Props = {
  planificadas: number
  atendidas: number
  reprogramadas: number
}

export function DailyRouteChart({ planificadas, atendidas, reprogramadas }: Props) {
  const pendientes = planificadas - atendidas - reprogramadas
  const data = [
    { name: 'Pendientes', value: pendientes > 0 ? pendientes : 0, color: '#3b82f6' }, // blue-500
    { name: 'Atendidas', value: atendidas, color: '#22c55e' },       // green-500
    { name: 'Reprogramadas', value: reprogramadas, color: '#f59e0b' } // amber-500
  ].filter(d => d.value > 0)

  // Fallback for empty data
  if (data.length === 0) {
    data.push({ name: 'Sin visitas', value: 1, color: '#4b5563' }) // gray
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: '160px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></span>
            <span style={{ color: '#9ca3af' }}>{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
