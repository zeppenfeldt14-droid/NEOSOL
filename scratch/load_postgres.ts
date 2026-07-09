import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const dumpPath = path.join('prisma', 'dump.json')
  if (!fs.existsSync(dumpPath)) {
    console.error("Dump file not found!")
    return
  }

  const rawData = fs.readFileSync(dumpPath, 'utf-8')
  const data = JSON.parse(rawData)

  console.log("Starting data migration to PostgreSQL...")

  // Disable triggers if needed, but since we go in order it should be fine.
  
  // 1. Empresa
  if (data.Empresa) {
    console.log(`Migrating ${data.Empresa.length} Empresas...`)
    for (const item of data.Empresa) {
      // Map fields and handle date conversions
      await prisma.empresa.create({
        data: {
          id: item.id,
          zona: item.zona,
          nombre: item.nombre,
          cuit: item.cuit,
          direccion: item.direccion,
          direccionFiscal: item.direccionFiscal,
          barrio: item.barrio,
          partido: item.partido,
          telefono: item.telefono,
          email: item.email,
          responsable: item.responsable,
          contactoCobranzas: item.contactoCobranzas,
          diasPago: item.diasPago,
          vendedorAsignado: item.vendedorAsignado,
          actividad: item.actividad,
          productosInteres: item.productosInteres,
          transporte: item.transporte,
          url: item.url,
          googleMaps: item.googleMaps,
          notas: item.notas,
          estado: item.estado,
          motivoBaja: item.motivoBaja,
          fechaBaja: item.fechaBaja ? new Date(item.fechaBaja) : null,
          frecuenciaVisita: item.frecuenciaVisita,
          cicloVentaDias: item.cicloVentaDias,
          creadoEn: new Date(item.creadoEn),
          actualizadoEn: new Date(item.actualizadoEn)
        }
      })
    }
  }

  // 2. Visita
  if (data.Visita) {
    console.log(`Migrating ${data.Visita.length} Visitas...`)
    for (const item of data.Visita) {
      await prisma.visita.create({
        data: {
          id: item.id,
          empresaId: item.empresaId,
          fecha: new Date(item.fecha),
          tipo: item.tipo,
          resultado: item.resultado,
          contacto: item.contacto,
          cargo: item.cargo,
          notas: item.notas,
          proximaAccion: item.proximaAccion,
          creadoEn: new Date(item.creadoEn)
        }
      })
    }
  }

  // 3. Accion
  if (data.Accion) {
    console.log(`Migrating ${data.Accion.length} Acciones...`)
    for (const item of data.Accion) {
      await prisma.accion.create({
        data: {
          id: item.id,
          empresaId: item.empresaId,
          tipo: item.tipo,
          descripcion: item.descripcion,
          fechaVencimiento: item.fechaVencimiento ? new Date(item.fechaVencimiento) : null,
          prioridad: item.prioridad,
          estado: item.estado,
          orden: item.orden,
          completadaEn: item.completadaEn ? new Date(item.completadaEn) : null,
          creadoEn: new Date(item.creadoEn)
        }
      })
    }
  }

  // 4. Alerta
  if (data.Alerta) {
    console.log(`Migrating ${data.Alerta.length} Alertas...`)
    for (const item of data.Alerta) {
      await prisma.alerta.create({
        data: {
          id: item.id,
          empresaId: item.empresaId,
          tipo: item.tipo,
          mensaje: item.mensaje,
          diasConfiguracion: item.diasConfiguracion,
          fechaActivacion: item.fechaActivacion ? new Date(item.fechaActivacion) : null,
          activa: item.activa === 1 || item.activa === true,
          creadoEn: new Date(item.creadoEn)
        }
      })
    }
  }

  // 5. ConfiguracionSistema
  if (data.ConfiguracionSistema) {
    console.log(`Migrating ${data.ConfiguracionSistema.length} Configuraciones...`)
    for (const item of data.ConfiguracionSistema) {
      await prisma.configuracionSistema.create({
        data: {
          id: item.id,
          clave: item.clave,
          valor: item.valor,
          descripcion: item.descripcion
        }
      })
    }
  }

  console.log("Updating sequence values in PostgreSQL...")
  // Set autoincrement sequence counters to max id to avoid duplicate key errors later
  const tables = ['Empresa', 'Visita', 'Accion', 'Alerta', 'ConfiguracionSistema']
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 1)) FROM "${table}";`
    )
  }

  console.log("Migration completed successfully!")
}

main()
  .catch(e => {
    console.error("Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
