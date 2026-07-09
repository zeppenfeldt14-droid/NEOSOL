import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export default async function IndexPage() {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get active zone for the user
  let targetZone = 'CABA'

  if (user.nivel === 3) {
    targetZone = user.zona || 'CABA'
  } else {
    // For Supervisor (N2) or Admin (N1)
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}

    if (enabledZones && enabledZones.length > 0) {
      targetZone = enabledZones[0]
    } else if (user.zona) {
      targetZone = user.zona
    }
  }

  redirect(`/zonas/${targetZone}`)
}
