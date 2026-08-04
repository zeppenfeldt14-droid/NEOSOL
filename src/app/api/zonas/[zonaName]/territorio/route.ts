import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

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
    const { color, barrios } = body

    const updateData: any = {}
    if (color) updateData.color = color
    if (barrios && Array.isArray(barrios)) {
      updateData.barrios = barrios
      // Clear geojson if barrios is empty
      if (barrios.length === 0) {
        updateData.geojson = null
      }
    }

    const updatedZona = await prisma.zona.update({
      where: { id: existing.id },
      data: updateData
    })

    // Fetch polygons in background asynchronously without blocking the user response
    if (barrios && Array.isArray(barrios) && barrios.length > 0) {
      (async () => {
        try {
          const features = []
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
              console.error('[Nominatim background error]', e)
            }
          }

          if (features.length > 0) {
            await prisma.zona.update({
              where: { id: existing.id },
              data: { geojson: { type: 'FeatureCollection', features } }
            })
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
