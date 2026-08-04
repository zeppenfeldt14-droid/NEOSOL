import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

function extractLocality(addr: string): string | null {
  if (!addr) return null
  const parts = addr.split(',').map(p => p.trim())
  if (parts.length >= 3) {
    return parts[1]
  }
  return null
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { empresas } = await request.json()
    if (!empresas || !Array.isArray(empresas)) {
      return NextResponse.json({ error: 'Formato de datos inválido' }, { status: 400 })
    }

    let successCount = 0
    let ignoredCount = 0

    // Fetch existing companies to check for duplicates
    // We check by exact name (case insensitive) or exact phone
    const existingEmpresas = await prisma.empresa.findMany({
      select: { nombre: true, telefono: true }
    })

    const existingNames = new Set(existingEmpresas.map(e => e.nombre.toLowerCase().trim()))
    const existingPhones = new Set(existingEmpresas.map(e => e.telefono?.trim()).filter(Boolean))

    const empresasToCreate = []

    for (const emp of empresas) {
      const nombreNorm = (emp.nombre || '').toLowerCase().trim()
      const telefonoNorm = (emp.telefono || '').trim()

      if (!nombreNorm) continue // Skip empty rows

      const isDuplicateByName = existingNames.has(nombreNorm)
      const isDuplicateByPhone = telefonoNorm && existingPhones.has(telefonoNorm)

      if (isDuplicateByName || isDuplicateByPhone) {
        ignoredCount++
      } else {
        const direccionClean = emp.direccion?.trim() || null
        const localidad = extractLocality(direccionClean || '')
        empresasToCreate.push({
          nombre: emp.nombre.trim(),
          telefono: telefonoNorm || null,
          direccion: direccionClean,
          partido: localidad,
          barrio: localidad, // Populate the Location (Localidad) field
          subZona: null, // Keep Mini-Zonas unchanged (they will be SIN ASIGNAR)
          rubro: emp.rubro?.trim() || null,
          zona: emp.zona,
          estado: 'prospecto', // Default to prospecto as discussed
          vendedorAsignado: user.nivel === 3 ? user.alias : null
        })
        
        // Add to sets to prevent duplicates WITHIN the imported file itself
        existingNames.add(nombreNorm)
        if (telefonoNorm) existingPhones.add(telefonoNorm)
      }
    }

    if (empresasToCreate.length > 0) {
      const result = await prisma.empresa.createMany({
        data: empresasToCreate,
        skipDuplicates: true
      })
      successCount = result.count
    }

    return NextResponse.json({ 
      success: successCount,
      ignored: ignoredCount
    })

  } catch (error: any) {
    console.error('[API Import Empresas]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
