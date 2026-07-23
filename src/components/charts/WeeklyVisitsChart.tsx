'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type Props = {
  data: { 
    name: string
    visitas: number
    whatsapp?: number
    correo?: number
    llamada?: number
  }[]
}

export function WeeklyVisitsChart({ data }: Props) {
  // Verificamos si tenemos los datos detallados
  const hasDetailed = data.some(d => d.whatsapp !== undefined)

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
        >
          <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          {hasDetailed && (
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
              iconType="circle"
              iconSize={8}
            />
          )}
          
          {hasDetailed ? (
            <>
              <Bar dataKey="visitas" name="Visitas" stackId="a" fill="#3b82f6" barSize={16} />
              <Bar dataKey="whatsapp" name="WhatsApp" stackId="a" fill="#22c55e" barSize={16} />
              <Bar dataKey="correo" name="Correos" stackId="a" fill="#f97316" barSize={16} />
              <Bar dataKey="llamada" name="Llamadas" stackId="a" fill="#8b5cf6" barSize={16} radius={[0, 4, 4, 0]} />
            </>
          ) : (
            <Bar dataKey="visitas" name="Visitas" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
