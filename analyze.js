const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany({
    include: {
      pedidos: { 
        orderBy: { creadoEn: 'desc' },
        include: { facturas: true }
      },
      alertas: true
    }
  });

  const result = empresas.map(e => {
    // Collect all facturas from all pedidos
    let todasFacturas = [];
    for (const p of e.pedidos) {
      if (p.facturas) todasFacturas = todasFacturas.concat(p.facturas);
    }
    todasFacturas.sort((a,b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

    let estimado = e.cicloVentaDias || 30;
    if (todasFacturas.length >= 2) {
      const dates = todasFacturas.map(f => new Date(f.creadoEn).getTime());
      const diffTime = Math.abs(dates[0] - dates[1]);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) estimado = diffDays;
    }

    return {
      id: e.id,
      nombre: e.nombre,
      estado: e.estado,
      cicloVentaDias: e.cicloVentaDias,
      cicloEstimado: estimado,
      facturas: todasFacturas.length,
      pedidos: e.pedidos.length,
      alertas: e.alertas.length,
      facturasFechas: todasFacturas.map(f => f.creadoEn.toISOString().split('T')[0]),
      pedidosFechas: e.pedidos.map(p => p.creadoEn.toISOString().split('T')[0])
    };
  });

  console.log(JSON.stringify(result, null, 2));

  console.log('\n--- Actualizando a Cliente y generando alertas... ---');
  for (const emp of result) {
    const isClient = emp.facturas > 0 || emp.pedidos > 0;
    if (isClient && emp.estado !== 'activo') {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { estado: 'activo', cicloVentaDias: emp.cicloEstimado }
      });
      console.log(`Empresa ${emp.nombre} actualizada a Cliente (activo) con ciclo ${emp.cicloEstimado} días.`);
    } else if (isClient && emp.cicloVentaDias !== emp.cicloEstimado) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { cicloVentaDias: emp.cicloEstimado }
      });
      console.log(`Empresa ${emp.nombre} actualizada con ciclo ${emp.cicloEstimado} días.`);
    }

    if (isClient) {
      let ultimaFecha = null;
      if (emp.facturasFechas.length > 0) ultimaFecha = new Date(emp.facturasFechas[0]);
      else if (emp.pedidosFechas.length > 0) ultimaFecha = new Date(emp.pedidosFechas[0]);

      if (ultimaFecha) {
        const hoy = new Date();
        const diffTime = Math.abs(hoy.getTime() - ultimaFecha.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= emp.cicloEstimado - 5) {
           const existeAlerta = emp.alertas > 0;
           if (!existeAlerta) {
             const tipo = diffDays > emp.cicloEstimado ? 'Peligro de Fuga' : 'Oportunidad de Reposición';
             const nivel = diffDays > emp.cicloEstimado ? 'alta' : 'media';
             await prisma.alerta.create({
               data: {
                 empresaId: emp.id,
                 tipo,
                 mensaje: `Ciclo de compra estimado: ${emp.cicloEstimado} días. Han pasado ${diffDays} días desde su última operación.`,
                 activa: true
               }
             });
             console.log(`Alerta generada para ${emp.nombre}: ${tipo}`);
           }
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
