import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NuevoPedidoClient } from './NuevoPedidoClient'
import jwt from 'jsonwebtoken'

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('neosol_session')?.value
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'neosol_secret_key_2026') as {
      id: number; nombre: string; alias: string; nivel: number; zona: string | null
    }
  } catch { return null }
}

export default async function NuevoPedidoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <NuevoPedidoClient
      userNivel={session.nivel}
      userAlias={session.alias}
      userZona={session.zona}
    />
  )
}
