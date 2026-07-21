import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import BandejaMensajesClient from './BandejaMensajesClient'

export const dynamic = 'force-dynamic'

export default async function MensajesPage() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const usuarios = await prisma.usuario.findMany({
    select: { alias: true, nombre: true }
  })

  return (
    <div className="flex flex-col h-full bg-[#0b1021] text-white p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-black mb-6 flex items-center gap-2">Bandeja de Mensajes Internos</h1>
      <BandejaMensajesClient userAlias={user.alias} usuarios={usuarios} />
    </div>
  )
}
