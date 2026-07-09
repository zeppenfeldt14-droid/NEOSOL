'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function saveLogo(logoValue: string) {
  await prisma.configuracionSistema.upsert({
    where: { clave: 'logo' },
    update: { valor: logoValue },
    create: { clave: 'logo', valor: logoValue }
  })
  
  revalidatePath('/', 'layout')
}

export async function deleteLogo() {
  await prisma.configuracionSistema.deleteMany({
    where: { clave: 'logo' }
  })
  revalidatePath('/', 'layout')
}
