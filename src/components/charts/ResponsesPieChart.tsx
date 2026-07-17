'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type Props = {
  conRespuesta: number
  sinRespuesta: number
}

export function ResponsesPieChart({ conRespuesta, sinRespuesta }: Props) {
  const total = conRespuesta + sinRespuesta
  
  const pctCon = total > 0 ? Math.round((conRespuesta / total) * 100) : 0
  const pctSin = total > 0 ? Math.round((sinRespuesta / total) * 100) : 0

  const data = [
    { name: 'Con Respuesta', value: conRespuesta, pct: pctCon, color: '#10b981' }, // Verde
    { name: 'Sin Respuesta', value: sinRespuesta, pct: pctSin, color: '#ef4444' }  // Rojo
  ].filter(d => d.value > 0)

  // Fallback if no data
  if (data.length === 0) {
    data.push({ name: 'Sin Acciones', value: 1, pct: 0, color: '#4b5563' }) // Gris
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: '160px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any, name: any, props: any) => {
                const item = props.payload
                return [`${value} (${item.pct}%)`, name]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></span>
            <span style={{ color: '#9ca3af', fontWeight: 500 }}>
              {d.name}: {d.pct}% ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
