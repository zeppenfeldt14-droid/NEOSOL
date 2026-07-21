import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Ajustando Cobranzas (reduciendo saldo a 0 y vinculando pagos)...");

    const cobranzas = await prisma.cobranza.findMany({
        where: {
            zona: { in: ["Sur", "Zona SUR"] }
        },
        include: {
            pedido: {
                include: {
                    facturas: true
                }
            }
        }
    });

    let actualizadas = 0;

    for (const c of cobranzas) {
        // Encontramos facturas del pedido
        const facturas = c.pedido?.facturas || [];
        for (const f of facturas) {
            // Buscamos los pagos asociados a la factura
            const pagos = await prisma.pago.findMany({
                where: { facturaId: f.id }
            });

            for (const p of pagos) {
                // Link payment to cobranza
                await prisma.pago.update({
                    where: { id: p.id },
                    data: { cobranzaId: c.id }
                });
            }
        }

        // Si ya hay pagos, consideramos la cobranza saldada al 100% (saldoPendiente = 0)
        await prisma.cobranza.update({
            where: { id: c.id },
            data: { saldoPendiente: 0, estado: 'pagada' }
        });
        actualizadas++;
    }

    console.log(`¡Proceso completado! Se actualizaron ${actualizadas} registros de Cobranza a saldo 0.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
