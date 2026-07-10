import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const PRODUCTOS_BASE = [
  { codigoInterno: '33001', nombre: 'SIN SAL 160 PAQ X 25 GR',           linea: 'pack_individual', paqPorCaja: 160, precioPaquete: 94.27, precioCaja: 15083.04 },
  { codigoInterno: '33024', nombre: 'SANDW. 176 PAQ X 25 GR',             linea: 'pack_individual', paqPorCaja: 176, precioPaquete: 94.27, precioCaja: 16591.34 },
  { codigoInterno: '33077', nombre: 'DULCE 156 PAQ X 25 GR',              linea: 'pack_individual', paqPorCaja: 156, precioPaquete: 98.12, precioCaja: 15307.11 },
  { codigoInterno: '66033', nombre: 'SANDW. 15 PAQ X 330 GR',             linea: 'tripack',         paqPorCaja: 15,  precioPaquete: 700.77, precioCaja: 10511.55 },
  { codigoInterno: '66034', nombre: 'SALVADO 15 PAQ X 360 GR',            linea: 'tripack',         paqPorCaja: 15,  precioPaquete: 767.45, precioCaja: 11511.68 },
  { codigoInterno: '99001', nombre: 'DULCE 16 PAQ X 360 GR',              linea: 'tripack',         paqPorCaja: 16,  precioPaquete: 879.90, precioCaja: 14078.40 },
  { codigoInterno: '77001', nombre: 'MIX SEMILLA 16 PAQ X 250 GR',        linea: 'minis',           paqPorCaja: 16,  precioPaquete: 582.12, precioCaja: 9313.92 },
  { codigoInterno: '77002', nombre: 'MINI SALVADO 16 PAQ X 250 GR',       linea: 'minis',           paqPorCaja: 16,  precioPaquete: 551.20, precioCaja: 8819.15 },
  { codigoInterno: '77003', nombre: 'MINI SANDWICH 16 PAQ X 250 GR',      linea: 'minis',           paqPorCaja: 16,  precioPaquete: 515.34, precioCaja: 8245.44 },
  { codigoInterno: '80000', nombre: 'BAGUETINES Original 24 PAQ X 70 GR', linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80001', nombre: 'BAGUETINES Queso 24 PAQ X 70 GR',    linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80002', nombre: 'BAGUETINES Jamon 24 PAQ X 70 GR',    linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80003', nombre: 'BAGUETINES Pizza 24 PAQ X 70 GR',    linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80004', nombre: 'NEOX 24 PAQ X 70 GR',                linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80005', nombre: 'NEOLITAS Queso 24 PAQ X 70 GR',      linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80006', nombre: 'NEOLITAS Jamon 24 PAQ X 70 GR',      linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
  { codigoInterno: '80007', nombre: 'NEOLITAS Pizza 24 PAQ X 70 GR',      linea: 'snacks',          paqPorCaja: 24,  precioPaquete: 493.50, precioCaja: 11844.00 },
]

// Mayo 2026 Prices:
// Min (Standard < 300) = PDF 1 (higher prices)
// Max (Volume >= 300) = PDF 2 (lower prices)
const PRECIOS_MAYO: Record<string, { minPaq: number; minCaja: number; maxPaq: number; maxCaja: number }> = {
  '33001': { minPaq: 94.27, minCaja: 15083.04, maxPaq: 81.36, maxCaja: 13017.60 },
  '33024': { minPaq: 94.27, minCaja: 16591.34, maxPaq: 81.36, maxCaja: 14319.36 },
  '33077': { minPaq: 98.12, minCaja: 15307.11, maxPaq: 84.76, maxCaja: 13221.94 },
  '66033': { minPaq: 700.77, minCaja: 10511.55, maxPaq: 637.02, maxCaja: 9555.30 },
  '66034': { minPaq: 767.45, minCaja: 11511.68, maxPaq: 697.69, maxCaja: 10465.35 },
  '99001': { minPaq: 879.90, minCaja: 14078.40, maxPaq: 799.93, maxCaja: 12798.88 },
  '77001': { minPaq: 582.12, minCaja: 9313.92,  maxPaq: 529.17, maxCaja: 8466.69  },
  '77002': { minPaq: 551.20, minCaja: 8819.15,  maxPaq: 501.08, maxCaja: 8017.28  },
  '77003': { minPaq: 515.34, minCaja: 8245.44,  maxPaq: 468.50, maxCaja: 7495.98  },
  '80000': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80001': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80002': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80003': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80004': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80005': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80006': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
  '80007': { minPaq: 493.50, minCaja: 11844.00, maxPaq: 418.95, maxCaja: 10054.80 },
}

// Agosto 2026 Prices:
// Min (Standard < 300) = PDF 4 (higher prices)
// Max (Volume >= 300) = PDF 3 (lower prices)
const PRECIOS_AGOSTO: Record<string, { minPaq: number; minCaja: number; maxPaq: number; maxCaja: number }> = {
  '33001': { minPaq: 100.00, minCaja: 16000.00, maxPaq: 87.00, maxCaja: 13920.00 },
  '33024': { minPaq: 100.00, minCaja: 17600.00, maxPaq: 87.00, maxCaja: 15312.00 },
  '33077': { minPaq: 105.00, minCaja: 16380.00, maxPaq: 90.70, maxCaja: 14149.20 },
  '66033': { minPaq: 750.00, minCaja: 11250.00, maxPaq: 681.60, maxCaja: 10224.00 },
  '66034': { minPaq: 821.20, minCaja: 12318.00, maxPaq: 750.50, maxCaja: 11257.50 },
  '99001': { minPaq: 941.50, minCaja: 15064.00, maxPaq: 855.90, maxCaja: 13694.40 },
  '77001': { minPaq: 622.00, minCaja: 9952.00,  maxPaq: 566.20, maxCaja: 9059.20  },
  '77002': { minPaq: 589.90, minCaja: 9438.40,  maxPaq: 536.15, maxCaja: 8578.40  },
  '77003': { minPaq: 551.40, minCaja: 8822.40,  maxPaq: 501.30, maxCaja: 8020.80  },
  '80000': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80001': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80002': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80003': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80004': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80005': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80006': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
  '80007': { minPaq: 530.00, minCaja: 12720.00, maxPaq: 450.00, maxCaja: 10800.00 },
}

// POST: Seed products (Mayo and Agosto lists)
export async function POST() {
  try {
    const session = await getSessionUser()
    if (!session)
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    // 1. Ensure List Mayo 2026
    let listMayoId: number
    const existingMayo = await prisma.listaPrecio.findFirst({ where: { nombre: 'Lista Mayo 2026' } })
    if (existingMayo) {
      listMayoId = existingMayo.id
    } else {
      const l = await prisma.listaPrecio.create({
        data: { nombre: 'Lista Mayo 2026', vigenteDesde: new Date('2026-05-01T00:00:00Z'), activa: true }
      })
      listMayoId = l.id
    }

    // 2. Ensure List Agosto 2026
    let listAgostoId: number
    const existingAgosto = await prisma.listaPrecio.findFirst({ where: { nombre: 'Lista Agosto 2026' } })
    if (existingAgosto) {
      listAgostoId = existingAgosto.id
    } else {
      const l = await prisma.listaPrecio.create({
        data: { nombre: 'Lista Agosto 2026', vigenteDesde: new Date('2026-08-01T00:00:00Z'), activa: true }
      })
      listAgostoId = l.id
    }

    for (const p of PRODUCTOS_BASE) {
      const exists = await prisma.producto.findUnique({ where: { codigoInterno: p.codigoInterno } })
      let dbProd
      if (exists) {
        dbProd = await prisma.producto.update({ where: { id: exists.id }, data: p })
      } else {
        dbProd = await prisma.producto.create({ data: p })
      }

      // Mayo prices mapping (Min = high standard, Max = low volume)
      const mayo = PRECIOS_MAYO[p.codigoInterno]
      if (mayo) {
        await prisma.precioProducto.upsert({
          where: { listaId_productoId: { listaId: listMayoId, productoId: dbProd.id } },
          update: {
            precioPaqueteMin: mayo.minPaq,
            precioCajaMin: mayo.minCaja,
            precioPaqueteMax: mayo.maxPaq,
            precioCajaMax: mayo.maxCaja
          },
          create: {
            listaId: listMayoId,
            productoId: dbProd.id,
            productoCodigo: p.codigoInterno,
            precioPaqueteMin: mayo.minPaq,
            precioCajaMin: mayo.minCaja,
            precioPaqueteMax: mayo.maxPaq,
            precioCajaMax: mayo.maxCaja
          }
        })
      }

      // Agosto prices mapping (Min = high standard, Max = low volume)
      const ago = PRECIOS_AGOSTO[p.codigoInterno]
      if (ago) {
        await prisma.precioProducto.upsert({
          where: { listaId_productoId: { listaId: listAgostoId, productoId: dbProd.id } },
          update: {
            precioPaqueteMin: ago.minPaq,
            precioCajaMin: ago.minCaja,
            precioPaqueteMax: ago.maxPaq,
            precioCajaMax: ago.maxCaja
          },
          create: {
            listaId: listAgostoId,
            productoId: dbProd.id,
            productoCodigo: p.codigoInterno,
            precioPaqueteMin: ago.minPaq,
            precioCajaMin: ago.minCaja,
            precioPaqueteMax: ago.maxPaq,
            precioCajaMax: ago.maxCaja
          }
        })
      }
    }

    // Ensure July 2026 Promotions
    const promos = [
      {
        nombre: 'Promo 10x1 Dulce 99001',
        descripcion: 'Llevando 10 cajas de Dulce 16 Paq x 360g (99001), te llevas 1 caja de bonificación.',
        tipo: 'bonificacion',
        compraMinima: 10,
        bonificacion: 1,
        activa: true,
        vigenciaDesde: new Date('2026-07-01T00:00:00Z'),
        vigenciaHasta: new Date('2026-07-31T23:59:59Z'),
      },
      {
        nombre: 'Promo 10x1 Minis (77001/2/3)',
        descripcion: 'Llevando 10 cajas de cualquier producto de la línea Minis, te llevas 1 caja de bonificación.',
        tipo: 'bonificacion',
        compraMinima: 10,
        bonificacion: 1,
        activa: true,
        vigenciaDesde: new Date('2026-07-01T00:00:00Z'),
        vigenciaHasta: new Date('2026-07-31T23:59:59Z'),
      },
      {
        nombre: 'Promo 10x1 Snacks Horneados (80000-80007)',
        descripcion: 'Llevando 10 cajas de cualquier producto de la línea Snacks Horneados (Baguetines/Neox/Neolitas), te llevas 1 caja de bonificación.',
        tipo: 'bonificacion',
        compraMinima: 10,
        bonificacion: 1,
        activa: true,
        vigenciaDesde: new Date('2026-07-01T00:00:00Z'),
        vigenciaHasta: new Date('2026-07-31T23:59:59Z'),
      }
    ]

    for (const pr of promos) {
      const existing = await prisma.promocion.findFirst({ where: { nombre: pr.nombre } })
      if (!existing) {
        await prisma.promocion.create({ data: pr })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API Seed Productos]', error)
    return NextResponse.json({ error: 'Error en seed.' }, { status: 500 })
  }
}
