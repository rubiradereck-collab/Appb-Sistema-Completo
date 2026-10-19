using ClosedXML.Excel;
using Entidades.Gestion_de_Entidades;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;

namespace Reportes
{
    /// <summary>Indicadores de un período (un mes o el período completo). Etapa 3.</summary>
    public class ResumenPeriodo
    {
        public string Etiqueta { get; set; }
        public DateTime Desde { get; set; }
        public DateTime Hasta { get; set; }
        /// <summary>Tickets del período sin contar los anulados.</summary>
        public int Registradas { get; set; }
        public int Anuladas { get; set; }
        public int Resueltas { get; set; }
        public double? PorcentajeResueltas { get; set; }
        public double? TiempoResolucionHoras { get; set; }
        public double? TiempoPrimeraRespuestaHoras { get; set; }
        public double? PorcentajeSlaCumplido { get; set; }
        public int TicketsEvaluadosSla { get; set; }
        public double? Satisfaccion { get; set; }
        public int Calificaciones { get; set; }
        public double? Adopcion { get; set; }
        public int EnviosGuias { get; set; }
        public int DestinatariosGuias { get; set; }
    }

    /// <summary>Tipo de incidencia con su frecuencia y si ya tiene guía.</summary>
    public class TipoFrecuente
    {
        public string Tipo { get; set; }
        public int Tickets { get; set; }
        public double Porcentaje { get; set; }
        public int Guias { get; set; }
    }

    /// <summary>Todo lo que necesita el informe del período completo.</summary>
    public class DatosInformePeriodo
    {
        public DateTime Desde { get; set; }
        public DateTime Hasta { get; set; }
        public ResumenPeriodo Total { get; set; }
        public ResumenPeriodo PrimerMes { get; set; }
        public ResumenPeriodo UltimoMes { get; set; }
        public List<ResumenPeriodo> Meses { get; set; } = new List<ResumenPeriodo>();
        public LineaBase LineaBase { get; set; }
        public List<TipoFrecuente> Tipos { get; set; } = new List<TipoFrecuente>();
        public List<GuiaEnvio> Envios { get; set; } = new List<GuiaEnvio>();
        public int UsuariosActivos { get; set; }
    }

    public static partial class IncidenciaReportes
    {
        private static readonly CultureInfo CulturaEs = new CultureInfo("es-EC");

        /// <summary>
        /// Calcula el informe del período completo: indicadores por mes, primer contra último
        /// mes, línea base, tipos frecuentes sin guía y envíos de guías.
        /// </summary>
        /// <param name="usuariosActivos">Usuarios activos con rol Usuario (para la adopción).</param>
        public static DatosInformePeriodo CalcularInformePeriodo(
            List<Incidencia> todas, DateTime desde, DateTime hasta,
            List<Usuario> usuariosActivos, List<GuiaEnvio> envios, List<Guia> guias, LineaBase lineaBase)
        {
            if (todas == null) throw new ReportesExcepciones("Debe proporcionar las incidencias.", null);
            if (hasta.Date < desde.Date) throw new ReportesExcepciones("La fecha final no puede ser anterior a la inicial.", null);

            try
            {
                desde = desde.Date;
                hasta = hasta.Date;
                envios = envios ?? new List<GuiaEnvio>();
                guias = guias ?? new List<Guia>();
                usuariosActivos = usuariosActivos ?? new List<Usuario>();

                var datos = new DatosInformePeriodo
                {
                    Desde = desde,
                    Hasta = hasta,
                    LineaBase = lineaBase,
                    UsuariosActivos = usuariosActivos.Count,
                    Envios = envios.Where(e => e.Fecha.Date >= desde && e.Fecha.Date <= hasta).OrderBy(e => e.Fecha).ToList()
                };

                datos.Total = Resumir("Período completo", todas, desde, hasta, usuariosActivos, envios);

                for (var mes = new DateTime(desde.Year, desde.Month, 1); mes <= hasta; mes = mes.AddMonths(1))
                {
                    DateTime ini = mes < desde ? desde : mes;
                    DateTime fin = mes.AddMonths(1).AddDays(-1);
                    if (fin > hasta) fin = hasta;
                    string etiqueta = CulturaEs.TextInfo.ToTitleCase(mes.ToString("MMMM yyyy", CulturaEs));
                    datos.Meses.Add(Resumir(etiqueta, todas, ini, fin, usuariosActivos, envios));
                }

                // Primer y último mes con actividad (si no hay ninguno, los extremos del rango)
                var conDatos = datos.Meses.Where(m => m.Registradas > 0).ToList();
                datos.PrimerMes = conDatos.FirstOrDefault() ?? datos.Meses.First();
                datos.UltimoMes = conDatos.LastOrDefault() ?? datos.Meses.Last();

                var enRango = todas.Where(i => i.Fecha.Date >= desde && i.Fecha.Date <= hasta && i.NombreEstado != "Anulado").ToList();
                datos.Tipos = enRango
                    .GroupBy(i => new { i.IdTipoIncidencia, Nombre = string.IsNullOrWhiteSpace(i.TipoIncidencia) ? "Sin tipo" : i.TipoIncidencia.Trim() })
                    .Select(g => new TipoFrecuente
                    {
                        Tipo = g.Key.Nombre,
                        Tickets = g.Count(),
                        Porcentaje = g.Count() * 100.0 / enRango.Count,
                        Guias = g.Key.IdTipoIncidencia.HasValue ? guias.Count(x => x.IdTipoIncidencia == g.Key.IdTipoIncidencia.Value) : 0
                    })
                    .OrderByDescending(t => t.Tickets)
                    .ToList();

                return datos;
            }
            catch (ReportesExcepciones) { throw; }
            catch (Exception ex)
            {
                throw new ReportesExcepciones("Error al calcular el informe del período", ex);
            }
        }

