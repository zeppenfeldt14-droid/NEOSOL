import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProductosPageClient } from './ProductosPageClient'
import jwt from 'jsonwebtoken'

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('neosol_session')?.value
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: number; nombre: string; alias: string; nivel: number
    }
  } catch { return null }
}

export default async function ProductosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  // Only Level 1 can access price list management
  if (session.nivel !== 1) redirect('/configuracion')

  return <ProductosPageClient userNivel={session.nivel} />
}
