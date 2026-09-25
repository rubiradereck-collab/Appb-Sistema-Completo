import ExcelJS from 'exceljs';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts;

const calcularMetricas = (incidencias) => {
  const metricas = {
    Total: incidencias.length,
    PorEstado: {},
    PorPrioridad: {},
    PorArea: {}
  };

  const resueltas = [];

  incidencias.forEach(i => {
    const est = i.NombreEstado || 'Sin estado';
    const prio = i.NombrePrioridad || 'Sin prioridad';
    const area = i.NombreArea || 'Sin área';
    
    metricas.PorEstado[est] = (metricas.PorEstado[est] || 0) + 1;
    metricas.PorPrioridad[prio] = (metricas.PorPrioridad[prio] || 0) + 1;
    metricas.PorArea[area] = (metricas.PorArea[area] || 0) + 1;

    if (i.FechaSolucion) {
      resueltas.push(i);
    }
  });

  if (resueltas.length > 0) {
    const totalHoras = resueltas.reduce((acc, i) => {
      const ms = new Date(i.FechaSolucion).getTime() - new Date(i.Fecha).getTime();
      return acc + (ms / (1000 * 60 * 60));
    }, 0);
    metricas.TiempoPromedioResolucionHoras = totalHoras / resueltas.length;
  }

  return metricas;
};

