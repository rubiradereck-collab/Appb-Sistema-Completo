const ExcelJS = require('exceljs');
// pdfmake 0.3 cambió su API: ya no exporta PdfPrinter. Se usa pdfmake.createPdf(...).getBuffer()
// con las fuentes estándar de PDF (Helvetica), que no necesitan archivos de fuente.
const pdfmake = require('pdfmake');
pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});
// Solo las fuentes estándar: no se permite leer otros archivos locales ni URLs
pdfmake.setUrlAccessPolicy(() => false);
const FUENTES_ESTANDAR = new Set(['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique']);
pdfmake.setLocalAccessPolicy((ruta) => FUENTES_ESTANDAR.has(ruta));

const generarPdfIncidencias = async (incidencias) => {
      
      const docDefinition = {
        defaultStyle: { font: 'Helvetica', fontSize: 10 },
        pageOrientation: 'landscape',
        content: [
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#1a365d',
                    color: 'white',
                    border: [false, false, false, false],
                    stack: [
                      { text: 'Sistema de Gestión de Incidencias APPB', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
                      { text: 'Reporte General de Incidencias', bold: true, fontSize: 20 },
                      { text: 'Generado el ' + new Date().toLocaleString('es-EC'), color: '#a0aec0', fontSize: 9, margin: [0, 5, 0, 0] }
                    ],
                    margin: [25, 25, 25, 25]
                  }
                ]
              ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
          },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', '*', 'auto', '*', 'auto', 'auto', '*', 'auto'],
              body: [
                [
                  { text: 'N.º', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Fecha', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Empleado', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Área', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Tipo', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Descripción', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Prioridad', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Estado', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Técnico', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] },
                  { text: 'Cierre', bold: true, fillColor: '#f7fafc', border: [false, false, false, true] }
                ],
                ...incidencias.map((inc, i) => {
                  const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa';
                  return [
                    { text: inc.NumeroTicket || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.Fecha ? new Date(inc.Fecha).toLocaleString('es-EC') : '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.Empleado || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.NombreArea || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.TipoIncidencia || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.Descripcion || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.NombrePrioridad || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.NombreEstado || '-', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.TecnicoAsignado || 'Sin asignar', fillColor: bg, border: [false, false, false, true] },
                    { text: inc.FechaSolucion ? new Date(inc.FechaSolucion).toLocaleString('es-EC') : '-', fillColor: bg, border: [false, false, false, true] }
                  ];
                })
              ]
            },
            layout: {
              hLineColor: '#e2e8f0',
              vLineWidth: () => 0
            }
          }
        ],
        pageMargins: [0, 0, 0, 40]
      };

      return await pdfmake.createPdf(docDefinition).getBuffer();
};

const generarExcelIncidencias = async (incidencias) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Incidencias');

  const encabezados = [
    "Ticket", "Fecha", "Empleado", "Área", "Tipo", "Descripción",
    "Prioridad", "Estado", "Técnico Asignado", "Fecha Solución", "Observaciones"
  ];

  sheet.addRow(encabezados);
  const row1 = sheet.getRow(1);
  row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153250' } }; // RGB 21, 50, 80 = #153250

  incidencias.forEach(inc => {
    sheet.addRow([
      inc.NumeroTicket,
      inc.Fecha ? new Date(inc.Fecha).toLocaleString('es-EC') : '',
      inc.Empleado,
      inc.NombreArea,
      inc.TipoIncidencia,
      inc.Descripcion,
      inc.NombrePrioridad,
      inc.NombreEstado,
      inc.TecnicoAsignado,
      inc.FechaSolucion ? new Date(inc.FechaSolucion).toLocaleString('es-EC') : '',
      inc.Observaciones
    ]);
  });

  sheet.columns.forEach(col => { col.width = 20; });
  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  generarPdfIncidencias,
  generarExcelIncidencias
};
