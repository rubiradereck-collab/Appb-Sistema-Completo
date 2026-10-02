using Presentacion.Formularios.Compartido;
﻿using Logica.Gestion_de_Logica;
using Reportes;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Forms.DataVisualization.Charting;



namespace Presentacion
{
    public partial class FrmDashboard : Form
    {
        public FrmDashboard()
        {
            InitializeComponent();
            if (this.btnEnviarCorreo != null) this.btnEnviarCorreo.Click += new System.EventHandler(this.btnEnviarCorreo_Click);
            TemaModerno.Aplicar(this);
            toolTip1.SetToolTip(btnRefrescar, "Actualizar las métricas y gráficos");
            ConfigurarChart(chartEstado, "Incidencias por Estado", "Estado");
            ConfigurarChart(chartPrioridad, "Incidencias por Prioridad", "Prioridad");
            ConfigurarChart(chartArea, "Incidencias por Área", "Área");
            ConfigurarChart(chartTendencia, "Tendencia de Incidencias por Mes", "Mes");
            cboRangoFecha.Items.Clear();
            cboRangoFecha.Items.AddRange(new object[]
            {
                "Todo el histórico", "Hoy", "Últimos 7 días", "Últimos 30 días", "Este mes", "Personalizado"
            });
            cboRangoFecha.SelectedIndex = 0;
            cboRangoFecha.SelectedIndexChanged += CboRangoFecha_SelectedIndexChanged;

            dtpDesde.Visible = false;
            dtpHasta.Visible = false;

            CargarDatos();
        }
        private void ConfigurarChart(Chart chart, string titulo, string tituloEjeX)
        {
            chart.AntiAliasing = AntiAliasingStyles.All;
            chart.TextAntiAliasingQuality = TextAntiAliasingQuality.High;
            chart.BorderlineDashStyle = ChartDashStyle.NotSet;
            chart.BorderSkin.SkinStyle = BorderSkinStyle.None;
            chart.BackColor = Color.White;

            chart.ChartAreas.Clear();
            ChartArea area = new ChartArea("Principal");
            area.BackColor = Color.White;
            area.BorderColor = Color.Transparent;
            area.AxisX.MajorGrid.LineColor = Color.FromArgb(230, 230, 230);
            area.AxisY.MajorGrid.LineColor = Color.FromArgb(230, 230, 230);
            area.AxisX.LineColor = Color.FromArgb(200, 200, 200);
            area.AxisY.LineColor = Color.FromArgb(200, 200, 200);
            area.AxisX.LabelStyle.Font = new Font("Segoe UI", 9);
            area.AxisY.LabelStyle.Font = new Font("Segoe UI", 9);
            area.AxisX.Title = tituloEjeX;
            area.AxisY.Title = "Cantidad";
            area.AxisX.TitleFont = new Font("Segoe UI", 9, FontStyle.Bold);
            area.AxisY.TitleFont = new Font("Segoe UI", 9, FontStyle.Bold);
            area.AxisX.TitleForeColor = Color.FromArgb(117, 117, 117);
            area.AxisY.TitleForeColor = Color.FromArgb(117, 117, 117);
            chart.ChartAreas.Add(area);

            chart.Titles.Clear();
            Title tituloChart = new Title(titulo);
            tituloChart.Font = new Font("Segoe UI", 12, FontStyle.Bold);
            tituloChart.ForeColor = Color.FromArgb(21, 50, 80);
            chart.Titles.Add(tituloChart);

            chart.Legends.Clear();
        }
        private void CboRangoFecha_SelectedIndexChanged(object sender, EventArgs e)
        {
            bool esPersonalizado = cboRangoFecha.SelectedItem.ToString() == "Personalizado";
            dtpDesde.Visible = esPersonalizado;
            dtpHasta.Visible = esPersonalizado;

            if (!esPersonalizado)
            {
                CargarDatos();
            }
        }

        private void FrmDashboard_Load(object sender, EventArgs e)
        {

        }