const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const pad = n => n.toString().padStart(2, '0');
  
  if (includeTime) {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  // C# uses "dd/MM/yy" for PDF
  const yy = d.getFullYear().toString().slice(-2);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${yy}`;
};

const getCsharpPdfDefinition = (incidencias, tituloReporte) => {
  const metricas = calcularMetricas(incidencias);

  const ColorNavy = '#153250';
  const ColorAcero = '#2B6B9A';
  const ColorFilaPar = '#F5F6FA';

  const kpis = [];
  kpis.push({ label: 'TOTAL', value: metricas.Total.toString(), color: ColorNavy });
  
  Object.entries(metricas.PorEstado).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    kpis.push({ label: k.toUpperCase(), value: v.toString(), color: ColorAcero });
  });
  
  Object.entries(metricas.PorPrioridad).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    kpis.push({ label: k.toUpperCase(), value: v.toString(), color: ColorAcero });
  });

  if (metricas.TiempoPromedioResolucionHoras !== undefined) {
    kpis.push({ label: 'TIEMPO PROM. RESOLUCIÓN', value: `${metricas.TiempoPromedioResolucionHoras.toFixed(1)} h`, color: ColorAcero });
  }

  const kpiColumns = kpis.map(kpi => ({
    table: {
      widths: ['*'],
      body: [[
        {
          border: [true, true, true, true],
          borderColor: ['#E0E0E0', '#E0E0E0', '#E0E0E0', '#E0E0E0'],
          padding: [10, 10, 10, 10],
          stack: [
            { text: kpi.label, fontSize: 7, color: '#9E9E9E', bold: true },
            { text: kpi.value, fontSize: 18, color: kpi.color, bold: true, margin: [0, 3, 0, 0] }
          ]
        }
      ]]
    },
    layout: {
      paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 10, paddingBottom: () => 10,
      hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#E0E0E0', vLineColor: () => '#E0E0E0'
    },
    margin: [5, 0]
  }));

  const currentDateTime = new Date();
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const dateStr = `${currentDateTime.getDate().toString().padStart(2, '0')} de ${months[currentDateTime.getMonth()]} de ${currentDateTime.getFullYear()}, ${currentDateTime.getHours().toString().padStart(2, '0')}:${currentDateTime.getMinutes().toString().padStart(2, '0')}`;

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [0, 95, 0, 40], // Give room for fixed header
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    header: function() {
      return {
        stack: [
          {
            canvas: [{ type: 'rect', x: 0, y: 0, w: 842, h: 6, color: ColorNavy }] 
          },
          {
            margin: [25, 25, 25, 0],
            stack: [
              { text: 'SISTEMA DE GESTIÓN DE INCIDENCIAS APPB', color: ColorAcero, fontSize: 9, bold: true, characterSpacing: 0.5 },
              { text: tituloReporte, color: ColorNavy, fontSize: 24, bold: true, margin: [0, 6, 0, 0] },
              { canvas: [{ type: 'rect', x: 0, y: 0, w: 792, h: 2, color: ColorAcero }], margin: [0, 10, 0, 0] },
              { text: `Generado el ${dateStr}     ${incidencias.length} registro(s)`, color: '#9E9E9E', fontSize: 9, italics: true, margin: [0, 8, 0, 0] }
            ]
          }
        ]
      };
    },
    footer: function(currentPage, pageCount) {
      return {
        margin: [15, 15, 15, 15],
        columns: [
          { text: 'Sistema de Gestión de Incidencias - APPB 2027', fontSize: 8, color: '#9E9E9E', alignment: 'left' },
          { text: `Página ${currentPage} de ${pageCount}`, fontSize: 8, color: '#9E9E9E', alignment: 'right' }
        ]
      };
    },
    content: [
      {
        margin: [20, 0, 20, 0],
        stack: [
          {
            margin: [0, 0, 0, 15],
            columns: kpiColumns
          },
          {
            table: {
              headerRows: 1,
              widths: [65, 50, '16%', '13%', '11%', '24%', '10%', '11%', '14%', 50],
              body: [
                [
                  { text: 'Ticket', style: 'tableHeader' },
                  { text: 'Apertura', style: 'tableHeader' },
                  { text: 'Empleado', style: 'tableHeader' },
                  { text: 'Área', style: 'tableHeader' },
                  { text: 'Tipo', style: 'tableHeader' },
                  { text: 'Descripción', style: 'tableHeader' },
                  { text: 'Prioridad', style: 'tableHeader' },
                  { text: 'Estado', style: 'tableHeader' },
                  { text: 'Técnico', style: 'tableHeader' },
                  { text: 'Cierre', style: 'tableHeader' }
                ],
                ...incidencias.map((inc, index) => {
                  const fillColor = index % 2 === 0 ? '#FFFFFF' : ColorFilaPar;
                  return [
                    { text: inc.NumeroTicket || '-', fillColor, border: [false, false, false, true] },
                    { text: formatDate(inc.Fecha), fillColor, border: [false, false, false, true] },
                    { text: inc.Empleado || '-', fillColor, border: [false, false, false, true] },
                    { text: inc.NombreArea || '-', fillColor, border: [false, false, false, true] },
                    { text: inc.TipoIncidencia || '-', fillColor, border: [false, false, false, true] },
                    { text: inc.Descripcion || '-', fillColor, border: [false, false, false, true] },
                    { text: inc.NombrePrioridad || '-', fillColor, border: [false, false, false, true] },
                    { text: inc.NombreEstado || '-', fillColor, border: [false, false, false, true] },
                    { text: inc.TecnicoAsignado || inc.NombreTecnicoAsignado || 'Sin asignar', fillColor, border: [false, false, false, true] },
                    { text: formatDate(inc.FechaSolucion), fillColor, border: [false, false, false, true] }
                  ];
                })
              ]
            },
            layout: {
              hLineWidth: function (i, node) { return i === node.table.body.length ? 0 : 1; },
              vLineWidth: function (i, node) { return 1; },
              hLineColor: function (i, node) { return '#EEEEEE'; },
              vLineColor: function (i, node) { return '#EEEEEE'; },
              paddingLeft: function(i) { return 5; },
              paddingRight: function(i) { return 5; },
              paddingTop: function(i) { return 5; },
              paddingBottom: function(i) { return 5; }
            }
          }
        ]
      }
    ],
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: '#FFFFFF',
        fillColor: ColorAcero,
        margin: [6, 6, 6, 6]
      }
    }
  };
};

export const exportToPDF = (data, tituloReporte, filename, returnBase64 = false) => {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition = getCsharpPdfDefinition(data, tituloReporte);
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      if (returnBase64) {
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Generando PDF en memoria...'}));
        pdfDocGenerator.getBlob()
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result);
            };
            reader.onerror = () => reject(new Error("Error leyendo el blob"));
            reader.readAsDataURL(blob);
          })
          .catch((err) => {
            reject(err);
          });
      } else {
        pdfDocGenerator.download(filename);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Reporte PDF generado y descargado'}));
        resolve();
      }
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al generar PDF'}));
      reject(error);
    }
  });
};

export const exportToExcel = async (incidencias, filename) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Incidencias');

    const encabezados = [
      "Ticket", "Fecha", "Empleado", "Área", "Tipo", "Descripción",
      "Prioridad", "Estado", "Técnico Asignado", "Fecha Solución", "Observaciones"
    ];

    sheet.columns = encabezados.map(e => ({ header: e, key: e, width: 20 }));

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153250' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 20;

    let fila = 2;
    incidencias.forEach(inc => {
      sheet.addRow({
        "Ticket": inc.NumeroTicket,
        "Fecha": formatDate(inc.Fecha, true),
        "Empleado": inc.Empleado,
        "Área": inc.NombreArea,
        "Tipo": inc.TipoIncidencia,
        "Descripción": inc.Descripcion,
        "Prioridad": inc.NombrePrioridad,
        "Estado": inc.NombreEstado,
        "Técnico Asignado": inc.TecnicoAsignado || inc.NombreTecnicoAsignado || 'Sin asignar',
        "Fecha Solución": formatDate(inc.FechaSolucion, true),
        "Observaciones": inc.Observaciones || ''
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
    window.dispatchEvent(new CustomEvent('app-success', {detail: 'Reporte Excel generado y descargado'}));
  } catch (error) {
    console.error(error);
    window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al generar Excel'}));
  }
};

const getCsharpGuiasPdfDefinition = (guias, tituloReporte) => {
  const ColorNavy = '#153250';
  const ColorAcero = '#2B6B9A';
  
  const currentDateTime = new Date();
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const dateStr = `${currentDateTime.getDate().toString().padStart(2, '0')} de ${months[currentDateTime.getMonth()]} de ${currentDateTime.getFullYear()}, ${currentDateTime.getHours().toString().padStart(2, '0')}:${currentDateTime.getMinutes().toString().padStart(2, '0')}`;

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [0, 95, 0, 40],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    header: function() {
      return {
        stack: [
          { canvas: [{ type: 'rect', x: 0, y: 0, w: 595, h: 6, color: ColorNavy }] },
          {
            margin: [25, 25, 25, 0],
            stack: [
              { text: 'SISTEMA DE GESTIÓN DE INCIDENCIAS APPB', color: ColorAcero, fontSize: 9, bold: true, characterSpacing: 0.5 },
              { text: tituloReporte, color: ColorNavy, fontSize: 24, bold: true, margin: [0, 6, 0, 0] },
              { canvas: [{ type: 'rect', x: 0, y: 0, w: 545, h: 2, color: ColorAcero }], margin: [0, 10, 0, 0] },
              { text: `Generado el ${dateStr}     ${guias.length} registro(s)`, color: '#9E9E9E', fontSize: 9, italics: true, margin: [0, 8, 0, 0] }
            ]
          }
        ]
      };
    },
    footer: function(currentPage, pageCount) {
      return {
        margin: [15, 15, 15, 15],
        columns: [
          { text: 'Sistema de Gestión de Incidencias - APPB 2027', fontSize: 8, color: '#9E9E9E', alignment: 'left' },
          { text: `Página ${currentPage} de ${pageCount}`, fontSize: 8, color: '#9E9E9E', alignment: 'right' }
        ]
      };
    },
    content: [
      {
        margin: [25, 0, 25, 0],
        stack: guias.map(g => ({
          margin: [0, 0, 0, 14],
          table: {
            widths: ['*'],
            body: [
              [
                { text: g.Titulo, fontSize: 13, bold: true, color: '#FFFFFF', fillColor: ColorAcero, margin: [10, 10, 10, 10], border: [true, true, true, false], borderColor: ['#DCE1E6', '#DCE1E6', '#DCE1E6', '#DCE1E6'] }
              ],
              [
                {
                  margin: [12, 12, 12, 12],
                  border: [true, false, true, true],
                  borderColor: ['#DCE1E6', '#DCE1E6', '#DCE1E6', '#DCE1E6'],
                  stack: [
                    { text: 'PROBLEMA  ', fontSize: 8, bold: true, color: '#E74C3C' },
                    { text: g.Problema, fontSize: 10, lineHeight: 1.3, margin: [0, 4, 0, 10] },
                    { text: 'SOLUCIÓN  ', fontSize: 8, bold: true, color: '#27AE60' },
                    { text: g.Solucion, fontSize: 10, lineHeight: 1.3, margin: [0, 4, 0, 0] }
                  ]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: (i, node) => 1,
            vLineWidth: (i, node) => 1,
            hLineColor: (i, node) => '#DCE1E6',
            vLineColor: (i, node) => '#DCE1E6',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0
          }
        }))
      }
    ]
  };
};

export const exportGuiasPDF = (guias, tituloReporte, filename, returnBase64 = false) => {
  return new Promise((resolve, reject) => {
    try {
      const docDefinition = getCsharpGuiasPdfDefinition(guias, tituloReporte);
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      if (returnBase64) {
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Generando PDF en memoria...'}));
        pdfDocGenerator.getBlob()
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result);
            };
            reader.onerror = () => reject(new Error("Error leyendo el blob"));
            reader.readAsDataURL(blob);
          })
          .catch((err) => reject(err));
      } else {
        pdfDocGenerator.download(filename);
        window.dispatchEvent(new CustomEvent('app-success', {detail: 'Catálogo de Guías descargado'}));
        resolve();
      }
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('app-error', {detail: 'Error al generar PDF de guías'}));
      reject(error);
    }
  });
};

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

export const exportGenericPDF = (data, columns, title, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const tableHeader = columns.map(c => ({ text: c.header, style: 'tableHeader' }));
      const tableBody = data.map((item, index) => {
        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F5F6FA';
        return columns.map(c => ({
          text: typeof c.getValue === 'function' ? c.getValue(item) : (item[c.key] || '-'),
          fillColor: rowBg,
          fontSize: 9,
          border: [false, false, false, true]
        }));
      });

      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: columns.length > 5 ? 'landscape' : 'portrait',
        pageMargins: [40, 80, 40, 40],
        header: function() {
          return {
            margin: [40, 20, 40, 0],
            stack: [
              { text: 'SISTEMA DE GESTIÓN DE INCIDENCIAS APPB', color: '#2B6B9A', fontSize: 9, bold: true },
              { text: title, color: '#153250', fontSize: 24, bold: true, margin: [0, 4, 0, 10] },
              { canvas: [{ type: 'rect', x: 0, y: 0, w: columns.length > 5 ? 760 : 515, h: 2, color: '#2B6B9A' }] }
            ]
          };
        },
        footer: function(currentPage, pageCount) {
          return {
            margin: [40, 10, 40, 10],
            columns: [
              { text: 'Sistema de Gestión de Incidencias - APPB 2027', fontSize: 8, color: '#9E9E9E', alignment: 'left' },
              { text: `Página ${currentPage} de ${pageCount}`, fontSize: 8, color: '#9E9E9E', alignment: 'right' }
            ]
          };
        },
        content: [
          {
            table: {
              headerRows: 1,
              widths: columns.map(c => c.width === 'auto' ? 'auto' : '*'),
              body: [ tableHeader, ...tableBody ]
            },
            layout: {
              hLineWidth: (i, node) => i === node.table.body.length ? 0 : 1,
              vLineWidth: () => 1,
              hLineColor: () => '#EEEEEE',
              vLineColor: () => '#EEEEEE',
              paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 6, paddingBottom: () => 6
            }
          }
        ],
        styles: { tableHeader: { bold: true, fontSize: 10, color: '#FFFFFF', fillColor: '#2B6B9A', margin: [4, 4, 4, 4] } }
      };

      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.download(filename);
      window.dispatchEvent(new CustomEvent('app-success', {detail: 'Reporte PDF generado'}));
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const exportGenericExcel = async (data, columns, filename) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');
    sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
    
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153250' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    
    data.forEach(item => {
      const rowData = {};
      columns.forEach(col => {
        rowData[col.key] = typeof col.getValue === 'function' ? col.getValue(item) : item[col.key];
      });
      sheet.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    window.dispatchEvent(new CustomEvent('app-success', {detail: 'Reporte Excel generado'}));
  } catch (error) {
    console.error(error);
  }
};
