import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// Geocodifica empresas que tienen dirección pero no tienen coordenadas
// usando Nominatim (OpenStreetMap) — gratuito, sin API key
// Helper function to normalize addresses and handle abbreviations
function cleanAddress(addr: string): string {
  let cleaned = addr
  
  // Diccionario de abreviaturas y correcciones ortográficas comunes
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
    'b°': 'Barrio',
    'contitucion': 'Constitucion',
    'esmaralda': 'Esmeralda',
    'piso': '',
    'depto': '',
    'pb': ''
  }

  // Ignorar mayúsculas/minúsculas para el reemplazo
  for (const [key, value] of Object.entries(dict)) {
    // Escapar correctamente cualquier carácter especial de la clave
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escapedKey}`, 'gi')
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
    select: { id: true, nombre: true, direccion: true, zona: true, partido: true, barrio: true },
    take: 10  // Reducido a 10 para evitar timeouts (10 * 2s = 20s max)
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
    
    // Diccionario de traducción de zonas internas a localidades reconocibles
    const ZONA_A_LOCALIDAD: Record<string, string> = {
      'GBA NORTE':  'Gran Buenos Aires Norte',
      'GBA SUR':    'Gran Buenos Aires Sur',
      'GBA OESTE':  'Morón, Buenos Aires',
      'GBA ESTE':   'Quilmes, Buenos Aires',
      'CABA':       'Ciudad Autónoma de Buenos Aires',
      'ZONA NORTE': 'Gran Buenos Aires Norte',
      'ZONA SUR':   'Gran Buenos Aires Sur',
      'ZONA OESTE': 'Morón, Buenos Aires',
      'ZONA ESTE':  'Quilmes, Buenos Aires',
    }

    // Limpiar código postal del barrio si lo tiene (ej: "B1870 Quilmes Oeste" -> "Quilmes Oeste")
    const cleanBarrio = empresa.barrio?.replace(/^[A-Z]?\d{4,5}\s+/i, '').trim() || null
    
    const locality = cleanBarrio || empresa.partido || ZONA_A_LOCALIDAD[empresa.zona || ''] || 'Buenos Aires'
    
    // First attempt: Exact address using clean barrio/partido
    const exactQuery = `${cleanedAddress}, ${locality}, Argentina`
    
    // Second attempt: Fallback 1 (remove extra text separated by commas)
    let fallbackQuery1 = ''
    let streetNameOnly = '' // Only street name without numbers
    let streetNameWithNumber = '' // Street name WITH numbers

    if (cleanedAddress.includes(',')) {
       const parts = cleanedAddress.split(',')
       streetNameWithNumber = parts[0].trim()
       streetNameOnly = parts[0].replace(/\d+/g, '').trim()
       fallbackQuery1 = `${streetNameWithNumber}, ${locality}, Argentina`
    } else {
       streetNameWithNumber = cleanedAddress.trim()
       streetNameOnly = cleanedAddress.replace(/\d+/g, '').trim()
       fallbackQuery1 = `${streetNameWithNumber}, ${locality}, Argentina`
    }

    // Third attempt: Fallback 2 (just street name without number and the determined locality)
    const fallbackQuery2 = `${streetNameOnly}, ${locality}, Argentina`

    // Fourth attempt: Fallback 3 (just the locality, marking the center of the area)
    const fallbackQuery3 = `${locality}, Argentina`

    let lat = null
    let lon = null

    // Helper function to fetch from Nominatim
    const fetchGeo = async (query: string) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&countrycodes=ar`
      const res = await fetch(url, { headers: { 'User-Agent': 'NEOSOL-CRM/1.0 (contact@neosol.com)' } })
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
        }
      }
      return null
    }

    // Try exact query
    try {
      let result = await fetchGeo(exactQuery)
      await new Promise(resolve => setTimeout(resolve, 1100))

      // If exact fails, try fallback 1 (Street with Number + Locality)
      if (!result && fallbackQuery1 && fallbackQuery1 !== exactQuery) {
        result = await fetchGeo(fallbackQuery1)
        await new Promise(resolve => setTimeout(resolve, 1100))
      }

      // If fallback 1 fails, try fallback 2 (Just Street without number + Locality)
      if (!result && fallbackQuery2 && fallbackQuery2 !== fallbackQuery1) {
        result = await fetchGeo(fallbackQuery2)
        await new Promise(resolve => setTimeout(resolve, 1100))
      }

      // If fallback 2 fails, try fallback 3 (Just Locality with jitter)
      if (!result && fallbackQuery3) {
        result = await fetchGeo(fallbackQuery3)
        await new Promise(resolve => setTimeout(resolve, 1100))
        if (result) {
          // Add jitter to avoid stacking all failed addresses perfectly on top of each other
          result.lat += (Math.random() - 0.5) * 0.01 // approx +- 500m
          result.lon += (Math.random() - 0.5) * 0.01
        }
      }

      if (result) {
        lat = result.lat
        lon = result.lon
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
