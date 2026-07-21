import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fetchCSV(url: string) {
    const res = await fetch(url);
    const text = await res.text();
    return parseCSV(text);
}

function parseCSV(text: string) {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"' && text[i + 1] === '"') {
                currentField += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentLine.push(currentField);
                currentField = '';
            } else if (char === '\n') {
                currentLine.push(currentField);
                lines.push(currentLine);
                currentLine = [];
                currentField = '';
            } else if (char !== '\r') {
                currentField += char;
            }
        }
    }
    if (currentField !== '' || currentLine.length > 0) {
        currentLine.push(currentField);
        lines.push(currentLine);
    }
    return lines;
}

function cleanName(name: string) {
    return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

async function main() {
    console.log("Iniciando importación para Zona Sur...");

    const url_clientes = "https://docs.google.com/spreadsheets/d/1J5sd49FskF4muFlhQYiNtIE25uNqeyOU/export?format=csv";
    const url_ventas = "https://docs.google.com/spreadsheets/d/1Zk5_vL3CZYLUYRX73oX2syrPHqwY76Rm/export?format=csv";

    const clientesData = await fetchCSV(url_clientes);
    const ventasData = await fetchCSV(url_ventas);

    // Borramos datos existentes para Zona Sur (Empresas y Pedidos asociados)
    console.log("Limpiando datos existentes de Zona Sur...");
    await prisma.empresa.deleteMany({
        where: { zona: "Sur" }
    });

    console.log("Procesando Clientes...");
    const clientesMap = new Map<string, any>();
    
    // El header de clientes es la fila 0
    for (let i = 1; i < clientesData.length; i++) {
        const row = clientesData[i];
        if (!row[0] || row[0].trim() === '') continue;
        
        const rawName = row[0];
        const cuit = row[2] || '';
        const telefono = row[3] || '';
        const direccion = row[4] || '';

        const cleanedName = cleanName(rawName);
        
        const emp = await prisma.empresa.create({
            data: {
                nombre: rawName.trim(), // Keep original format for display
                cuit: cuit.trim(),
                telefono: telefono.trim(),
                direccion: direccion.trim(),
                zona: "Sur",
                vendedorAsignado: "Daniel Di Lerna",
                estado: "activo"
            }
        });
        clientesMap.set(cleanedName, emp);
    }

    console.log(`Empresas insertadas desde lista: ${clientesMap.size}`);

    // Procesar Ventas
    console.log("Procesando Ventas...");
    const ventasList = ventasData.slice(7).filter(l => l.length > 0 && l[0] && l[0].trim() !== '');

    // Identificar empresas faltantes
    const ventasEmpresas = new Set(ventasList.map(l => cleanName(l[0])));
    let nuevasCreadas = 0;
    for (const empName of ventasEmpresas) {
        if (!clientesMap.has(empName)) {
            const originalName = ventasList.find(l => cleanName(l[0]) === empName)![0].trim();
            const emp = await prisma.empresa.create({
                data: {
                    nombre: originalName,
                    zona: "Sur",
                    vendedorAsignado: "Daniel Di Lerna",
                    estado: "activo"
                }
            });
            clientesMap.set(empName, emp);
            nuevasCreadas++;
        }
    }
    console.log(`Empresas faltantes creadas automáticamente: ${nuevasCreadas}`);

    // Ensure products exist before creating order details
    console.log("Verificando productos...");
    const productCache = new Map<string, number>();

    for (const v of ventasList) {
        const sku = v[1].trim();
        const prodName = v[3].trim();
        
        if (!productCache.has(sku)) {
            let prod = await prisma.producto.findUnique({ where: { codigoInterno: sku } });
            if (!prod) {
                prod = await prisma.producto.create({
                    data: {
                        codigoInterno: sku,
                        nombre: prodName,
                        precioPaquete: 100, // Dummy
                        paqPorCaja: 1,      // Dummy
                        precioCaja: 100,    // Dummy
                    }
                });
            }
            productCache.set(sku, prod.id);
        }
    }

    // Agrupar ventas por cliente
    const clientSales = new Map<string, any[]>();
    for (const v of ventasList) {
        const clientName = cleanName(v[0]);
        if (!clientSales.has(clientName)) clientSales.set(clientName, []);
        clientSales.get(clientName)!.push({
            sku: v[1].trim(),
            nombre: v[3].trim(),
            cantidad: parseInt(v[6].trim()) || 0,
            peso: v[7].trim()
        });
    }

    // Distribuir en Pedidos (meses hacia atrás desde Julio 2026)
    // Regla: No repetir producto en el mismo mes/pedido.
    let totalPedidosGenerados = 0;

    for (const [clientName, sales] of clientSales.entries()) {
        const emp = clientesMap.get(clientName);
        if (!emp) continue;

        // Greedy allocation of products into orders
        const orders: any[][] = [];
        for (const sale of sales) {
            let placed = false;
            for (const order of orders) {
                if (!order.find(p => p.sku === sale.sku)) {
                    order.push(sale);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                orders.push([sale]);
            }
        }

        // Crear los pedidos en BD
        // Meses hacia atrás desde Julio 2026 (mes 6 en index JS)
        let currentMonth = 6; // Julio (0-indexed)
        let currentYear = 2026;

        for (const orderProducts of orders) {
            const date = new Date(currentYear, currentMonth, 15, 12, 0, 0);
            
            // Generar número de pedido único
            const orderNum = `PED-SUR-${emp.id}-${currentYear}-${currentMonth + 1}`;

            const newPedido = await prisma.pedido.create({
                data: {
                    numeroPedido: orderNum,
                    empresaId: emp.id,
                    vendedorId: 999, // Placeholder since we don't know the exact ID for Di Lerna
                    vendedorAlias: "Daniel Di Lerna",
                    zona: "Sur",
                    estado: "aprobado",
                    creadoEn: date,
                    actualizadoEn: date,
                    aprobadoEn: date,
                    subtotalSinIVA: 0, // Simplified for now
                    totalGeneral: 0,   // Simplified for now
                }
            });
            totalPedidosGenerados++;

            for (const item of orderProducts) {
                const prodId = productCache.get(item.sku);
                if (!prodId) continue;

                await prisma.detallePedido.create({
                    data: {
                        pedidoId: newPedido.id,
                        productoId: prodId,
                        productoNombre: item.nombre,
                        precioCajaSnapshot: 0, // Placeholder
                        precioPaqSnapshot: 0,  // Placeholder
                        paqPorCajaSnapshot: 1, // Placeholder
                        cantidadCajas: item.cantidad,
                        subtotal: 0 // Placeholder
                    }
                });
            }

            // Mover al mes anterior
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
        }
    }

    console.log(`Total Pedidos generados y distribuidos: ${totalPedidosGenerados}`);
    console.log("¡Importación de Zona Sur finalizada!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
