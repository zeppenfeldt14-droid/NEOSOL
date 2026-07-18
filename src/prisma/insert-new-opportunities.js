const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const OPORTUNIDADES = [
  {
    nombre: "Distribuidora Pop",
    direccion: "Gral. Roca 4298, Florida Oeste (B1604), Vicente López, Buenos Aires. Tienen alcance y logística de entrega en toda CABA",
    telefono: "+54 11 3952-8296",
    url: "www.distribuidorapop.com.ar",
    rubro: "CATEGORIA 1",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  },
  {
    nombre: "Autoservicio Mayorista Diarco S.A.",
    direccion: "Av. Circunvalación s/n, entre El Tallo y Los Frutos, Villa Celina. Además, operan una amplia red de sucursales 'Diarco Barrio' distribuidas capilarmente por toda CABA (Barracas, Almagro, Caballito, Flores, etc.)",
    telefono: "(011) 5082-8000 (Central)",
    url: "www.diarco.com.ar",
    rubro: "CATEGORIA 3",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  },
  {
    nombre: "Distribuidora Segurola",
    direccion: "Av. Lope de Vega 924, CABA. También cuentan con locales minoristas en Av. Segurola 328, Emilio Lamarca 1988 y Nogoyá 3040",
    telefono: "+54 9 11 3087 0181 (WhatsApp exclusivo Mayorista)",
    url: "distribuidorasegurola.com.ar",
    rubro: "CATEGORIA 4",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  },
  {
    nombre: "Distribuidora El Almacén",
    direccion: "Larguia 3747, Buenos Aires",
    telefono: "11 3141-3275",
    url: "distribuidoraelalmacen.com.ar",
    rubro: "CATEGORIA 2",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  },
  {
    nombre: "El Saleciano",
    direccion: "Operan con distribución logística en todo Buenos Aires (CABA) y a nivel país",
    telefono: "11-6416-4650 (WhatsApp)",
    url: "saleciano.com.ar",
    rubro: "CATEGORIA 2",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  },
  {
    nombre: "Barracas al Sur (BASLOG S.R.L.)",
    direccion: "Mendoza 1955, Avellaneda (1870), Provincia de Buenos Aires",
    telefono: "0800-222-7564 / (011) 4208-6783 / (011) 4218-1793. WhatsApp: +54 9 11 3733 7445",
    url: "www.barracasalsur.com",
    rubro: "CATEGORIA 2",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  },
  {
    nombre: "Logística y Distribución Sur",
    direccion: "Niceto Vega 5309, C1414, CABA",
    telefono: "11-4475-3198 / 11-4979-7949",
    url: "logisticaydistribucionsur.com.ar",
    rubro: "CATEGORIA 7",
    zona: "CABA",
    subZona: "SIN ASIGNAR",
    estado: "prospecto"
  }
]

async function main() {
  console.log('Insertando nuevas oportunidades en CABA...')
  for (const op of OPORTUNIDADES) {
    const exists = await prisma.empresa.findFirst({
      where: { nombre: op.nombre }
    })
    
    if (exists) {
      console.log(`La empresa "${op.nombre}" ya existe en la base de datos. Saltando...`)
      continue
    }

    await prisma.empresa.create({
      data: op
    })
    console.log(`Creada nueva oportunidad: "${op.nombre}" en rubro ${op.rubro}`)
  }
  console.log('Inserción completada.')
}

main()
  .catch(console.error)
