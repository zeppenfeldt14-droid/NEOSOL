import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// Helper para parsear fecha DD-MM-YYYY a Date
function parseFecha(fecha: string): Date | null {
  const p = fecha.split('-')
  if (p.length < 3) return null
  const d = parseInt(p[0]), m = parseInt(p[1]) - 1, y = parseInt(p[2])
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null
  return new Date(y, m, d)
}



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const zonaParam = searchParams.get('zona') // zona de la página que se está navegando

    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let whereClause: any = {}

    // RBAC por nivel de usuario en tabla Empresa
    if (session.nivel === 2) {
      // Supervisor: solo ve sus zonas habilitadas
      let zonas: string[] = []
      if (Array.isArray(session.zonasHabilitadas)) zonas = [...session.zonasHabilitadas]
      if (session.zona && !zonas.includes(session.zona)) zonas.push(session.zona)
      whereClause.empresa = { zona: { in: zonas } }
    } else if (session.nivel >= 3) {
      // Vendedor: solo su zona y sus clientes
      whereClause.empresa = { zona: session.zona || '', vendedorAsignado: session.alias }
    }
    // Nivel 1 (Gerencia): sin filtro de zona por defecto

    // Filtro adicional por zona de la página navegada (aplica a todos los niveles)
    if (zonaParam) {
      if (!whereClause.empresa) whereClause.empresa = {}
      
      if (whereClause.empresa.zona && typeof whereClause.empresa.zona === 'object' && 'in' in whereClause.empresa.zona) {
        // Supervisor: intersección de zonas habilitadas con la zona solicitada
        const allowed = whereClause.empresa.zona.in as string[]
        if (allowed.includes(zonaParam)) {
          whereClause.empresa.zona = zonaParam
        } else {
          return NextResponse.json({ reportes: [] }) // sin acceso
        }
      } else if (whereClause.empresa.zona && whereClause.empresa.zona !== zonaParam) {
        // Vendedor: no puede ver otra zona
        return NextResponse.json({ reportes: [] })
      } else {
        // Gerencia: limitar a la zona navegada
        whereClause.empresa.zona = zonaParam
      }
    }

    // Filtro de periodo
    if (period !== null && period !== undefined && period !== '') {
      const year = new Date().getFullYear()
      if (period.startsWith('Q')) {
        const q = parseInt(period.replace('Q', ''))
        const startDate = new Date(year, (q - 1) * 3, 1)
        const endDate = new Date(year, q * 3, 0, 23, 59, 59)
        whereClause.fecha = { gte: startDate, lte: endDate }
      } else {
        const month = parseInt(period)
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59)
        whereClause.fecha = { gte: startDate, lte: endDate }
      }
    }

    // Obtener las visitas
    const visitasDB = await prisma.visita.findMany({
      where: whereClause,
      include: { empresa: true },
      orderBy: { fecha: 'desc' }
    })

    // Agrupar visitas por día
    const gruposPorDia: Record<string, typeof visitasDB> = {}
    visitasDB.forEach(v => {
      const dayStr = v.fecha.toISOString().split('T')[0]
      if (!gruposPorDia[dayStr]) gruposPorDia[dayStr] = []
      gruposPorDia[dayStr].push(v)
    })

    // Obtener acciones pendientes en ese mismo rango (para enriquecer los reportes)
    let pendingWhereClause = { ...whereClause }
    if (pendingWhereClause.fecha) {
        pendingWhereClause.creadoEn = pendingWhereClause.fecha;
        delete pendingWhereClause.fecha;
    }
    const pendientesDB = await prisma.accion.findMany({
      where: pendingWhereClause,
      include: { empresa: true },
    })
    const pendientesPorDia: Record<string, typeof pendientesDB> = {}
    pendientesDB.forEach(p => {
      const dayStr = p.creadoEn.toISOString().split('T')[0]
      if (!pendientesPorDia[dayStr]) pendientesPorDia[dayStr] = []
      pendientesPorDia[dayStr].push(p)
    })

    const reportes = Object.keys(gruposPorDia).map(dayStr => {
      const dayParts = dayStr.split('-')
      const formattedDate = `${dayParts[2]}-${dayParts[1]}-${dayParts[0]}`
      const visitasDelDia = gruposPorDia[dayStr]
      const pendientesDelDia = pendientesPorDia[dayStr] || []
      
      const datosJSON = {
        fecha: formattedDate,
        vendedorAlias: session.alias,
        zona: zonaParam || 'CABA',
        visitas: visitasDelDia.map(v => ({
          id: v.id,
          empresaNombre: v.empresa.nombre,
          direccion: v.empresa.direccion,
          barrio: v.empresa.barrio,
          resultado: v.resultado,
          contacto: v.contacto,
          notas: v.notas,
          proximaAccion: v.proximaAccion
        })),
        pendientes: pendientesDelDia.map(p => ({
          id: p.id,
          empresaNombre: p.empresa.nombre,
          descripcion: p.descripcion,
          vencimiento: p.fechaVencimiento ? `${p.fechaVencimiento.getDate().toString().padStart(2, '0')}-${(p.fechaVencimiento.getMonth()+1).toString().padStart(2, '0')}-${p.fechaVencimiento.getFullYear()}` : 'Sin fecha',
          completada: p.estado !== 'pendiente'
        }))
      }

      return {
        id: dayStr, // Usamos la fecha YYYY-MM-DD como ID virtual
        filename: `${formattedDate}.pdf`,
        fecha: formattedDate,
        zona: zonaParam || 'CABA',
        vendedorAlias: session.alias,
        datosJSON,
        date: new Date(dayStr).toISOString(),
        isImage: false,
        size: 0
      }
    })

    // Ordenar descendente
    reportes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ reportes })
  } catch (error) {
    console.error('Error listing reports from database:', error)
    return NextResponse.json({ error: 'Error al listar reportes' }, { status: 500 })
  }
}
