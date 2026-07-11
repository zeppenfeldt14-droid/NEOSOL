import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { ZonaVentasClient } from './ZonaVentasClient'

export default async function ZonaVentasPage({ params }: { params: { zonaName: string } }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const decodedZona = decodeURIComponent(params.zonaName)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 fade-in">
      <ZonaVentasClient zonaName={decodedZona} userNivel={user.nivel} userAlias={user.alias} />
    </div>
  )
}