        private static ResumenPeriodo Resumir(string etiqueta, List<Incidencia> todas, DateTime desde, DateTime hasta,
            List<Usuario> usuariosActivos, List<GuiaEnvio> envios)
        {
            // Los anulados (duplicados, reportados por error) se cuentan aparte y no entran en los indicadores
            var delPeriodo = todas.Where(i => i.Fecha.Date >= desde && i.Fecha.Date <= hasta).ToList();
            var incs = delPeriodo.Where(i => i.NombreEstado != "Anulado").ToList();
            var m = new MetricasIncidencias { Total = incs.Count };
            MetricasHelper.CalcularIndicadoresEtapa3(m, incs);

            var resueltas = incs.Where(i => i.FechaSolucion.HasValue).ToList();
            var enviosPeriodo = envios.Where(e => e.Fecha.Date >= desde && e.Fecha.Date <= hasta).ToList();

            return new ResumenPeriodo
            {
                Etiqueta = etiqueta,
                Desde = desde,
                Hasta = hasta,
                Registradas = incs.Count,
                Anuladas = delPeriodo.Count - incs.Count,
                Resueltas = resueltas.Count,
                PorcentajeResueltas = incs.Count > 0 ? resueltas.Count * 100.0 / incs.Count : (double?)null,
                TiempoResolucionHoras = resueltas.Count > 0 ? resueltas.Average(i => (i.FechaSolucion.Value - i.Fecha).TotalHours) : (double?)null,
                TiempoPrimeraRespuestaHoras = m.TiempoPrimeraRespuestaHoras,
                PorcentajeSlaCumplido = m.PorcentajeSlaCumplido,
                TicketsEvaluadosSla = m.TicketsEvaluadosSla,
                Satisfaccion = m.SatisfaccionPromedio,
                Calificaciones = m.TotalCalificaciones,
                Adopcion = MetricasHelper.Adopcion(incs, usuariosActivos),
                EnviosGuias = enviosPeriodo.Count,
                DestinatariosGuias = enviosPeriodo.Sum(e => e.TotalDestinatarios)
            };
        }

        // ---------- Formato ----------

        private static string Num(double? v, string formato = "0.#", string sufijo = "")
            => v.HasValue ? v.Value.ToString(formato, CulturaEs) + sufijo : "—";

        private static string Num(decimal? v, string formato = "0.#", string sufijo = "")
            => v.HasValue ? v.Value.ToString(formato, CulturaEs) + sufijo : "—";

        /// <summary>Variación porcentual de "despues" respecto de "antes" (con signo).</summary>
        private static string Variacion(double? antes, double? despues)
        {
            if (!antes.HasValue || !despues.HasValue || Math.Abs(antes.Value) < 0.0001) return "—";
            double v = (despues.Value - antes.Value) * 100.0 / antes.Value;
            return (v > 0 ? "+" : "") + v.ToString("0.#", CulturaEs) + "%";
        }

