const data = [
  {
    precioCajaMax: "14319.36",
    precioCajaMin: "16591.34",
    precioCajaSnapshot: "14319.36"
  }
];

const pRecord = data[0];
const d = data[0];
const priceA = pRecord.precioCajaMax;
const priceB = pRecord.precioCajaMin;
const val = parseFloat(d.precioCajaSnapshot);

const isListA = Math.abs(val - priceA) < 0.01;
const isListB = Math.abs(val - priceB) < 0.01;
const isCustom = !isListA && !isListB;

console.log('val:', val);
console.log('priceA:', priceA);
console.log('isListA:', isListA);
console.log('isCustom:', isCustom);
