const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixZonaSur() {
  const oldZona = 'Zona SUR';
  const newZona = 'ZONA SUR';

  console.log('Iniciando corrección de mayúsculas/minúsculas para Zona SUR...');

  try {
    // 1. Pedido
    const resPedido = await prisma.pedido.updateMany({
      where: { zona: oldZona },
      data: { zona: newZona }
    });
    console.log(`Pedidos actualizados: ${resPedido.count}`);

    // 2. Empresa
    const resEmpresa = await prisma.empresa.updateMany({
      where: { zona: oldZona },
      data: { zona: newZona }
    });
    console.log(`Empresas actualizadas: ${resEmpresa.count}`);

    // 3. SubZona
    // Subzonas could have unique constraints on [zona, nombre].
    // If it fails we catch and ignore or handle.
    try {
      const resSubZona = await prisma.subZona.updateMany({
        where: { zona: oldZona },
        data: { zona: newZona }
      });
      console.log(`SubZonas actualizadas: ${resSubZona.count}`);
    } catch(e) { console.log('Error SubZona:', e.message); }

    // 4. Cobranza
    const resCobranza = await prisma.cobranza.updateMany({
      where: { zona: oldZona },
      data: { zona: newZona }
    });
    console.log(`Cobranzas actualizadas: ${resCobranza.count}`);

    // 5. ReporteVisitas
    try {
      const resReporte = await prisma.reporteVisitas.updateMany({
        where: { zona: oldZona },
        data: { zona: newZona }
      });
      console.log(`ReporteVisitas actualizados: ${resReporte.count}`);
    } catch(e) { console.log('Error ReporteVisitas:', e.message); }

    // 6. NotaPlanificador
    const resNota = await prisma.notaPlanificador.updateMany({
      where: { zona: oldZona },
      data: { zona: newZona }
    });
    console.log(`NotaPlanificador actualizadas: ${resNota.count}`);

    // 7. Usuario (zona principal)
    const resUsuario = await prisma.usuario.updateMany({
      where: { zona: oldZona },
      data: { zona: newZona }
    });
    console.log(`Usuarios (zona principal) actualizados: ${resUsuario.count}`);

    console.log('Corrección completada exitosamente.');

  } catch (error) {
    console.error('Error durante la corrección:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixZonaSur();