        /// <summary>Diferencia en puntos porcentuales (para indicadores que ya son %).</summary>
        private static string DiferenciaPuntos(double? antes, double? despues)
        {
            if (!antes.HasValue || !despues.HasValue) return "—";
            double v = despues.Value - antes.Value;
            return (v > 0 ? "+" : "") + v.ToString("0.#", CulturaEs) + " pts";
        }

        private class FilaComparativa
        {
            public string Indicador;
            public string Base;
            public string Primero;
            public string Ultimo;
            public string Total;
            public string Cambio;
        }

        /// <summary>
        /// Filas del comparativo. "Cambio" compara el último mes con la línea base; si no hay
        /// línea base para ese indicador, con el primer mes.
        /// </summary>
        private static List<FilaComparativa> Comparativo(DatosInformePeriodo d)
        {
            var lb = d.LineaBase;
            double? D(decimal? x) => x.HasValue ? (double)x.Value : (double?)null;

            string CambioRel(double? b, double? p, double? u) => b.HasValue ? Variacion(b, u) + " vs base" : Variacion(p, u) + " vs 1.er mes";
            string CambioPts(double? b, double? p, double? u) => b.HasValue ? DiferenciaPuntos(b, u) + " vs base" : DiferenciaPuntos(p, u) + " vs 1.er mes";

            var filas = new List<FilaComparativa>
            {
                new FilaComparativa
                {
                    Indicador = "Incidencias registradas (sin anuladas)",
                    Base = lb?.TotalIncidencias?.ToString() ?? "—",
                    Primero = d.PrimerMes.Registradas.ToString(),
                    Ultimo = d.UltimoMes.Registradas.ToString(),
                    Total = d.Total.Registradas.ToString(),
                    Cambio = Variacion(d.PrimerMes.Registradas, d.UltimoMes.Registradas) + " vs 1.er mes"
                },
                new FilaComparativa
                {
                    Indicador = "Tiempo promedio de resolución (h)",
                    Base = Num(lb?.TiempoPromedioResolucionHoras),
                    Primero = Num(d.PrimerMes.TiempoResolucionHoras),
                    Ultimo = Num(d.UltimoMes.TiempoResolucionHoras),
                    Total = Num(d.Total.TiempoResolucionHoras),
                    Cambio = CambioRel(D(lb?.TiempoPromedioResolucionHoras), d.PrimerMes.TiempoResolucionHoras, d.UltimoMes.TiempoResolucionHoras)
                },
                new FilaComparativa
                {
                    Indicador = "Tiempo promedio de primera respuesta (h)",
                    Base = Num(lb?.TiempoPrimeraRespuestaHoras),
                    Primero = Num(d.PrimerMes.TiempoPrimeraRespuestaHoras),
                    Ultimo = Num(d.UltimoMes.TiempoPrimeraRespuestaHoras),
                    Total = Num(d.Total.TiempoPrimeraRespuestaHoras),
                    Cambio = CambioRel(D(lb?.TiempoPrimeraRespuestaHoras), d.PrimerMes.TiempoPrimeraRespuestaHoras, d.UltimoMes.TiempoPrimeraRespuestaHoras)
                },
                new FilaComparativa
                {
                    Indicador = "SLA cumplido (%)",
                    Base = Num(lb?.PorcentajeSlaCumplido, "0.#", "%"),
                    Primero = Num(d.PrimerMes.PorcentajeSlaCumplido, "0.#", "%"),
                    Ultimo = Num(d.UltimoMes.PorcentajeSlaCumplido, "0.#", "%"),
                    Total = Num(d.Total.PorcentajeSlaCumplido, "0.#", "%"),
                    Cambio = CambioPts(D(lb?.PorcentajeSlaCumplido), d.PrimerMes.PorcentajeSlaCumplido, d.UltimoMes.PorcentajeSlaCumplido)
                },
                new FilaComparativa
                {
                    Indicador = "Satisfacción promedio (1 a 5)",
                    Base = Num(lb?.SatisfaccionPromedio, "0.0"),
                    Primero = Num(d.PrimerMes.Satisfaccion, "0.0"),
                    Ultimo = Num(d.UltimoMes.Satisfaccion, "0.0"),
                    Total = Num(d.Total.Satisfaccion, "0.0"),
                    Cambio = CambioRel(D(lb?.SatisfaccionPromedio), d.PrimerMes.Satisfaccion, d.UltimoMes.Satisfaccion)
                },
                new FilaComparativa
                {
                    Indicador = "Adopción (% de usuarios que reportan)",
                    Base = "—",
                    Primero = Num(d.PrimerMes.Adopcion, "0.#", "%"),
                    Ultimo = Num(d.UltimoMes.Adopcion, "0.#", "%"),
                    Total = Num(d.Total.Adopcion, "0.#", "%"),
                    Cambio = DiferenciaPuntos(d.PrimerMes.Adopcion, d.UltimoMes.Adopcion) + " vs 1.er mes"
                },
                new FilaComparativa
                {
                    Indicador = "Personas que recibieron guías",
                    Base = "—",
                    Primero = d.PrimerMes.DestinatariosGuias.ToString(),
                    Ultimo = d.UltimoMes.DestinatariosGuias.ToString(),
                    Total = d.Total.DestinatariosGuias.ToString(),
                    Cambio = "—"
                }
            };
            return filas;
        }

