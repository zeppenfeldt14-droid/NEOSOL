import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser, registrarAccion } from '@/lib/auth'

export async function POST() {
  try {
    const user = await getSessionUser()
    
    if (user) {
      // Log logout in the global audit trail
      await registrarAccion(
        user.id,
        user.alias,
        'LOGOUT',
        `Cierre de sesión del usuario @${user.alias}`
      )
    }

    // Delete cookie
    const cookieStore = await cookies()
    cookieStore.delete('neosol_session')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API Logout] Error:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión.' },
      { status: 500 }
    )
  }
}
