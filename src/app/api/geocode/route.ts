import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// Geocodifica empresas que tienen dirección pero no tienen coordenadas
// usando Nominatim (OpenStreetMap) — gratuito, sin API key
export async function POST() {
  const user = await getSessionUser()
  if (!user || user.nivel > 2) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener empresas sin coordenadas que tienen dirección
  const empresasSinGeo = await prisma.empresa.findMany({
    where: {
      direccion: { not: null },
      OR: [
        { latitud: null },
        { longitud: null }
      ]
    },
    select: { id: true, nombre: true, direccion: true, zona: true },
    take: 50  // Procesamos de a 50 para no sobrecargar la API
  })

  if (empresasSinGeo.length === 0) {
    return NextResponse.json({ message: 'Todas las empresas ya tienen coordenadas', updated: 0 })
  }

  let updated = 0
  let failed = 0

  for (const empresa of empresasSinGeo) {
    if (!empresa.direccion) continue

    // Build query: dirección + zona + Argentina
    const query = `${empresa.direccion}, ${empresa.zona || 'CABA'}, Argentina`
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&countrycodes=ar`

    try {
      const response = await fetch(url, {
        headers: {
          // Required by Nominatim's usage policy
          'User-Agent': 'NEOSOL-CRM/1.0 (contact@neosol.com)'
        }
      })

      if (!response.ok) continue

      const results = await response.json()

      if (results && results.length > 0) {
        const { lat, lon } = results[0]
        
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            latitud: parseFloat(lat),
            longitud: parseFloat(lon)
          }
        })
        updated++
      } else {
        failed++
      }

      // Rate limit: Nominatim requires at least 1 request per second
      await new Promise(resolve => setTimeout(resolve, 1100))

    } catch (error) {
      console.error(`Error geocoding empresa ${empresa.id}:`, error)
      failed++
    }
  }

  return NextResponse.json({
    message: `Geocodificación completada`,
    updated,
    failed,
    remaining: await prisma.empresa.count({
      where: {
        OR: [{ latitud: null }, { longitud: null }],
        direccion: { not: null }
      }
    })
  })
}

// GET — devuelve estadísticas de geocodificación
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [totalConGeo, totalSinGeo, total] = await Promise.all([
    prisma.empresa.count({ where: { NOT: [{ latitud: null }, { longitud: null }] } }),
    prisma.empresa.count({ where: { OR: [{ latitud: null }, { longitud: null }] } }),
    prisma.empresa.count()
  ])

  return NextResponse.json({ total, totalConGeo, totalSinGeo })
}
