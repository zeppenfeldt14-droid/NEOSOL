import { prisma } from '@/lib/prisma'
import PreciosPublicosClient from './PreciosPublicosClient'

export const dynamic = 'force-dynamic'

export default async function PreciosPublicosPage() {
  // Query all price lists ordered by active state and date
  const priceLists = await prisma.listaPrecio.findMany({
    orderBy: [
      { activa: 'desc' },
      { vigenteDesde: 'desc' }
    ],
    include: {
      precios: true
    }
  })

  // Get active list to set as default in client component
  const now = new Date()
  const activeList = priceLists.find(l => l.activa && new Date(l.vigenteDesde) <= now) || priceLists[0] || null
  const activeListId = activeList ? activeList.id : null

  // Fetch all active products
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: [
      { linea: 'asc' },
      { nombre: 'asc' }
    ]
  })

  return (
    <PreciosPublicosClient 
      productos={productos} 
      priceLists={priceLists} 
      activeListId={activeListId} 
    />
  )
}
