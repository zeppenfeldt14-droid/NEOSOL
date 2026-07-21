import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const daniel = await prisma.usuario.findFirst({
        where: {
            nombre: { contains: "Daniel" }
        }
    });
    console.log("Daniel user:", daniel);
}

main().catch(console.error).finally(() => prisma.$disconnect());
