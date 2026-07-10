import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const PRODUCTOS_SEED = [
  { codigoInterno: '33001', nombre: 'SIN SAL 160 PAQ X 25 GR',           linea: 'pack_individual', precioPaquete: 94.27,  paqPorCaja: 160, precioCaja: 15083.04 },
  { codigoInterno: '33024', nombre: 'SANDW. 176 PAQ X 25 GR',             linea: 'pack_individual', precioPaquete: 94.27,  paqPorCaja: 176, precioCaja: 16591.34 },
  { codigoInterno: '33077', nombre: 'DULCE 156 PAQ X 25 GR',              linea: 'pack_individual', precioPaquete: 98.12,  paqPorCaja: 156, precioCaja: 15307.11 },
  { codigoInterno: '66033', nombre: 'SANDW. 15 PAQ X 330 GR',             linea: 'tripack',         precioPaquete: 700.77, paqPorCaja: 15,  precioCaja: 10511.55 },
  { codigoInterno: '66034', nombre: 'SALVADO 15 PAQ X 360 GR',            linea: 'tripack',         precioPaquete: 767.45, paqPorCaja: 15,  precioCaja: 11511.68 },
  { codigoInterno: '99001', nombre: 'DULCE 16 PAQ X 360 GR',              linea: 'tripack',         precioPaquete: 879.90, paqPorCaja: 16,  precioCaja: 14078.40 },
  { codigoInterno: '77001', nombre: 'MIX SEMILLA 16 PAQ X 250 GR',        linea: 'minis',           precioPaquete: 582.12, paqPorCaja: 16,  precioCaja: 9313.92  },
  { codigoInterno: '77002', nombre: 'MINI SALVADO 16 PAQ X 250 GR',       linea: 'minis',           precioPaquete: 551.20, paqPorCaja: 16,  precioCaja: 8819.15  },
  { codigoInterno: '77003', nombre: 'MINI SANDWICH 16 PAQ X 250 GR',      linea: 'minis',           precioPaquete: 515.34, paqPorCaja: 16,  precioCaja: 8245.44  },
  { codigoInterno: '80000', nombre: 'BAGUETINES Original 24 PAQ X 70 GR', linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80001', nombre: 'BAGUETINES Queso 24 PAQ X 70 GR',    linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80002', nombre: 'BAGUETINES Jamon 24 PAQ X 70 GR',    linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80003', nombre: 'BAGUETINES Pizza 24 PAQ X 70 GR',    linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80004', nombre: 'NEOX 24 PAQ X 70 GR',                linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80005', nombre: 'NEOLITAS Queso 24 PAQ X 70 GR',      linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80006', nombre: 'NEOLITAS Jamon 24 PAQ X 70 GR',      linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
  { codigoInterno: '80007', nombre: 'NEOLITAS Pizza 24 PAQ X 70 GR',      linea: 'snacks',          precioPaquete: 493.50, paqPorCaja: 24,  precioCaja: 11844.00 },
]

// POST: Seed products (idempotent, registers list and upserts)
export async function POST() {
  try {
    const session = await getSessionUser()
    if (!session)
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    // Ensure "Lista Mayo 2026" exists or create it
    let listId: number
    const existingList = await prisma.listaPrecio.findFirst({
      where: { nombre: 'Lista Mayo 2026' }
    })
    
    if (existingList) {
      listId = existingList.id
    } else {
      const newList = await prisma.listaPrecio.create({
        data: {
          nombre: 'Lista Mayo 2026',
          vigenteDesde: new Date('2026-05-01T00:00:00Z'),
          activa: true
        }
      })
      listId = newList.id
    }

    let created = 0
    let updated = 0

    for (const p of PRODUCTOS_SEED) {
      const exists = await prisma.producto.findUnique({ where: { codigoInterno: p.codigoInterno } })
      let dbProd
      if (exists) {
        dbProd = await prisma.producto.update({
          where: { id: exists.id },
          data: p
        })
        updated++
      } else {
        dbProd = await prisma.producto.create({ data: p })
        created++
      }

      // Upsert the prices for this product in "Lista Mayo 2026"
      const priceRecord = await prisma.precioProducto.findUnique({
        where: {
          listaId_productoId: {
            listaId: listId,
            productoId: dbProd.id
          }
        }
      })

      const minPaquete = Number((p.precioPaquete * 1.15).toFixed(2))
      const minCaja = Number((p.precioCaja * 1.15).toFixed(2))

      if (priceRecord) {
        await prisma.precioProducto.update({
          where: { id: priceRecord.id },
          data: {
            precioPaqueteMin: minPaquete,
            precioCajaMin: minCaja,
            precioPaqueteMax: p.precioPaquete,
            precioCajaMax: p.precioCaja
          }
        })
      } else {
        await prisma.precioProducto.create({
          data: {
            listaId: listId,
            productoId: dbProd.id,
            productoCodigo: p.codigoInterno,
            precioPaqueteMin: minPaquete,
            precioCajaMin: minCaja,
            precioPaqueteMax: p.precioPaquete,
            precioCajaMax: p.precioCaja
          }
        })
      }
    }

    return NextResponse.json({ success: true, created, updated })
  } catch (error: any) {
    console.error('[API Seed Productos]', error)
    return NextResponse.json({ error: 'Error en seed.' }, { status: 500 })
  }
}