        // ---------- PDF ----------

        public static byte[] GenerarPdfInformePeriodo(DatosInformePeriodo d)
        {
            if (d == null) throw new ReportesExcepciones("No hay datos para el informe.", null);

            try
            {
                string titulo = $"Informe del Período {d.Desde:dd/MM/yyyy} - {d.Hasta:dd/MM/yyyy}";
                var filas = Comparativo(d);

                var documento = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4.Landscape());
                        page.Margin(0);
                        page.DefaultTextStyle(x => x.FontFamily("Segoe UI").FontSize(9));

                        Encabezado(page, titulo, d.Total.Registradas);

                        page.Content().Padding(20).Column(col =>
                        {
                            col.Spacing(6);

                            // Tarjetas del período completo
                            col.Item().PaddingBottom(10).Row(row =>
                            {
                                row.Spacing(10);

                                void Tarjeta(string etiqueta, string valor)
                                {
                                    row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                                    {
                                        c.Item().Text(etiqueta.ToUpper()).FontSize(7).FontColor(Colors.Grey.Medium).Bold();
                                        c.Item().PaddingTop(3).Text(valor).FontSize(16).Bold().FontColor(ColorNavy);
                                    });
                                }

                                Tarjeta("Incidencias", d.Total.Registradas.ToString());
                                Tarjeta("Resueltas", Num(d.Total.PorcentajeResueltas, "0.#", "%"));
                                Tarjeta("T. resolución", Num(d.Total.TiempoResolucionHoras, "0.#", " h"));
                                Tarjeta("T. 1.ª respuesta", Num(d.Total.TiempoPrimeraRespuestaHoras, "0.#", " h"));
                                Tarjeta("SLA cumplido", Num(d.Total.PorcentajeSlaCumplido, "0.#", "%"));
                                Tarjeta("Satisfacción", d.Total.Satisfaccion.HasValue ? Num(d.Total.Satisfaccion, "0.0", "/5") : "—");
                                Tarjeta("Adopción", Num(d.Total.Adopcion, "0.#", "%"));
                            });

                            // Comparativo
                            col.Item().Text("Comparativo: antes del sistema, primer mes y último mes").FontSize(13).FontColor(ColorNavy).SemiBold();
                            if (d.LineaBase != null)
                                col.Item().Text($"Línea base: {d.LineaBase.Periodo}" + (string.IsNullOrWhiteSpace(d.LineaBase.Fuente) ? "" : $" (fuente: {d.LineaBase.Fuente})"))
                                    .FontSize(8).FontColor(Colors.Grey.Darken1).Italic();
                            else
                                col.Item().Text("No se registró línea base: el cambio se mide contra el primer mes del sistema.")
                                    .FontSize(8).FontColor(Colors.Orange.Darken2).Italic();

                            col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.RelativeColumn(3);
                                    c.RelativeColumn(1.4f);
                                    c.RelativeColumn(1.4f);
                                    c.RelativeColumn(1.4f);
                                    c.RelativeColumn(1.4f);
                                    c.RelativeColumn(1.8f);
                                });
                                table.Header(h =>
                                {
                                    void Cab(string t) => h.Cell().Element(c => c.Background(ColorAcero).Padding(6)).Text(t).FontColor(Colors.White).Bold().FontSize(8);
                                    Cab("Indicador");
                                    Cab("Antes del sistema");
                                    Cab($"Primer mes ({d.PrimerMes.Etiqueta})");
                                    Cab($"Último mes ({d.UltimoMes.Etiqueta})");
                                    Cab("Período completo");
                                    Cab("Cambio");
                                });
                                int n = 0;
                                foreach (var f in filas)
                                {
                                    Color fondo = n++ % 2 == 0 ? Colors.White : ColorFilaPar;
                                    void Celda(string t) => table.Cell().Background(fondo).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).Text(t ?? "—");
                                    Celda(f.Indicador); Celda(f.Base); Celda(f.Primero); Celda(f.Ultimo); Celda(f.Total); Celda(f.Cambio);
                                }
                            });

                            // Mes a mes
                            col.Item().PaddingTop(12).Text("Evolución mes a mes").FontSize(13).FontColor(ColorNavy).SemiBold();
                            col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Table(table =>
                            {
                                table.ColumnsDefinition(c =>
                                {
                                    c.RelativeColumn(2);
                                    for (int i = 0; i < 9; i++) c.RelativeColumn(1);
                                });
                                table.Header(h =>
                                {
                                    void Cab(string t) => h.Cell().Element(c => c.Background(ColorAcero).Padding(5)).Text(t).FontColor(Colors.White).Bold().FontSize(8);
                                    Cab("Mes"); Cab("Registradas"); Cab("Anuladas"); Cab("Resueltas"); Cab("T. resol. (h)"); Cab("T. 1.ª resp. (h)");
                                    Cab("SLA"); Cab("Satisfacción"); Cab("Adopción"); Cab("Guías (personas)");
                                });
                                int n = 0;
                                foreach (var m in d.Meses)
                                {
                                    Color fondo = n++ % 2 == 0 ? Colors.White : ColorFilaPar;
                                    void Celda(string t) => table.Cell().Background(fondo).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(t ?? "—");
                                    Celda(m.Etiqueta);
                                    Celda(m.Registradas.ToString());
                                    Celda(m.Anuladas.ToString());
                                    Celda(m.Resueltas.ToString());
                                    Celda(Num(m.TiempoResolucionHoras));
                                    Celda(Num(m.TiempoPrimeraRespuestaHoras));
                                    Celda(Num(m.PorcentajeSlaCumplido, "0.#", "%"));
                                    Celda(m.Satisfaccion.HasValue ? $"{Num(m.Satisfaccion, "0.0")} ({m.Calificaciones})" : "—");
                                    Celda(Num(m.Adopcion, "0.#", "%"));
                                    Celda(m.DestinatariosGuias.ToString());
                                }
                            });

                            // Tipos frecuentes y guías
                            col.Item().PaddingTop(12).Text("Tipos de incidencia más frecuentes y guías disponibles").FontSize(13).FontColor(ColorNavy).SemiBold();
                            var sinGuia = d.Tipos.Where(t => t.Guias == 0).Take(5).Select(t => t.Tipo).ToList();
                            col.Item().Text(sinGuia.Count == 0
                                    ? "Todos los tipos con tickets en el período tienen al menos una guía."
                                    : $"Sin guía todavía: {string.Join(", ", sinGuia)}. Conviene crear guías para estos tipos.")
                                .FontSize(9).FontColor(sinGuia.Count == 0 ? Colors.Green.Darken2 : Colors.Orange.Darken2);
                            col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Table(table =>
                            {
                                table.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(1); c.RelativeColumn(1); c.RelativeColumn(1); });
                                table.Header(h =>
                                {
                                    void Cab(string t) => h.Cell().Element(c => c.Background(ColorAcero).Padding(5)).Text(t).FontColor(Colors.White).Bold().FontSize(8);
                                    Cab("Tipo"); Cab("Tickets"); Cab("%"); Cab("Guías");
                                });
                                int n = 0;
                                foreach (var t in d.Tipos.Take(15))
                                {
                                    Color fondo = n++ % 2 == 0 ? Colors.White : ColorFilaPar;
                                    void Celda(string x) => table.Cell().Background(fondo).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(x);
                                    Celda(t.Tipo); Celda(t.Tickets.ToString()); Celda(Num(t.Porcentaje, "0.#", "%"));
                                    Celda(t.Guias == 0 ? "Sin guía" : t.Guias.ToString());
                                }
                            });

                            // Envíos de guías
                            col.Item().PaddingTop(12).Text("Envíos de guías").FontSize(13).FontColor(ColorNavy).SemiBold();
                            if (d.Envios.Count == 0)
                            {
                                col.Item().Text("No se registraron envíos de guías en el período.").FontSize(9).FontColor(Colors.Grey.Darken1);
                            }
                            else
                            {
                                col.Item().Text($"{d.Envios.Count} envío(s), {d.Envios.Sum(e => e.TotalDestinatarios)} destinatario(s) en total.").FontSize(9);
                                col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Table(table =>
                                {
                                    table.ColumnsDefinition(c => { c.ConstantColumn(85); c.RelativeColumn(1.4f); c.RelativeColumn(1.6f); c.RelativeColumn(0.8f); c.RelativeColumn(3); });
                                    table.Header(h =>
                                    {
                                        void Cab(string t) => h.Cell().Element(c => c.Background(ColorAcero).Padding(5)).Text(t).FontColor(Colors.White).Bold().FontSize(8);
                                        Cab("Fecha"); Cab("Enviado por"); Cab("Destino"); Cab("Personas"); Cab("Guías");
                                    });
                                    int n = 0;
                                    foreach (var e in d.Envios)
                                    {
                                        Color fondo = n++ % 2 == 0 ? Colors.White : ColorFilaPar;
                                        void Celda(string x) => table.Cell().Background(fondo).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(x ?? "—");
                                        string destino = e.TipoDestino == GuiaEnvio.DestinoArea ? $"Área {e.NombreArea}"
                                            : e.TipoDestino == GuiaEnvio.DestinoTodos ? "Todos los usuarios" : e.Destinatarios;
                                        Celda(e.Fecha.ToString("dd/MM/yy HH:mm"));
                                        Celda(e.NombreUsuario);
                                        Celda(destino);
                                        Celda(e.TotalDestinatarios.ToString());
                                        Celda(e.Guias);
                                    }
                                });
                            }

                            col.Item().PaddingTop(10).Text(
                                "Notas: el SLA se mide sobre tickets resueltos o cerrados (Alta 4 h, Media 24 h, Baja 72 h). " +
                                "Los tickets anulados se muestran aparte y no cuentan en los demás indicadores. " +
                                "La primera respuesta y la satisfacción solo existen para tickets creados después de su incorporación al sistema. " +
                                $"La adopción se calcula sobre {d.UsuariosActivos} usuario(s) activo(s) con rol Usuario.")
                                .FontSize(7).FontColor(Colors.Grey.Medium).Italic();
                        });

                        PieDePagina(page);
                    });
                });

                return documento.GeneratePdf();
            }
            catch (Exception ex)
            {
                throw new ReportesExcepciones("Error al generar el PDF del informe del período", ex);
            }
        }

        // ---------- Excel ----------

        public static byte[] GenerarExcelInformePeriodo(DatosInformePeriodo d)
        {
            if (d == null) throw new ReportesExcepciones("No hay datos para el informe.", null);

            try
            {
                using (var workbook = new XLWorkbook())
                {
                    void Encabezados(IXLWorksheet hoja, int fila, params string[] textos)
                    {
                        for (int i = 0; i < textos.Length; i++) hoja.Cell(fila, i + 1).Value = textos[i];
                        hoja.Row(fila).Style.Font.Bold = true;
                        hoja.Row(fila).Style.Font.FontColor = XLColor.White;
                        hoja.Row(fila).Style.Fill.BackgroundColor = XLColor.FromArgb(21, 50, 80);
                    }
                    void Numero(IXLCell celda, double? valor)
                    {
                        if (valor.HasValue) celda.Value = Math.Round(valor.Value, 2); else celda.Value = "-";
                    }

                    // Hoja 1: comparativo
                    var comp = workbook.Worksheets.Add("Comparativo");
                    comp.Cell(1, 1).Value = $"Informe del período {d.Desde:dd/MM/yyyy} - {d.Hasta:dd/MM/yyyy}";
                    comp.Row(1).Style.Font.Bold = true;
                    comp.Row(1).Style.Font.FontSize = 14;
                    comp.Cell(2, 1).Value = d.LineaBase != null
                        ? $"Línea base: {d.LineaBase.Periodo}" + (string.IsNullOrWhiteSpace(d.LineaBase.Fuente) ? "" : $" (fuente: {d.LineaBase.Fuente})")
                        : "Sin línea base registrada";
                    Encabezados(comp, 4, "Indicador", "Antes del sistema", $"Primer mes ({d.PrimerMes.Etiqueta})",
                        $"Último mes ({d.UltimoMes.Etiqueta})", "Período completo", "Cambio");
                    int f = 5;
                    foreach (var fila in Comparativo(d))
                    {
                        comp.Cell(f, 1).Value = fila.Indicador;
                        comp.Cell(f, 2).Value = fila.Base;
                        comp.Cell(f, 3).Value = fila.Primero;
                        comp.Cell(f, 4).Value = fila.Ultimo;
                        comp.Cell(f, 5).Value = fila.Total;
                        comp.Cell(f, 6).Value = fila.Cambio;
                        f++;
                    }
                    comp.Columns().AdjustToContents();

                    // Hoja 2: mes a mes (números, para graficar en Excel)
                    var meses = workbook.Worksheets.Add("Mes a mes");
                    Encabezados(meses, 1, "Mes", "Registradas", "Anuladas", "Resueltas", "% Resueltas", "T. resolución (h)", "T. 1.ª respuesta (h)",
                        "% SLA cumplido", "Tickets evaluados SLA", "Satisfacción (1-5)", "Calificaciones", "% Adopción", "Envíos de guías", "Personas con guías");
                    f = 2;
                    foreach (var m in d.Meses.Concat(new[] { d.Total }))
                    {
                        meses.Cell(f, 1).Value = m.Etiqueta;
                        meses.Cell(f, 2).Value = m.Registradas;
                        meses.Cell(f, 3).Value = m.Anuladas;
                        meses.Cell(f, 4).Value = m.Resueltas;
                        Numero(meses.Cell(f, 5), m.PorcentajeResueltas);
                        Numero(meses.Cell(f, 6), m.TiempoResolucionHoras);
                        Numero(meses.Cell(f, 7), m.TiempoPrimeraRespuestaHoras);
                        Numero(meses.Cell(f, 8), m.PorcentajeSlaCumplido);
                        meses.Cell(f, 9).Value = m.TicketsEvaluadosSla;
                        Numero(meses.Cell(f, 10), m.Satisfaccion);
                        meses.Cell(f, 11).Value = m.Calificaciones;
                        Numero(meses.Cell(f, 12), m.Adopcion);
                        meses.Cell(f, 13).Value = m.EnviosGuias;
                        meses.Cell(f, 14).Value = m.DestinatariosGuias;
                        f++;
                    }
                    meses.Row(f - 1).Style.Font.Bold = true;
                    meses.Columns().AdjustToContents();
                    meses.SheetView.FreezeRows(1);

                    // Hoja 3: tipos y guías
                    var tipos = workbook.Worksheets.Add("Tipos y guías");
                    Encabezados(tipos, 1, "Tipo", "Tickets", "%", "Guías");
                    f = 2;
                    foreach (var t in d.Tipos)
                    {
                        tipos.Cell(f, 1).Value = t.Tipo;
                        tipos.Cell(f, 2).Value = t.Tickets;
                        tipos.Cell(f, 3).Value = Math.Round(t.Porcentaje, 2);
                        if (t.Guias == 0) tipos.Cell(f, 4).Value = "Sin guía"; else tipos.Cell(f, 4).Value = t.Guias;
                        f++;
                    }
                    tipos.Columns().AdjustToContents();

                    // Hoja 4: envíos de guías
                    var env = workbook.Worksheets.Add("Envíos de guías");
                    Encabezados(env, 1, "Fecha", "Enviado por", "Canal", "Destino", "Área", "Personas", "Guías", "Destinatarios");
                    f = 2;
                    foreach (var e in d.Envios)
                    {
                        env.Cell(f, 1).Value = e.Fecha;
                        env.Cell(f, 1).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                        env.Cell(f, 2).Value = e.NombreUsuario;
                        env.Cell(f, 3).Value = e.Canal;
                        env.Cell(f, 4).Value = e.TipoDestino;
                        env.Cell(f, 5).Value = e.NombreArea ?? "";
                        env.Cell(f, 6).Value = e.TotalDestinatarios;
                        env.Cell(f, 7).Value = e.Guias ?? "";
                        env.Cell(f, 8).Value = e.Destinatarios ?? "";
                        f++;
                    }
                    env.Columns(1, 7).AdjustToContents();

                    using (var ms = new MemoryStream())
                    {
                        workbook.SaveAs(ms);
                        return ms.ToArray();
                    }
                }
            }
            catch (Exception ex)
            {
                throw new ReportesExcepciones("Error al generar el Excel del informe del período", ex);
            }
        }
    }
}
