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

import { Suspense } from 'react'

export default async function NuevoPedidoPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary text-sm">Cargando...</p>
        </div>
      </div>
    }>
      <NuevoPedidoClient
        userNivel={session.nivel}
        userAlias={session.alias}
        userZona={session.zona}
      />
    </Suspense>
  )
}
