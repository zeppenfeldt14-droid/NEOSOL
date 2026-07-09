import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const alias = 'admin'
  const email = 'admin@galletitasneosol.com.ar'
  const password = 'Neosol1234'

  console.log("Hashing password...")
  const passwordHash = await bcrypt.hash(password, 10)

  console.log("Checking if admin user already exists...")
  const existingUser = await prisma.usuario.findFirst({
    where: {
      OR: [
        { alias },
        { email }
      ]
    }
  })

  const adminModules = {
    empresas: true,
    visitas: true,
    planificador: true,
    reportes: true,
    alertas: true,
    configuracion: true
  }

  const defaultStatusLimits = {
    AUSENCIA_COMIDA: 60,
    AUSENCIA_BANO: 15,
    AUSENCIA_GESTION: 30
  }

  if (existingUser) {
    console.log(`Admin user already exists! Updating password for @${alias}...`)
    await prisma.usuario.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        nivel: 1,
        rol: 'Gerente General',
        activo: true,
        modulos: adminModules,
        limitesEstado: defaultStatusLimits
      }
    })
    console.log("Admin user updated successfully.")
  } else {
    console.log(`Creating initial admin user @${alias}...`)
    await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        alias,
        email,
        passwordHash,
        nivel: 1,
        rol: 'Gerente General',
        activo: true,
        modulos: adminModules,
        limitesEstado: defaultStatusLimits,
        mustChangePassword: false
      }
    })
    console.log("Admin user created successfully.")
  }
}

main()
  .catch(e => {
    console.error("Error seeding admin:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