        private void btnRefrescar_Click(object sender, EventArgs e)
        {
            CargarDatos();
        }
        private FiltroIncidencias ConstruirFiltroPorRango()
        {
            var filtro = new FiltroIncidencias();
            DateTime hoy = DateTime.Today;

            switch (cboRangoFecha.SelectedItem?.ToString())
            {
                case "Hoy":
                    filtro.FechaDesde = hoy;
                    filtro.FechaHasta = hoy;
                    break;
                case "Últimos 7 días":
                    filtro.FechaDesde = hoy.AddDays(-6);
                    filtro.FechaHasta = hoy;
                    break;
                case "Últimos 30 días":
                    filtro.FechaDesde = hoy.AddDays(-29);
                    filtro.FechaHasta = hoy;
                    break;
                case "Este mes":
                    filtro.FechaDesde = new DateTime(hoy.Year, hoy.Month, 1);
                    filtro.FechaHasta = hoy;
                    break;
                case "Personalizado":
                    filtro.FechaDesde = dtpDesde.Value.Date;
                    filtro.FechaHasta = dtpHasta.Value.Date;
                    break;
                default: // "Todo el histórico"
                    break;
            }

            return filtro;
        }

        private void CargarDatos()
        {
            try
            {
                var incidencias = new IncidenciaLN().ShowIncidencia();

                FiltroIncidencias filtro = ConstruirFiltroPorRango();
                var incidenciasFiltradas = IncidenciaReportes.Filtrar(incidencias, filtro);

                MetricasIncidencias metricas = IncidenciaReportes.CalcularMetricas(incidenciasFiltradas);

                lblTotalValor.Text = metricas.Total.ToString();

                metricas.PorEstado.TryGetValue("Pendiente", out int totalPendientes);
                lblPendientesValor.Text = totalPendientes.ToString();

                metricas.PorEstado.TryGetValue("Resuelto", out int totalResueltas);
                lblResueltosValor.Text = totalResueltas.ToString();

                lblTiempoPromedioValor.Text = metricas.TiempoPromedioResolucionHoras.HasValue
                    ? $"{metricas.TiempoPromedioResolucionHoras.Value:0.#}h"
                    : "N/A";

                LlenarChart(chartEstado, metricas.PorEstado, ColorPorEstado);
                LlenarChart(chartPrioridad, metricas.PorPrioridad, ColorPorPrioridad);
                LlenarChart(chartArea, metricas.PorArea, null); // sin color semántico, todas Azul Acero
                CargarTendenciaMensual();   // <-- agregar esta línea
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private void CargarTendenciaMensual()
        {
            var todasLasIncidencias = new IncidenciaLN().ShowIncidencia();

            DateTime inicio = DateTime.Today.AddMonths(-11);
            inicio = new DateTime(inicio.Year, inicio.Month, 1);

            var porMes = todasLasIncidencias
                .Where(i => i.Fecha >= inicio)
                .GroupBy(i => new { i.Fecha.Year, i.Fecha.Month })
                .ToDictionary(g => g.Key, g => g.Count());

            chartTendencia.Series.Clear();
            Series serie = new Series
            {
                ChartType = SeriesChartType.Line,
                BorderWidth = 3,
                Color = Color.FromArgb(43, 107, 154),
                MarkerStyle = MarkerStyle.Circle,
                MarkerSize = 7,
                IsValueShownAsLabel = true,
                Font = new Font("Segoe UI", 8, FontStyle.Bold),
                LabelForeColor = Color.FromArgb(21, 50, 80)
            };

            for (int i = 0; i < 12; i++)
            {
                DateTime mes = inicio.AddMonths(i);
                porMes.TryGetValue(new { mes.Year, mes.Month }, out int cantidad);
                serie.Points.AddXY(mes.ToString("MMM yy"), cantidad);
            }

            chartTendencia.Series.Add(serie);
        }

        private void LlenarChart(Chart chart, Dictionary<string, int> datos, Func<string, Color> asignarColor)
        {
            chart.Series.Clear();
            Series serie = new Series
            {
                ChartType = SeriesChartType.Column,
                IsValueShownAsLabel = true,
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                LabelForeColor = Color.FromArgb(21, 50, 80)
            };
            serie["PointWidth"] = "0.6";

            foreach (var kvp in datos)
            {
                int indice = serie.Points.AddXY(kvp.Key, kvp.Value);
                serie.Points[indice].Color = asignarColor != null
                    ? asignarColor(kvp.Key)
                    : Color.FromArgb(43, 107, 154); // Azul Acero por defecto

            }

            chart.Series.Add(serie);
        }

        private Color ColorPorEstado(string estado)
        {
            switch (estado)
            {
                case "Pendiente": return Color.FromArgb(243, 156, 18);
                case "En Proceso": return Color.FromArgb(43, 107, 154);
                case "Resuelto": return Color.FromArgb(39, 174, 96);
                case "Cerrado": return Color.FromArgb(117, 117, 117);
                default: return Color.FromArgb(21, 50, 80);
            }
        }

        private Color ColorPorPrioridad(string prioridad)
        {
            switch (prioridad)
            {
                case "Alta": return Color.FromArgb(231, 76, 60);
                case "Media": return Color.FromArgb(243, 156, 18);
                case "Baja": return Color.FromArgb(39, 174, 96);
                default: return Color.FromArgb(21, 50, 80);
            }
        }

        private void toolTip2_Popup(object sender, PopupEventArgs e)
        {

        }
    
        private async void btnEnviarCorreo_Click(object sender, EventArgs e)
        {
            var frmEnvio = new FrmEnviarCorreo("", "Reporte de Dashboard - Sistema de Incidencias APPB", true);
            frmEnvio.ShowDialog();

            if (!frmEnvio.ConfirmaEnvio) return;

            btnEnviarCorreo.Enabled = false;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                string correoDestino = frmEnvio.CorreoDestino;
                string asunto = frmEnvio.Asunto;
                string mensaje = frmEnvio.Mensaje;
                bool adjuntarExcel = frmEnvio.AdjuntarExcel;

                await Task.Run(() =>
                {
                    var todas = new Logica.Gestion_de_Logica.IncidenciaLN().ShowIncidencia();
                    var filtro = ConstruirFiltroPorRango();
                    var filtradas = Reportes.IncidenciaReportes.Filtrar(todas, filtro);

                    var adjuntos = new System.Collections.Generic.List<Tuple<byte[], string>>();
                    
                    byte[] pdf = Reportes.IncidenciaReportes.GenerarPdfListado(filtradas, "Reporte de Incidencias - Dashboard");
                    adjuntos.Add(new Tuple<byte[], string>(pdf, "Reporte_Dashboard.pdf"));

                    if (adjuntarExcel)
                    {
                        byte[] excel = Reportes.IncidenciaReportes.GenerarExcelListado(filtradas);
                        adjuntos.Add(new Tuple<byte[], string>(excel, "Reporte_Dashboard.xlsx"));
                    }

                    Logica.Gestion_de_Logica.CorreoService.EnviarCorreoConAdjuntos(correoDestino, asunto, mensaje, adjuntos);
                    
                    // No hay un idUsuario global en FrmDashboard fácilmente accesible (usualmente se pasaría en el constructor),
                    // usaremos un 0 o null para la auditoría, y "Dashboard" como nombre
                    new Logica.Gestion_de_Logica.AuditoriaLN().Registrar(
                        null,
                        "Sistema / Dashboard",
                        "Enviar correo",
                        "Dashboard",
                        null,
                        $"Destinatario: {correoDestino}, Archivos: {adjuntos.Count}"
                    );
                });

                MessageBox.Show("Correo enviado correctamente.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al enviar el correo:\n{ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnEnviarCorreo.Enabled = true;
                this.Cursor = Cursors.Default;
            }
        }
}
    }

