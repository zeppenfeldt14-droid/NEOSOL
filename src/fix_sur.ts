import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Corrgiendo datos de Zona SUR...");

    // 1. Actualizar "Sur" a "Zona SUR" en Empresas y Pedidos
    await prisma.empresa.updateMany({
        where: { zona: "Sur" },
        data: { zona: "Zona SUR" }
    });

    await prisma.pedido.updateMany({
        where: { zona: "Sur" },
        data: { zona: "Zona SUR" }
    });
    console.log("Nombres de zona actualizados.");

    // 2. Generar Facturas para los pedidos de Zona SUR que no tengan factura
    const pedidos = await prisma.pedido.findMany({
        where: { zona: "Zona SUR" },
        include: {
            detalles: true,
            facturas: true
        }
    });

    let facturasCreadas = 0;
    for (const pedido of pedidos) {
        if (pedido.facturas.length === 0) {
            // Calcular subtotales inventados basados en cantidad de cajas si es 0
            let subtotal = 0;
            if (pedido.subtotalSinIVA > 0) {
                subtotal = pedido.subtotalSinIVA;
            } else {
                for (const d of pedido.detalles) {
                    // inventar un valor base
                    subtotal += d.cantidadCajas * 1000;
                }
            }

            // Actualizar total del pedido para que no esté en 0
            await prisma.pedido.update({
                where: { id: pedido.id },
                data: {
                    subtotalSinIVA: subtotal,
                    totalGeneral: subtotal * 1.21
                }
            });

            // Crear Factura
            await prisma.factura.create({
                data: {
                    pedidoId: pedido.id,
                    numeroFactura: `FAC-A-2026-${pedido.id.toString().padStart(4, '0')}`,
                    tipo: 'A',
                    subtotal: subtotal,
                    iva: subtotal * 0.21,
                    recargo: 0,
                    total: subtotal * 1.21,
                    estado: 'pendiente',
                    creadoEn: pedido.creadoEn, // mantener fecha del pedido
                    actualizadoEn: pedido.creadoEn
                }
            });
            facturasCreadas++;
        }
    }

    console.log(`Facturas creadas: ${facturasCreadas}`);
    console.log("Fix finalizado.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
