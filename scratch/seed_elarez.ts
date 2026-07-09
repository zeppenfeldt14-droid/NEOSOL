import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const alias = 'Elarez'
  const email = 'elarez@galletitasneosol.com.ar'
  const password = 'Eslz170178'

  console.log("Hashing password for Elarez...")
  const passwordHash = await bcrypt.hash(password, 10)

  console.log("Checking if Elarez user already exists...")
  const existingUser = await prisma.usuario.findFirst({
    where: {
      OR: [
        { alias: { equals: alias, mode: 'insensitive' } },
        { email: { equals: email, mode: 'insensitive' } }
      ]
    }
  })

  const vendorModules = {
    empresas: true,
    visitas: true,
    planificador: true,
    reportes: true,
    alertas: true,
    configuracion: false // No access to User management/Config
  }

  const defaultStatusLimits = {
    AUSENCIA_COMIDA: 60,
    AUSENCIA_BANO: 15,
    AUSENCIA_GESTION: 30
  }

  if (existingUser) {
    console.log(`User @${alias} already exists! Updating details...`)
    await prisma.usuario.update({
      where: { id: existingUser.id },
      data: {
        nombre: 'Elarez',
        alias,
        email,
        passwordHash,
        nivel: 3,
        rol: 'Vendedor Zona CABA',
        activo: true,
        modulos: vendorModules,
        limitesEstado: defaultStatusLimits
      }
    })
    console.log("User @Elarez updated successfully.")
  } else {
    console.log(`Creating user @${alias}...`)
    await prisma.usuario.create({
      data: {
        nombre: 'Elarez',
        alias,
        email,
        passwordHash,
        nivel: 3,
        rol: 'Vendedor Zona CABA',
        activo: true,
        modulos: vendorModules,
        limitesEstado: defaultStatusLimits,
        mustChangePassword: false
      }
    })
    console.log("User @Elarez created successfully.")
  }
}

main()
  .catch(e => {
    console.error("Error seeding Elarez:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
