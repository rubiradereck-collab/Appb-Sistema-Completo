using Logica.Gestion_de_Logica;
using Presentacion.Formularios.Compartido;
using Reportes;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Forms.DataVisualization.Charting;

namespace Presentacion
{
    public partial class FrmDashboard : Form
    {
        private Entidades.Gestion_de_Entidades.Usuario _usuarioActual;
        private bool _ajustando = false;

        public FrmDashboard(Entidades.Gestion_de_Entidades.Usuario usuarioActual)
        {
            InitializeComponent();
            _usuarioActual = usuarioActual;
            btnEnviarCorreo.Click += btnEnviarCorreo_Click;

            TemaModerno.Aplicar(this);

            // Tarjeta de adopción con el mismo estilo que las demás
            EstilizarTarjetaAdopcion();

            // Las 5 tarjetas en una fila y el gráfico debajo ocupando el resto
            flowTarjetas.SetFlowBreak(panelAdopcion, true);
            flowTarjetas.Resize += (s, e) => AjustarLayout();
            this.Shown += (s, e) => AjustarLayout();

            toolTip1.SetToolTip(btnRefrescar, "Actualizar las métricas y gráficos");
            toolTip1.SetToolTip(btnEnviarCorreo, "Enviar el reporte del periodo seleccionado por correo");

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
            AjustarLayout();
        }

        // ================== DISEÑO ==================

        private void EstilizarTarjetaAdopcion()
        {
            // Copia el estilo de la tarjeta "Total"
            panelAdopcion.BackColor = panelTotal.BackColor;
            panelAdopcion.Dock = panelTotal.Dock;
            panelAdopcion.Size = panelTotal.Size;
            panelAdopcion.Margin = panelTotal.Margin;
            panelAdopcion.Padding = panelTotal.Padding;

            // Valor arriba (igual que lblTotalValor)
            lblAdopcionValor.AutoSize = lblTotalValor.AutoSize;
            lblAdopcionValor.Dock = lblTotalValor.Dock;
            lblAdopcionValor.Font = lblTotalValor.Font;
            lblAdopcionValor.ForeColor = lblTotalValor.ForeColor;
            lblAdopcionValor.TextAlign = lblTotalValor.TextAlign;

            // Título abajo (igual que lblTotalTitulo)
            lblAdopcionTitulo.AutoSize = lblTotalTitulo.AutoSize;
            lblAdopcionTitulo.Dock = lblTotalTitulo.Dock;
            lblAdopcionTitulo.Font = lblTotalTitulo.Font;
            lblAdopcionTitulo.ForeColor = lblTotalTitulo.ForeColor;
            lblAdopcionTitulo.TextAlign = lblTotalTitulo.TextAlign;
            lblAdopcionTitulo.Text = "👥 Adopción (meta 80%)";

            // Mismo orden de acoplamiento que la tarjeta Total
            lblAdopcionTitulo.BringToFront();

            // El Designer hace panelAdopcion.SuspendLayout() pero nunca ResumeLayout(),
            // por eso los labels no se acomodaban. Lo reactivamos aquí.
            panelAdopcion.ResumeLayout(false);
            panelAdopcion.PerformLayout();
        }

