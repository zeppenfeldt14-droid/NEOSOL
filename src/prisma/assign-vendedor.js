const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const EMPRESAS_NUEVAS = [
  "Distribuidora Pop",
  "Autoservicio Mayorista Diarco S.A.",
  "Distribuidora Segurola",
  "Distribuidora El Almacén",
  "El Saleciano",
  "Barracas al Sur (BASLOG S.R.L.)",
  "Logística y Distribución Sur"
]

async function main() {
  console.log('Asignando vendedor "Elarez" y asegurando zona CABA para las nuevas oportunidades...')
  for (const name of EMPRESAS_NUEVAS) {
    const res = await prisma.empresa.updateMany({
      where: {
        nombre: {
          contains: name,
          mode: 'insensitive'
        }
      },
      data: {
        zona: 'CABA',
        vendedorAsignado: 'Elarez'
      }
    })
    console.log(`Actualizadas matching "${name}": ${res.count} registros.`)
  }
  console.log('Asignación completada.')
}

main()
  .catch(console.error)
