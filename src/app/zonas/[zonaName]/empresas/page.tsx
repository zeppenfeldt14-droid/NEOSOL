import { prisma } from '@/lib/prisma'
import EmpresasClient from './EmpresasClient'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EmpresasPage() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const isVendedor = user.nivel === 3
  const whereFilter = isVendedor ? { vendedorAsignado: user.alias } : {}

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

  // Get unique zones
  const zonesSet = new Set<string>()
  empresasAll.forEach(emp => {
    if (emp.zona) zonesSet.add(emp.zona.trim().toUpperCase())
  })
  const zones = Array.from(zonesSet).sort()

  return (
    <EmpresasClient empresas={empresasAll} zonas={zones} />
  )
}

