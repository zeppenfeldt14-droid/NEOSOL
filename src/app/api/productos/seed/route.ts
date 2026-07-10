import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const PRODUCTOS_SEED = [
  { codigoInterno: '33001', nombre: 'SIN SAL 160 PAQ X 25 GR',           linea: 'pack_individual', precioPaquete: 81.36,  paqPorCaja: 160, precioCaja: 13017.60 },
  { codigoInterno: '33024', nombre: 'SANDW. 176 PAQ X 25 GR',             linea: 'pack_individual', precioPaquete: 81.36,  paqPorCaja: 176, precioCaja: 14319.36 },
  { codigoInterno: '33077', nombre: 'DULCE 156 PAQ X 25 GR',              linea: 'pack_individual', precioPaquete: 84.76,  paqPorCaja: 156, precioCaja: 13221.94 },
  { codigoInterno: '66033', nombre: 'SANDW. 15 PAQ X 330 GR',             linea: 'tripack',         precioPaquete: 637.02, paqPorCaja: 15,  precioCaja: 9555.30  },
  { codigoInterno: '66034', nombre: 'SALVADO 15 PAQ X 360 GR',            linea: 'tripack',         precioPaquete: 697.69, paqPorCaja: 15,  precioCaja: 10465.35 },
  { codigoInterno: '99001', nombre: 'DULCE 16 PAQ X 360 GR',              linea: 'tripack',         precioPaquete: 799.93, paqPorCaja: 16,  precioCaja: 12798.88 },
  { codigoInterno: '77001', nombre: 'MIX SEMILLA 16 PAQ X 250 GR',        linea: 'minis',           precioPaquete: 529.17, paqPorCaja: 16,  precioCaja: 8466.69  },
  { codigoInterno: '77002', nombre: 'MINI SALVADO 16 PAQ X 250 GR',       linea: 'minis',           precioPaquete: 501.08, paqPorCaja: 16,  precioCaja: 8017.28  },
  { codigoInterno: '77003', nombre: 'MINI SANDWICH 16 PAQ X 250 GR',      linea: 'minis',           precioPaquete: 468.50, paqPorCaja: 16,  precioCaja: 7495.98  },
  { codigoInterno: '80000', nombre: 'BAGUETINES Original 24 PAQ X 70 GR', linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80001', nombre: 'BAGUETINES Queso 24 PAQ X 70 GR',    linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80002', nombre: 'BAGUETINES Jamon 24 PAQ X 70 GR',    linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80003', nombre: 'BAGUETINES Pizza 24 PAQ X 70 GR',    linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80004', nombre: 'NEOX 24 PAQ X 70 GR',                linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80005', nombre: 'NEOLITAS Queso 24 PAQ X 70 GR',      linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80006', nombre: 'NEOLITAS Jamon 24 PAQ X 70 GR',      linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
  { codigoInterno: '80007', nombre: 'NEOLITAS Pizza 24 PAQ X 70 GR',      linea: 'snacks',          precioPaquete: 418.95, paqPorCaja: 24,  precioCaja: 10054.80 },
]

// POST: Seed products (Nivel 1 only, idempotent)
export async function POST() {
  try {
    const session = await getSessionUser()
    if (!session)
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const count = await prisma.producto.count()
    if (count > 0 && session.nivel !== 1)
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    let created = 0
    let skipped = 0

    for (const p of PRODUCTOS_SEED) {
      const exists = await prisma.producto.findUnique({ where: { codigoInterno: p.codigoInterno } })
      if (exists) { skipped++; continue }
      await prisma.producto.create({ data: p })
      created++
    }

    return NextResponse.json({ success: true, created, skipped })
  } catch (error: any) {
    console.error('[API Seed Productos]', error)
    return NextResponse.json({ error: 'Error en seed.' }, { status: 500 })
  }
}
