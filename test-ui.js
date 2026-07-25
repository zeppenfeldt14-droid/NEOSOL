const d = {
  productoId: 2,
  precioCajaSnapshot: 14319.36,
  precioCajaOriginal: 16591.34
};

async function run() {
  const res = await fetch('http://localhost:3000/api/configuracion/tarifas');
  const data = await res.json();
  const activeList = data.find(l => l.activa);
  
  const priceRecords = activeList?.precios || [];
  const pRecord = priceRecords.find(pr => pr.productoId === d.productoId);
  
  console.log("pRecord found:", !!pRecord);
  if (pRecord) {
    const priceA = pRecord.precioCajaMax;
    const priceB = pRecord.precioCajaMin;
    console.log("priceA:", priceA);
    console.log("priceB:", priceB);
    
    const val = parseFloat(d.precioCajaSnapshot);
    const isListA = Math.abs(val - priceA) < 0.01;
    const isListB = Math.abs(val - priceB) < 0.01;
    console.log("isListA:", isListA);
    console.log("isListB:", isListB);
  }
}
run();
