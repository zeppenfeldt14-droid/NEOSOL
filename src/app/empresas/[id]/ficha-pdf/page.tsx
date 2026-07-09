import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import FichaPDFClient from './FichaPDFClient'

export const dynamic = 'force-dynamic'

export default async function FichaPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresaId = parseInt(id)
  
  if (isNaN(empresaId)) notFound()

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId }
  })

  if (!empresa) notFound()

  // Serializar la empresa para pasar al cliente sin problemas de fechas
  const serializedEmpresa = {
    ...empresa,
    creadoEn: empresa.creadoEn.toISOString(),
    actualizadoEn: empresa.actualizadoEn.toISOString(),
  }

  return <FichaPDFClient empresa={serializedEmpresa} />
}
