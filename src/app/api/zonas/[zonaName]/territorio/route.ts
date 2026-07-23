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
    const existing = await prisma.zona.findUnique({
      where: { nombre: zonaNameDecoded }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Zona no encontrada.' }, { status: 404 })
    }

    const body = await request.json()
    const { color, barrios } = body

    if (!color && !barrios) {
      return NextResponse.json({ error: 'Faltan datos (color o barrios).' }, { status: 400 })
    }

    let mergedGeoJson: any = null

    // Si se envían barrios, descargamos la geometría
    if (barrios && Array.isArray(barrios)) {
      const features = []
      
      for (const barrio of barrios) {
        try {
          // Buscamos el polígono en Nominatim
          const q = encodeURIComponent(`${barrio}, Buenos Aires, Argentina`)
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${q}`, {
            headers: { 'User-Agent': 'NeosolCRM/1.0' }
          })
          const data = await res.json()
          
          // Tomamos el primer resultado que tenga un polígono
          const geoItem = data.find((item: any) => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'))
          
          if (geoItem && geoItem.geojson) {
            features.push({
              type: 'Feature',
              properties: { name: barrio },
              geometry: geoItem.geojson
            })
          }
          
          // Respetamos el límite de Nominatim de 1 req/s
          await new Promise(r => setTimeout(r, 1100))
        } catch (e) {
          console.error('[Nominatim error]', e)
        }
      }

      if (features.length > 0) {
        mergedGeoJson = {
          type: 'FeatureCollection',
          features
        }
      }
    }

    // Actualizamos la zona
    const updateData: any = {}
    if (color) updateData.color = color
    if (barrios) {
      updateData.barrios = barrios
      updateData.geojson = mergedGeoJson || null
    }

    const updatedZona = await prisma.zona.update({
      where: { id: existing.id },
      data: updateData
    })

    return NextResponse.json({ success: true, zona: updatedZona })
  } catch (error: any) {
    console.error('[API PUT Zona Territorio]', error)
    return NextResponse.json({ error: 'Error al actualizar territorio.' }, { status: 500 })
  }
}
