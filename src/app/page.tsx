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
    redirect(`/zonas/${targetZone}`)
  } else {
    // For Supervisor (N2) or Admin (N1)
    const modules = typeof user.modulos === 'string' ? JSON.parse(user.modulos) : (user.modulos || {})
    
    // If Zonas module is disabled for this user
    if (modules.zonas === false) {
      if (modules.pedidos) redirect('/pedidos')
      if (modules.ventas) redirect('/ventas')
      if (modules.cobranzas) redirect('/cobranzas')
      if (modules.usuarios) redirect('/usuarios')
      if (modules.configuracion) redirect('/configuracion')
      redirect('/configuracion/productos')
    }

    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = typeof user.zonasHabilitadas === 'string' 
          ? JSON.parse(user.zonasHabilitadas) 
          : JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}

    if (enabledZones && enabledZones.length > 0) {
      targetZone = enabledZones[0]
      redirect(`/zonas/${targetZone}`)
    } else if (user.zona) {
      targetZone = user.zona
      redirect(`/zonas/${targetZone}`)
    } else {
      // If no zones are assigned but Zonas module is enabled (or not explicitly disabled)
      // Redirect to CABA to prevent breaking, but if they have no zones, CABA will redirect them in the page
      redirect('/zonas/CABA')
    }
  }
}
