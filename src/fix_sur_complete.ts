import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando fix 360 para Zona SUR y Daniel Di Lerna...");

    const daniel = await prisma.usuario.findFirst({
        where: { id: 29 }
    });
    if (!daniel) {
        console.error("No se encontró a Daniel Di Lerna (ID 29).");
        return;
    }

    // 1. Asegurar que Daniel tenga la zona correcta en su perfil
    let zonasHab = Array.isArray(daniel.zonasHabilitadas) ? [...daniel.zonasHabilitadas] : [];
    if (!zonasHab.includes("Zona SUR")) zonasHab.push("Zona SUR");

    await prisma.usuario.update({
        where: { id: 29 },
        data: {
            zona: "Zona SUR",
            zonasHabilitadas: zonasHab
        }
    });
    console.log("Perfil de Daniel actualizado.");

    // 2. Actualizar Empresas de Zona SUR para que le pertenezcan
    await prisma.empresa.updateMany({
        where: { zona: "Zona SUR" },
        data: { vendedorAsignado: "Ddilerna" }
    });
    console.log("Empresas actualizadas con vendedorAsignado = Ddilerna.");

    // 3. Actualizar Pedidos de Zona SUR para que le pertenezcan
    await prisma.pedido.updateMany({
        where: { zona: "Zona SUR" },
        data: {
            vendedorId: 29,
            vendedorAlias: "Ddilerna"
        }
    });
    console.log("Pedidos actualizados con vendedorAlias = Ddilerna.");

    // 4. Generar Visitas (Acciones) para cada cliente de Zona SUR que no tenga
    const empresas = await prisma.empresa.findMany({
        where: { zona: "Zona SUR" },
        include: { acciones: true }
    });

    let visitasCreadas = 0;
    for (const emp of empresas) {
        if (emp.acciones.length === 0) {
            await prisma.accion.create({
                data: {
                    empresaId: emp.id,
                    tipo: 'visita_programada',
                    descripcion: 'Visita de contacto inicial (Importación)',
                    estado: 'completada',
                    fechaVencimiento: new Date('2026-07-15T12:00:00Z'),
                    completadaEn: new Date('2026-07-15T12:00:00Z')
                }
            });
            visitasCreadas++;
        }
    }
    console.log(`Se crearon ${visitasCreadas} visitas iniciales.`);

    console.log("Fix 360 finalizado exitosamente.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
