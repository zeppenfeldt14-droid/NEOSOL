'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

type Props = {
  data: { month: string; visitas: number; nuevos: number; activos: number; bajas: number }[]
}

const COLORS = {
  visitas: '#f97316',   // naranja Neosol
  nuevos:  '#3b82f6',   // azul
  activos: '#22c55e',   // verde
  bajas:   '#ef4444',   // rojo
}

export function MonthlyVisitsChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 60, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />

          {/* Eje izquierdo — Visitas */}
          <YAxis
            yAxisId="visitas"
            orientation="left"
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />

          {/* Eje derecho — Clientes & Bajas (escala propia, máx 5 mín) */}
          <YAxis
            yAxisId="clientes"
            orientation="right"
            stroke="#22c55e"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(dataMax + 1, 5)]}
            tickFormatter={(v) => `${v}C`}
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                visitas: '🟠 Gestion Global',
                nuevos:  '🔵 Nuevos Clientes',
                activos: '🟢 Clientes Activos',
                bajas:   '🔴 Bajas',
              }
              return [`${value}`, labels[String(name)] ?? String(name)]
            }}
          />

          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                visitas: 'Gestion Global',
                nuevos:  'Nuevos',
                activos: 'Activos',
                bajas:   'Bajas',
              }
              return <span style={{ color: '#d1d5db', fontSize: 12 }}>{labels[value] ?? value}</span>
            }}
          />

          {/* Barras de visitas — naranja, eje izquierdo */}
          <Bar
            yAxisId="visitas"
            name="visitas"
            dataKey="visitas"
            fill={COLORS.visitas}
            radius={[4, 4, 0, 0]}
            barSize={16}
          />

          {/* Línea nuevos clientes — azul, eje derecho */}
          <Line
            yAxisId="clientes"
            name="nuevos"
            dataKey="nuevos"
            type="monotone"
            stroke={COLORS.nuevos}
            strokeWidth={2.5}
            dot={{ r: 5, fill: COLORS.nuevos, strokeWidth: 2, stroke: '#1e3a6e' }}
            activeDot={{ r: 7 }}
          />

          {/* Línea activos — verde, eje derecho */}
          <Line
            yAxisId="clientes"
            name="activos"
            dataKey="activos"
            type="monotone"
            stroke={COLORS.activos}
            strokeWidth={2.5}
            strokeDasharray="6 3"
            dot={{ r: 5, fill: COLORS.activos, strokeWidth: 2, stroke: '#14532d' }}
            activeDot={{ r: 7 }}
          />

          {/* Línea bajas — rojo, eje derecho */}
          <Line
            yAxisId="clientes"
            name="bajas"
            dataKey="bajas"
            type="monotone"
            stroke={COLORS.bajas}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: COLORS.bajas, strokeWidth: 2, stroke: '#7f1d1d' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
