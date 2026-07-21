import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const facturas = await prisma.factura.findMany({
        where: { pedido: { zona: "Zona SUR" } }
    });

    for (const f of facturas.slice(0, 5)) {
        console.log(`Factura ID: ${f.id}, creadoEn: ${f.creadoEn}, month: ${f.creadoEn.getMonth()}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
