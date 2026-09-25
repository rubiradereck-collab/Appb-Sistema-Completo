const fs = require('fs');
const text = \
export const exportGuiasExcel = async (guias, filename) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Guias');

    sheet.columns = [
      { header: 'Título', key: 'Titulo', width: 25 },
      { header: 'Problema', key: 'Problema', width: 40 },
      { header: 'Solución', key: 'Solucion', width: 40 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153250' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 20;

    let fila = 2;
    guias.forEach(g => {
      sheet.addRow({
        Titulo: g.Titulo,
        Problema: g.Problema,
        Solucion: g.Solucion
      });
      fila++;
    });

    sheet.views = [ { state: 'frozen', xSplit: 0, ySplit: 1 } ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    window.dispatchEvent(new CustomEvent('app-success', {detail: 'Catálogo de Guías descargado en Excel'}));
  } catch (error) {
    console.error(error);
    window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al generar Excel de guías'}));
  }
};
\;
fs.appendFileSync('pwa-client/src/utils/exportUtils.js', text);

