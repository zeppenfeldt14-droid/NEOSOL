import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { UsuariosPageClient } from './UsuariosPageClient'

export default async function UsuariosPage() {
  const session = await getSessionUser()
  
  if (!session) {
    redirect('/login')
  }
  
  // Solo Nivel 1 y 2 pueden acceder a este módulo
  if (session.nivel > 2) {
    redirect('/planificador')
  }
  
  return (
    <div className="flex-1 w-full flex flex-col relative h-full">
      <UsuariosPageClient currentUser={session} />
    </div>
  )
}
