import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.usuario.findMany();
    for(const u of users) {
        console.log(`ID: ${u.id}, Nombre: ${u.nombre}, Alias: ${u.alias}, Rol: ${u.rol}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