        private void AjustarLayout()
        {
            if (_ajustando) return;
            _ajustando = true;
            try
            {
                var tarjetas = new List<Control> { panelTotal, panelPendientes, panelResueltos, panelTiempoPromedio, panelAdopcion }
                    .Where(c => c.Visible).ToList();
                if (tarjetas.Count == 0) return;

                int anchoUtil = flowTarjetas.ClientSize.Width - flowTarjetas.Padding.Horizontal;
                int margenes = tarjetas.Sum(c => c.Margin.Horizontal);
                int ancho = Math.Max(150, (anchoUtil - margenes - 2) / tarjetas.Count);

                flowTarjetas.SuspendLayout();
                foreach (var t in tarjetas) t.Width = ancho;
                TabControl.Width = Math.Max(300, anchoUtil - TabControl.Margin.Horizontal - 2);
                flowTarjetas.ResumeLayout(true);

                // Alto del gráfico = espacio libre debajo de las tarjetas
                int finTarjetas = tarjetas.Max(c => c.Bottom + c.Margin.Bottom);
                int alto = flowTarjetas.ClientSize.Height - flowTarjetas.Padding.Bottom
                           - finTarjetas - TabControl.Margin.Vertical - 2;
                TabControl.Height = Math.Max(250, alto);
            }
            finally
            {
                _ajustando = false;
            }
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

        // ================== FILTROS ==================

        private void CboRangoFecha_SelectedIndexChanged(object sender, EventArgs e)
        {
            bool esPersonalizado = cboRangoFecha.SelectedItem.ToString() == "Personalizado";
            dtpDesde.Visible = esPersonalizado;
            dtpHasta.Visible = esPersonalizado;

            if (!esPersonalizado)
                CargarDatos();
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

        private string DescribirPeriodo()
        {
            string rango = cboRangoFecha.SelectedItem?.ToString() ?? "Todo el histórico";
            if (rango == "Personalizado")
                return $"{dtpDesde.Value:dd/MM/yyyy} - {dtpHasta.Value:dd/MM/yyyy}";
            return rango;
        }

        // ================== DATOS ==================

        private int ObtenerTotalUsuariosActivos()
        {
            return new UsuarioLN().ShowUsuario().Count(u => u.Rol == "Usuario" && u.Estado);
        }

        private void CargarDatos()
        {
            try
            {
                var incidencias = new IncidenciaLN().ShowIncidencia();
                var incidenciasFiltradas = IncidenciaReportes.Filtrar(incidencias, ConstruirFiltroPorRango());

                int totalUsuarios = ObtenerTotalUsuariosActivos();
                MetricasIncidencias metricas = IncidenciaReportes.CalcularMetricas(incidenciasFiltradas, totalUsuarios);

                lblTotalValor.Text = metricas.Total.ToString();

                metricas.PorEstado.TryGetValue("Pendiente", out int totalPendientes);
                lblPendientesValor.Text = totalPendientes.ToString();

                metricas.PorEstado.TryGetValue("Resuelto", out int totalResueltas);
                lblResueltosValor.Text = totalResueltas.ToString();

                lblTiempoPromedioValor.Text = metricas.TiempoPromedioResolucionHoras.HasValue
                    ? $"{metricas.TiempoPromedioResolucionHoras.Value:0.#}h"
                    : "N/A";

                MostrarAdopcion(metricas.AdopcionPorcentaje, totalUsuarios);

                LlenarChart(chartEstado, metricas.PorEstado, ColorPorEstado);
                LlenarChart(chartPrioridad, metricas.PorPrioridad, ColorPorPrioridad);
                LlenarChart(chartArea, metricas.PorArea, null);
                CargarTendenciaMensual(incidencias);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void MostrarAdopcion(double porcentaje, int totalUsuarios)
        {
            if (totalUsuarios == 0)
            {
                lblAdopcionValor.Text = "N/A";
                lblAdopcionValor.ForeColor = Color.FromArgb(170, 180, 190);
                return;
            }

            lblAdopcionValor.Text = $"{porcentaje:0}%";
            lblAdopcionValor.ForeColor = porcentaje >= 80
                ? Color.FromArgb(46, 204, 113)   // verde: meta cumplida
                : Color.FromArgb(230, 126, 34);  // naranja: bajo la meta
        }

        private void CargarTendenciaMensual(List<Entidades.Gestion_de_Entidades.Incidencia> todasLasIncidencias)
        {
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
                    : Color.FromArgb(43, 107, 154);
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

        // ================== CORREO ==================

        private async void btnEnviarCorreo_Click(object sender, EventArgs e)
        {
            string periodo = DescribirPeriodo();
            var frmEnvio = new FrmEnviarCorreo(_usuarioActual.Correo,
                $"Reporte de Incidencias APPB - {periodo}", true);
            frmEnvio.ShowDialog();
            if (!frmEnvio.ConfirmaEnvio) return;

            string correoDestino = frmEnvio.CorreoDestino;
            string asunto = frmEnvio.Asunto;
            string mensaje = string.IsNullOrWhiteSpace(frmEnvio.Mensaje)
                ? $"Adjunto encontrará el reporte de incidencias ({periodo}) generado desde el Sistema de Incidencias APPB."
                : frmEnvio.Mensaje;
            bool adjuntarExcel = frmEnvio.AdjuntarExcel;

            if (string.IsNullOrWhiteSpace(correoDestino))
            {
                MessageBox.Show("Ingrese un correo de destino.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // El filtro se lee aquí (hilo de la interfaz), no dentro de Task.Run
            FiltroIncidencias filtro = ConstruirFiltroPorRango();

            btnEnviarCorreo.Enabled = false;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                int cantidadAdjuntos = 0;

                await Task.Run(() =>
                {
                    var todas = new IncidenciaLN().ShowIncidencia();
                    var filtradas = IncidenciaReportes.Filtrar(todas, filtro);
                    int totalUsuarios = ObtenerTotalUsuariosActivos();

                    var adjuntos = new List<Tuple<byte[], string>>();

                    byte[] pdf = IncidenciaReportes.GenerarPdfListado(filtradas,
                        $"Reporte de Incidencias - {periodo}", totalUsuarios);
                    adjuntos.Add(new Tuple<byte[], string>(pdf, "Reporte_Dashboard.pdf"));

                    if (adjuntarExcel)
                    {
                        byte[] excel = IncidenciaReportes.GenerarExcelListado(filtradas, totalUsuarios);
                        adjuntos.Add(new Tuple<byte[], string>(excel, "Reporte_Dashboard.xlsx"));
                    }

                    CorreoService.EnviarCorreoConAdjuntos(correoDestino, asunto, mensaje, adjuntos);
                    cantidadAdjuntos = adjuntos.Count;

                    new AuditoriaLN().Registrar(
                        _usuarioActual.IdUsuario,
                        $"{_usuarioActual.Nombre} {_usuarioActual.Apellido}",
                        "Enviar correo",
                        "Dashboard",
                        null,
                        $"Destinatario: {correoDestino}, Periodo: {periodo}, Archivos: {adjuntos.Count}");
                });

                MessageBox.Show($"Correo enviado correctamente a {correoDestino} ({cantidadAdjuntos} archivo(s)).",
                    "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
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