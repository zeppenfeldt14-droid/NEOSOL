import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

async function fetchNominatimGeojson(barrios: string[]): Promise<any[]> {
  const features: any[] = []
  for (const barrio of barrios) {
    try {
      const q = encodeURIComponent(`${barrio}, Buenos Aires, Argentina`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${q}`, {
        headers: { 'User-Agent': 'NeosolCRM/1.0' }
      })
      const data = await res.json()
      const geoItem = data.find((item: any) => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'))
      if (geoItem && geoItem.geojson) {
        features.push({
          type: 'Feature',
          properties: { name: barrio },
          geometry: geoItem.geojson
        })
      }
      await new Promise(r => setTimeout(r, 600))
    } catch (e) {
      console.error('[Nominatim error for barrio]', barrio, e)
    }
  }
  return features
}

export async function PUT(request: Request, { params }: { params: Promise<{ zonaName: string }> }) {
  try {
    const { zonaName } = await params
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren privilegios de Administrador.' }, { status: 403 })
    }

    const zonaNameDecoded = decodeURIComponent(zonaName).trim().toUpperCase()
    const existing = await prisma.zona.findFirst({
      where: { nombre: { equals: zonaNameDecoded, mode: 'insensitive' } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Zona no encontrada.' }, { status: 404 })
    }

    const body = await request.json()
    const { color, barrios, regenerarGeojson } = body

    // Build update payload — color is always saved if provided
    const updateData: any = {}
    if (color !== undefined && color !== null) updateData.color = color
    
    if (barrios !== undefined && Array.isArray(barrios)) {
      updateData.barrios = barrios
      if (barrios.length === 0) {
        updateData.geojson = null
      }
    }

    // If nothing to update, return early
    if (Object.keys(updateData).length === 0 && !regenerarGeojson) {
      return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 })
    }

    // Save immediately to DB
    const updatedZona = await prisma.zona.update({
      where: { id: existing.id },
      data: updateData
    })

    // Determine which barrios to use for GeoJSON
    const barriosParaGeojson = regenerarGeojson
      ? (existing.barrios as string[] || [])
      : (barrios && Array.isArray(barrios) && barrios.length > 0 ? barrios : null)

    // Fetch polygons in background asynchronously
    if (barriosParaGeojson && barriosParaGeojson.length > 0) {
      ;(async () => {
        try {
          const features = await fetchNominatimGeojson(barriosParaGeojson)
          if (features.length > 0) {
            await prisma.zona.update({
              where: { id: existing.id },
              data: { geojson: { type: 'FeatureCollection', features } }
            })
            console.log(`[Territorio] GeoJSON actualizado para "${existing.nombre}" con ${features.length} polígonos`)
          } else {
            console.warn(`[Territorio] Nominatim no devolvió polígonos para "${existing.nombre}"`)
          }
        } catch (err) {
          console.error('[Background GeoJSON Generation]', err)
        }
      })()
    }

    return NextResponse.json({ success: true, zona: updatedZona })
  } catch (error: any) {
    console.error('[API PUT Zona Territorio]', error)
    return NextResponse.json({ error: 'Error al actualizar territorio.' }, { status: 500 })
  }
}

