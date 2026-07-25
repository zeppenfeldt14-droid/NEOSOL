const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nums = ['PED-2026-0037', 'PED-2026-0040', 'PED-2026-0041', 'PED-2026-0042', 'PED-2026-0043'];
  const pedidos = await prisma.pedido.findMany({
    where: { numeroPedido: { in: nums } },
    select: {
      numeroPedido: true,
      estado: true,
      tienePrecioNegociado: true,
      tieneTarifaNegociada: true
    }
  });
  console.log(pedidos);
}
main().finally(() => prisma.$disconnect());
