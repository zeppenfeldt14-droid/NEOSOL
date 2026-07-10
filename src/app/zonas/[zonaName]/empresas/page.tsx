import { prisma } from '@/lib/prisma'
import EmpresasClient from './EmpresasClient'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EmpresasPage({ params }: { params: Promise<{ zonaName: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)

  // Verify access permissions to this zone
  if (user.nivel === 3 && user.zona !== decodedZona) {
    redirect(`/zonas/${user.zona || 'CABA'}/empresas`)
  } else if (user.nivel === 2) {
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    if (!enabledZones.includes(decodedZona)) {
      redirect(`/zonas/${enabledZones[0] || 'CABA'}/empresas`)
    }
  }

  const isVendedor = user.nivel === 3
  const whereFilter = {
    zona: decodedZona,
    ...(isVendedor ? { vendedorAsignado: user.alias, ocultarVendedor: false } : {})
  }

  const empresasAll = await prisma.empresa.findMany({
    where: whereFilter,
    orderBy: { nombre: 'asc' },
    include: {
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 1
      }
    }
  })

  // Fetch available sub-zones in DB for this major zone
  const dbSubZonas = await prisma.subZona.findMany({
    where: { zona: decodedZona },
    orderBy: { nombre: 'asc' }
  })

  // Get unique sub-zones (combining predefined ones with actual company subZones)
  const subZonesSet = new Set<string>()
  dbSubZonas.forEach(sz => subZonesSet.add(sz.nombre.trim().toUpperCase()))
  empresasAll.forEach(emp => {
    if (emp.subZona) {
      subZonesSet.add(emp.subZona.trim().toUpperCase())
    }
  })
  subZonesSet.add('SIN ASIGNAR')
  subZonesSet.add('CORREO')

  const subZones = Array.from(subZonesSet).sort()

  return (
    <EmpresasClient empresas={empresasAll} zonas={subZones} />
  )
}

