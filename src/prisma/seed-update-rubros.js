const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CATEGORIAS_EXTENDED = [
  'CATEGORIA 1',
  'CATEGORIA 2',
  'CATEGORIA 3',
  'CATEGORIA 4',
  'CATEGORIA 5',
  'CATEGORIA 6',
  'CATEGORIA 7',
  'CATEGORIA 8',
  'CATEGORIA 9',
  'CATEGORIA 10',
  'CATEGORIA 11'
]

const mapping = {
  "CATEGORIA 1": [
    "Distribuidora Mar y Mar Golosinas",
    "Distribuidora Mar y Mar Mataderos",
    "Sweet Market",
    "Varú - Mayorista de golosinas",
    "FIORITO Mayorista Golosinas-Galletitas",
    "Dulsisa Golosinas",
    "Dulcemanía",
    "Dulce Estilo",
    "Todo Dulce",
    "GOLO MAX",
    "Golocinas La Estacion",
    "La Golosinería",
    "La Golosinería ONCE",
    "Lado Dulce SRL",
    "Distribuidora Dulce Mania",
    "Distribuidora GOLO",
    "Golosineria Mayorista Av. Rivadavia 2181",
    "Los Gringos",
    "Demetrio",
    "Golosinas La Estación",
    "La Dolce S.R.L."
  ],
  "CATEGORIA 2": [
    "Distribuidora El Criollo",
    "Distribuidora PG"
  ],
  "CATEGORIA 3": [
    "Masivos S.A.",
    "Maxiconsumo S.A.",
    "Mayorista Makro",
    "Mayoristanet com",
    "Antonio Mayorista",
    "La casa de Lucas Mayorista"
  ],
  "CATEGORIA 4": [
    "Bufano Alimentos",
    "San Francisco - Fiambreria",
    "San Francisco -Fiambreria",
    "San Francisco - Fiambrería",
    "San Francisco (Fiambrerías)",
    "RES"
  ],
  "CATEGORIA 5": [
    "Zafiro Distribuidora",
    "Supermercado Casa China",
    "Supermercado Hua Fu Chen",
    "Supermercado Ichiban",
    "Supermercado Mayorista Asia Oriental"
  ],
  "CATEGORIA 6": [
    "Open 25",
    "Cartu 724 (Kioscos)",
    "The Best (Kioscos)",
    "Kioscos 365",
    "El Jevi"
  ],
  "CATEGORIA 7": [
    "Raz y Cía- Centro de Distribución",
    "Raz y Cía",
    "Pedidos YA"
  ],
  "CATEGORIA 8": [
    "Ciudad Cotillon (Show Party)",
    "Ciudad Cotillón (Show Party)",
    "Cotillomicymac",
    "Cotillón Casa Alberto",
    "COTY Mania",
    "TICORAL"
  ],
  "CATEGORIA 11": [
    "Hospital Gral. Agudos D. Vélez Sarsfield"
  ],
  "CATEGORIA 9": [
    "Golci SRL (Almacén de maquinarias)",
    "Dai Nippon S.A. (Perfumería)",
    "Danisant S.A. (Perfumería)",
    "Mercado de Galletitas",
    "Mercado de Galletitas (Casa particular)"
  ],
  "CATEGORIA 10": [
    "Distribuidora 20",
    "Distribuidora del Campo",
    "Distribuidora del Campo Alimentos",
    "Distribuidora Los Amigos",
    "Distribuidora OKS",
    "Distribuidora Rafaela S.A.",
    "Distribuidora Aranjuez",
    "Distribuidora Lentey",
    "Distribuidora Vichenzo",
    "Distribuidora Alpes",
    "CGA MANA DISTRIBUIDORA MAYORISTA",
    "La Preferida SRL",
    "Dankon S.R.L",
    "EL Puente",
    "El Totito",
    "El Virrey",
    "Fantoche",
    "Ma Distribución",
    "Mateo",
    "Treoland S.A.",
    "Galletitas Belgrano",
    "Los Bohemios",
    "Mayorista Magnum",
    "Homero",
    "Arcor Center"
  ]
}

async function main() {
  console.log('Sembrando categorías extendidas...')
  for (const cat of CATEGORIAS_EXTENDED) {
    await prisma.rubro.upsert({
      where: { nombre: cat },
      update: {},
      create: { nombre: cat }
    })
  }
  console.log('Sembrado finalizado.')

  console.log('Categorizando empresas existentes...')
  const empresas = await prisma.empresa.findMany()
  let count = 0

  for (const emp of empresas) {
    let matchedRubro = null
    
    // Exact match or substring match
    for (const [rubro, names] of Object.entries(mapping)) {
      if (names.some(n => emp.nombre.toLowerCase().trim() === n.toLowerCase().trim() || 
                          emp.nombre.toLowerCase().trim().includes(n.toLowerCase().trim()))) {
        matchedRubro = rubro
        break
      }
    }

    if (matchedRubro) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { rubro: matchedRubro }
      })
      console.log(`Empresa "${emp.nombre}" -> ${matchedRubro}`)
      count++
    }
  }

  console.log(`Se categorizaron ${count} de ${empresas.length} empresas.`)
}

main()
  .catch(console.error)
  .finally(async () => {
    // Evitar powershell escape llamando inline
  })
