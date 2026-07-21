import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const facturas = await prisma.factura.findMany({
        where: { pedido: { zona: "Zona SUR" } },
        include: { pedido: true, pagos: true }
    });

    console.log(`Total facturas en Zona SUR: ${facturas.length}`);
    let subtotals = 0;
    for (const f of facturas) {
        subtotals += f.subtotal;
    }
    console.log(`Suma de subtotales: ${subtotals}`);

    const pedidos = await prisma.pedido.findMany({
        where: { zona: "Zona SUR" }
    });
    console.log(`Total pedidos en Zona SUR: ${pedidos.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
