import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// Geocodifica empresas que tienen dirección pero no tienen coordenadas
// usando Nominatim (OpenStreetMap) — gratuito, sin API key
// Helper function to normalize addresses and handle abbreviations
function cleanAddress(addr: string): string {
  let cleaned = addr
  
  // Diccionario de abreviaturas comunes
  const dict = {
    'av.': 'Avenida',
    'av ': 'Avenida ',
    'gral.': 'General',
    'gral ': 'General ',
    'cap.': 'Capitán',
    'cap ': 'Capitán ',
    'pte.': 'Presidente',
    'pte ': 'Presidente ',
    'diag.': 'Diagonal',
    'rbla.': 'Rambla',
    'cdad.': 'Ciudad',
    'cdad': 'Ciudad',
    'pcia.': 'Provincia',
    'pcia': 'Provincia',
    'b°': 'Barrio'
  }

  // Ignorar mayúsculas/minúsculas para el reemplazo
  for (const [key, value] of Object.entries(dict)) {
    const regex = new RegExp(`\\b${key.replace('.', '\\.')}`, 'gi')
    cleaned = cleaned.replace(regex, value)
  }
  
  return cleaned.trim()
}

// Extract locality (partido) from comma-separated address
function extractLocality(addr: string): string | null {
  const parts = addr.split(',').map(p => p.trim())
  if (parts.length >= 3) {
    // Usually: Street 123, Locality, Province
    return parts[1]
  }
  return null
}

export async function POST() {
  const user = await getSessionUser()
  if (!user || user.nivel > 3) {
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
    select: { id: true, nombre: true, direccion: true, zona: true, partido: true },
    take: 50  // Procesamos de a 50 para no sobrecargar la API
  })

  if (empresasSinGeo.length === 0) {
    return NextResponse.json({ message: 'Todas las empresas ya tienen coordenadas', updated: 0 })
  }

  let updated = 0
  let failed = 0

  for (const empresa of empresasSinGeo) {
    if (!empresa.direccion) continue

    const originalAddress = empresa.direccion
    const cleanedAddress = cleanAddress(originalAddress)
    const newPartido = extractLocality(originalAddress)
    
    // First attempt: Exact address
    const exactQuery = `${cleanedAddress}, ${empresa.zona || 'CABA'}, Argentina`
    
    // Second attempt: Fallback (remove numbers from the street to just get the street/area)
    // Regex to remove the street number e.g. "Avenida Eva Peron 2465" -> "Avenida Eva Peron"
    let fallbackQuery = ''
    if (cleanedAddress.includes(',')) {
       // If it has commas, use the street part without numbers + the rest
       const parts = cleanedAddress.split(',')
       const streetPart = parts[0].replace(/\d+/g, '').trim()
       fallbackQuery = `${streetPart}, ${parts.slice(1).join(',')}, Argentina`
    } else {
       const streetPart = cleanedAddress.replace(/\d+/g, '').trim()
       fallbackQuery = `${streetPart}, ${empresa.zona || 'CABA'}, Argentina`
    }

    let lat = null
    let lon = null

    // Try exact query
    try {
      const url1 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(exactQuery)}&format=json&limit=1&addressdetails=1&countrycodes=ar`
      const res1 = await fetch(url1, { headers: { 'User-Agent': 'NEOSOL-CRM/1.0 (contact@neosol.com)' } })
      if (res1.ok) {
        const data1 = await res1.json()
        if (data1 && data1.length > 0) {
          lat = parseFloat(data1[0].lat)
          lon = parseFloat(data1[0].lon)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1100))

      // If exact fails, try fallback
      if (lat === null && fallbackQuery) {
        const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1&addressdetails=1&countrycodes=ar`
        const res2 = await fetch(url2, { headers: { 'User-Agent': 'NEOSOL-CRM/1.0 (contact@neosol.com)' } })
        if (res2.ok) {
          const data2 = await res2.json()
          if (data2 && data2.length > 0) {
            lat = parseFloat(data2[0].lat)
            lon = parseFloat(data2[0].lon)
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1100))
      }

      if (lat !== null && lon !== null) {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            latitud: lat,
            longitud: lon,
            partido: empresa.partido || newPartido // Update locality if it didn't have one
          }
        })
        updated++
      } else {
        // Even if we fail geocoding, we might have successfully extracted the locality
        if (!empresa.partido && newPartido) {
          await prisma.empresa.update({
            where: { id: empresa.id },
            data: { partido: newPartido }
          })
        }
        failed++
      }

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
