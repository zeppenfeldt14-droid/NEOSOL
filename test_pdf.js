const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('D:\\Reporte de Visitas\\Reportes de visitas\\05-06-2026.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text.substring(0, 500));
}).catch(function(error) {
    console.error('Error parsing PDF:', error.message);
});
