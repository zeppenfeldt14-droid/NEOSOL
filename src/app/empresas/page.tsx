import { prisma } from '@/lib/prisma'
import EmpresasClient from './EmpresasClient'

export const dynamic = 'force-dynamic'

export default async function EmpresasPage() {
  // Fetch all companies from DB. Filtering will be handled purely on the client side
  // using React state, replicating the logic requested from Margarita Viajes.
  const empresasAll = await prisma.empresa.findMany({
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
