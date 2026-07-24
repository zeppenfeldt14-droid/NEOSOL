const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestData() {
  try {
    console.log('Borrando datos de prueba...');
    
    // 1. Pagos, Cobranzas, Facturas, DetallesPedido de empresas de test
    const testEmpresas = await prisma.empresa.findMany({
      where: { nombre: { startsWith: '[TEST]' } },
      select: { id: true }
    });
    
    const empresaIds = testEmpresas.map(e => e.id);
    
    if (empresaIds.length > 0) {
      const pedidos = await prisma.pedido.findMany({
        where: { empresaId: { in: empresaIds } },
        select: { id: true }
      });
      const pedidoIds = pedidos.map(p => p.id);
      
      if (pedidoIds.length > 0) {
        // Find Cobranzas
        const cobranzas = await prisma.cobranza.findMany({
          where: { pedidoId: { in: pedidoIds } },
          select: { id: true }
        });
        const cobranzaIds = cobranzas.map(c => c.id);
        
        await prisma.pago.deleteMany({ where: { cobranzaId: { in: cobranzaIds } } });
        await prisma.cobranza.deleteMany({ where: { id: { in: cobranzaIds } } });
        await prisma.factura.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
        await prisma.detallePedido.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
        await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
      }
      
      await prisma.visita.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await prisma.accion.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await prisma.empresa.deleteMany({ where: { id: { in: empresaIds } } });
    }
    
    // Vendedores test
    await prisma.usuario.deleteMany({ where: { nombre: { startsWith: '[TEST]' } } });
    
    console.log('Limpieza completada.');
  } catch (error) {
    console.error('Error al limpiar datos de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTestData();
