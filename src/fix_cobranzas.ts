import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando simulación de cobranzas para Zona Sur...");

    const facturas = await prisma.factura.findMany({
        where: {
            pedido: {
                zona: { in: ["Sur", "Zona SUR"] }
            }
        },
        include: {
            pedido: true
        }
    });

    console.log(`Encontradas ${facturas.length} facturas para procesar.`);

    let pagosCreados = 0;

    for (const f of facturas) {
        // Skip if already paid (to be safe if run multiple times)
        if (f.estado === 'pagada') {
            continue;
        }

        const montoTransf = f.total * 0.55;
        const montoCheque = f.total * 0.45;
        const alias = f.pedido?.vendedorAlias || 'Sistema';

        // Create Transferencia payment
        await prisma.pago.create({
            data: {
                facturaId: f.id,
                monto: montoTransf,
                metodoPago: 'transferencia',
                montoFinal: montoTransf,
                registradoPorAlias: alias,
                creadoEn: f.creadoEn, // As requested: por mes (same month as factura)
            }
        });

        // Create Cheque payment
        await prisma.pago.create({
            data: {
                facturaId: f.id,
                monto: montoCheque,
                metodoPago: 'cheque',
                montoFinal: montoCheque,
                registradoPorAlias: alias,
                creadoEn: f.creadoEn,
            }
        });

        // Update factura to pagada
        await prisma.factura.update({
            where: { id: f.id },
            data: { estado: 'pagada' }
        });

        pagosCreados += 2;
    }

    console.log(`¡Proceso completado! Se crearon ${pagosCreados} registros de pago y las facturas fueron marcadas como 'pagada'.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
