import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const listas = await prisma.listaPrecio.findMany({
      include: {
        precios: {
          orderBy: { productoCodigo: 'asc' }
        }
      },
      orderBy: { vigenteDesde: 'desc' }
    })

    return NextResponse.json(listas)
  } catch (error: any) {
    console.error('[API GET Tarifas]', error)
    return NextResponse.json({ error: 'Error al listar tarifas.' }, { status: 500 })
  }
}

// Custom CSV parser
function parseCSV(content: string): { codigo: string; paquete: number; caja: number }[] {
  const result: any[] = []
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Parse commas while respecting quotes
    const cols: string[] = []
    let current = ''
    let inQuotes = false
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        cols.push(current)
        current = ''
      } else {
        current += char
      }
    }
    cols.push(current)

    if (cols.length < 4) continue
    const codigo = cols[0]?.trim()
    // Skip headers
    if (!codigo || codigo.toUpperCase() === 'COD. INTERNO' || codigo.toUpperCase() === 'COD') continue

    // Clean monetary values (e.g. remove $, commas or spaces)
    const cleanNum = (str: string) => {
      if (!str) return 0
      const cleaned = str.replace(/[$\s]/g, '').replace(/,/g, '')
      return parseFloat(cleaned) || 0
    }

    const paquete = cleanNum(cols[2])
    const caja = cleanNum(cols[3])

    result.push({ codigo, paquete, caja })
  }
  return result
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const formData = await request.formData()
    const nombre = formData.get('nombre') as string
    const vigenteDesdeStr = formData.get('vigenteDesde') as string
    const fileMin = formData.get('fileMin') as File | null // standard / < 300 cajas
    const fileMax = formData.get('fileMax') as File | null // discount / >= 300 cajas

    if (!nombre || !vigenteDesdeStr || !fileMin || !fileMax) {
      return NextResponse.json({ error: 'Faltan campos requeridos (nombre, fecha de vigencia y ambos archivos CSV).' }, { status: 400 })
    }

    const vigenteDesde = new Date(vigenteDesdeStr)
    if (isNaN(vigenteDesde.getTime())) {
      return NextResponse.json({ error: 'Fecha de vigencia inválida.' }, { status: 400 })
    }

    const contentMin = await fileMin.text()
    const contentMax = await fileMax.text()

    const parsedMin = parseCSV(contentMin)
    const parsedMax = parseCSV(contentMax)

    // Match by code
    const maxMap = new Map<string, typeof parsedMax[0]>()
    for (const item of parsedMax) {
      maxMap.set(item.codigo, item)
    }

    // Get all products to get their DB ids
    const dbProductos = await prisma.producto.findMany()
    const prodMap = new Map<string, number>()
    for (const p of dbProductos) {
      prodMap.set(p.codigoInterno, p.id)
    }

    // Create the price list
    const newLista = await prisma.listaPrecio.create({
      data: {
        nombre,
        vigenteDesde,
        activa: true
      }
    })

    let createdCount = 0
    for (const itemMin of parsedMin) {
      const prodId = prodMap.get(itemMin.codigo)
      if (!prodId) continue

      const itemMax = maxMap.get(itemMin.codigo)
      const paqueteMax = itemMax ? itemMax.paquete : itemMin.paquete
      const cajaMax = itemMax ? itemMax.caja : itemMin.caja

      await prisma.precioProducto.create({
        data: {
          listaId: newLista.id,
          productoId: prodId,
          productoCodigo: itemMin.codigo,
          precioPaqueteMin: itemMin.paquete,
          precioCajaMin: itemMin.caja,
          precioPaqueteMax: paqueteMax,
          precioCajaMax: cajaMax
        }
      })
      createdCount++
    }

    return NextResponse.json({ success: true, listaId: newLista.id, productosCreados: createdCount })
  } catch (error: any) {
    console.error('[API POST Tarifas]', error)
    return NextResponse.json({ error: 'Error al procesar e importar las tarifas.' }, { status: 500 })
  }
}

// Global price increase & manual price adjustments
export async function PUT(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const body = await request.json()
    const { action, listaId, porcentaje, recordId, precioPaqueteMin, precioCajaMin, precioPaqueteMax, precioCajaMax } = body

    if (!listaId) {
      return NextResponse.json({ error: 'ID de lista requerido.' }, { status: 400 })
    }

    if (action === 'aumento_global') {
      if (porcentaje === undefined || isNaN(porcentaje)) {
        return NextResponse.json({ error: 'Porcentaje de aumento inválido.' }, { status: 400 })
      }

      const multiplier = 1 + (porcentaje / 100)

      // Use raw SQL to execute batch multiplication
      await prisma.$executeRawUnsafe(
        `UPDATE "PrecioProducto" 
         SET "precioPaqueteMin" = "precioPaqueteMin" * $1,
             "precioCajaMin" = "precioCajaMin" * $1,
             "precioPaqueteMax" = "precioPaqueteMax" * $1,
             "precioCajaMax" = "precioCajaMax" * $1
         WHERE "listaId" = $2`,
        multiplier,
        listaId
      )

      return NextResponse.json({ success: true, message: `Aumento de ${porcentaje}% aplicado masivamente.` })
    }

    if (action === 'editar_precio') {
      if (!recordId) {
        return NextResponse.json({ error: 'ID del registro de precio es requerido.' }, { status: 400 })
      }

      await prisma.precioProducto.update({
        where: { id: recordId },
        data: {
          precioPaqueteMin: parseFloat(precioPaqueteMin) || 0,
          precioCajaMin: parseFloat(precioCajaMin) || 0,
          precioPaqueteMax: parseFloat(precioPaqueteMax) || 0,
          precioCajaMax: parseFloat(precioCajaMax) || 0
        }
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'toggle_activa') {
      const existing = await prisma.listaPrecio.findUnique({ where: { id: listaId } })
      if (!existing) return NextResponse.json({ error: 'Lista no encontrada.' }, { status: 404 })

      await prisma.listaPrecio.update({
        where: { id: listaId },
        data: { activa: !existing.activa }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
  } catch (error: any) {
    console.error('[API PUT Tarifas]', error)
    return NextResponse.json({ error: 'Error al actualizar las tarifas.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')
    if (!idStr) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })

    const id = parseInt(idStr)
    await prisma.listaPrecio.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API DELETE Tarifas]', error)
    return NextResponse.json({ error: 'Error al eliminar tarifario.' }, { status: 500 })
  }
}
