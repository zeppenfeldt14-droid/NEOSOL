import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const CLAVES = {
  MINIMO_CAJAS: 'MINIMO_CAJAS_VOLUMEN',
  LIMITE_LISTA_A: 'LIMITE_LISTA_A_SIN_VOLUMEN',
}

const DEFAULTS = {
  MINIMO_CAJAS_VOLUMEN: '300',
  LIMITE_LISTA_A_SIN_VOLUMEN: '60',
}

// GET: Returns current sales rules
export async function GET() {
  try {
    const registros = await prisma.configuracionSistema.findMany({
      where: { clave: { in: Object.values(CLAVES) } }
    })

    const map: Record<string, string> = {}
    for (const r of registros) {
      map[r.clave] = r.valor
    }

    return NextResponse.json({
      minimoCajas: parseInt(map[CLAVES.MINIMO_CAJAS] ?? DEFAULTS.MINIMO_CAJAS_VOLUMEN),
      limiteListaA: parseInt(map[CLAVES.LIMITE_LISTA_A] ?? DEFAULTS.LIMITE_LISTA_A_SIN_VOLUMEN),
    })
  } catch (error) {
    console.error('[GET /api/configuracion/reglas]', error)
    return NextResponse.json({ error: 'Error al obtener reglas.' }, { status: 500 })
  }
}

// POST: Updates sales rules (Nivel 1 only)
export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    if (session.nivel !== 1) return NextResponse.json({ error: 'Solo Gerencia (Nivel 1) puede modificar estas reglas.' }, { status: 403 })

    const body = await request.json()
    const { minimoCajas, limiteListaA } = body

    if (minimoCajas !== undefined) {
      const val = parseInt(minimoCajas)
      if (isNaN(val) || val < 1) return NextResponse.json({ error: 'Mínimo de cajas inválido.' }, { status: 400 })
      await prisma.configuracionSistema.upsert({
        where: { clave: CLAVES.MINIMO_CAJAS },
        create: { clave: CLAVES.MINIMO_CAJAS, valor: String(val), descripcion: 'Mínimo de cajas para tarifa por volumen' },
        update: { valor: String(val) },
      })
    }

    if (limiteListaA !== undefined) {
      const val = parseInt(limiteListaA)
      if (isNaN(val) || val < 0 || val > 100) return NextResponse.json({ error: 'Límite Lista A debe ser entre 0 y 100.' }, { status: 400 })
      await prisma.configuracionSistema.upsert({
        where: { clave: CLAVES.LIMITE_LISTA_A },
        create: { clave: CLAVES.LIMITE_LISTA_A, valor: String(val), descripcion: 'Límite Lista A sin volumen (%)' },
        update: { valor: String(val) },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/configuracion/reglas]', error)
    return NextResponse.json({ error: 'Error al guardar reglas.' }, { status: 500 })
  }
}
