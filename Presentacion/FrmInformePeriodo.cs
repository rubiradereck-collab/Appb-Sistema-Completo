using Entidades.Gestion_de_Entidades;
using Logica.Gestion_de_Logica;
using Reportes;
using System;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Presentacion
{
    /// <summary>
    /// Informe del período completo y línea base (Etapa 3). Se abre desde el Dashboard.
    /// Formulario construido por código, sin diseñador.
    /// </summary>
    public class FrmInformePeriodo : Form
    {
        private readonly Usuario usuarioActual;

        private readonly DateTimePicker dtpDesde = new DateTimePicker();
        private readonly DateTimePicker dtpHasta = new DateTimePicker();

        private readonly TextBox txtPeriodo = new TextBox();
        private readonly TextBox txtTotal = new TextBox();
        private readonly TextBox txtResolucion = new TextBox();
        private readonly TextBox txtRespuesta = new TextBox();
        private readonly TextBox txtSla = new TextBox();
        private readonly TextBox txtSatisfaccion = new TextBox();
        private readonly TextBox txtFuente = new TextBox();
        private readonly TextBox txtObservaciones = new TextBox();
        private readonly Label lblLineaBase = new Label();
        private readonly Button btnPdf = new Button();
        private readonly Button btnExcel = new Button();
        private readonly ErrorProvider errorProvider = new ErrorProvider();

        public FrmInformePeriodo(Usuario usuarioActual)
        {
            this.usuarioActual = usuarioActual;
            ConstruirInterfaz();
            TemaModerno.Aplicar(this);
            CargarDatosIniciales();
        }

        private void ConstruirInterfaz()
        {
            Text = "Informe del período completo";
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(720, 640);
            Font = new Font("Segoe UI", 10F);
            BackColor = Color.White;

            int x = 20, y = 16;

            Controls.Add(Titulo("1. Período del informe", x, y)); y += 32;
            Controls.Add(Etiqueta("Desde", x, y + 4));
            dtpDesde.Format = DateTimePickerFormat.Short; dtpDesde.Location = new Point(x + 60, y); dtpDesde.Width = 150;
            Controls.Add(Etiqueta("Hasta", x + 240, y + 4));
            dtpHasta.Format = DateTimePickerFormat.Short; dtpHasta.Location = new Point(x + 300, y); dtpHasta.Width = 150;
            y += 44;

            Controls.Add(Titulo("2. Línea base (cifras de antes del sistema)", x, y)); y += 28;
            Controls.Add(new Label
            {
                Text = "Reconstruye lo que puedas de hojas de cálculo o correos de soporte. Deja vacío lo que no tengas.",
                Location = new Point(x, y), AutoSize = true, ForeColor = Color.DimGray, Font = new Font("Segoe UI", 9F)
            });
            y += 26;

            int xc = x + 250;
            Campo("Período medido *", txtPeriodo, x, ref y, 430, "Ej.: Enero a junio de 2026 (antes del sistema)");
            Campo("Incidencias registradas", txtTotal, x, ref y, 120);
            Campo("Tiempo prom. de resolución (h)", txtResolucion, x, ref y, 120);
            Campo("Tiempo prom. de 1.ª respuesta (h)", txtRespuesta, x, ref y, 120);
            Campo("SLA cumplido (%)", txtSla, x, ref y, 120);
            Campo("Satisfacción (1 a 5)", txtSatisfaccion, x, ref y, 120);
            Campo("Fuente de los datos", txtFuente, x, ref y, 430, "Ej.: Hoja de cálculo de soporte 2026");
            Controls.Add(Etiqueta("Observaciones", x, y + 4));
            txtObservaciones.Location = new Point(xc, y); txtObservaciones.Size = new Size(430, 54);
            txtObservaciones.Multiline = true; txtObservaciones.ScrollBars = ScrollBars.Vertical;
            Controls.Add(txtObservaciones);
            y += 64;

            var btnGuardarLb = Boton("💾 Guardar línea base", TemaModerno.ColorExito, new Point(xc, y), 220);
            btnGuardarLb.Click += (s, e) => GuardarLineaBase();
            Controls.Add(btnGuardarLb);
            lblLineaBase.Location = new Point(x, y + 10); lblLineaBase.AutoSize = true;
            lblLineaBase.ForeColor = Color.DimGray; lblLineaBase.Font = new Font("Segoe UI", 8.5F);
            Controls.Add(lblLineaBase);
            y += 62;

            Controls.Add(Titulo("3. Generar informe", x, y)); y += 32;
            ConfigurarBoton(btnPdf, "📄 Generar PDF", TemaModerno.ColorSecundario, new Point(x, y), 200);
            ConfigurarBoton(btnExcel, "📊 Generar Excel", Color.FromArgb(39, 174, 96), new Point(x + 220, y), 200);
            btnPdf.Click += async (s, e) => await Generar(pdf: true);
            btnExcel.Click += async (s, e) => await Generar(pdf: false);
            Controls.AddRange(new Control[] { dtpDesde, dtpHasta, btnPdf, btnExcel });
        }

        private void Campo(string etiqueta, TextBox caja, int x, ref int y, int ancho, string ayuda = null)
        {
            Controls.Add(Etiqueta(etiqueta, x, y + 4));
            caja.Location = new Point(x + 250, y);
            caja.Width = ancho;
            Controls.Add(caja);
            if (ayuda != null) new ToolTip().SetToolTip(caja, ayuda);
            y += 36;
        }

        private static Label Titulo(string texto, int x, int y) => new Label
        {
            Text = texto,
            AutoSize = true,
            Location = new Point(x, y),
            Font = new Font("Segoe UI", 11F, FontStyle.Bold),
            ForeColor = TemaModerno.ColorPrimario
        };

        private static Label Etiqueta(string texto, int x, int y) => new Label { Text = texto, AutoSize = true, Location = new Point(x, y) };

        private static Button Boton(string texto, Color fondo, Point ubicacion, int ancho)
        {
            var b = new Button();
            ConfigurarBoton(b, texto, fondo, ubicacion, ancho);
            return b;
        }

        private static void ConfigurarBoton(Button b, string texto, Color fondo, Point ubicacion, int ancho)
        {
            b.Text = texto;
            b.Location = ubicacion;
            b.Size = new Size(ancho, 42);
            b.FlatStyle = FlatStyle.Flat;
            b.FlatAppearance.BorderSize = 0;
            b.BackColor = fondo;
            b.ForeColor = Color.White;
            b.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            b.Cursor = Cursors.Hand;
        }

        private void CargarDatosIniciales()
        {
            try
            {
                var incidencias = new IncidenciaLN().ShowIncidencia();
                dtpDesde.Value = incidencias.Count > 0 ? incidencias.Min(i => i.Fecha).Date : new DateTime(DateTime.Today.Year, 1, 1);
                dtpHasta.Value = DateTime.Today;

                LineaBase lb = new LineaBaseLN().Obtener();
                if (lb != null)
                {
                    txtPeriodo.Text = lb.Periodo;
                    txtTotal.Text = lb.TotalIncidencias?.ToString() ?? "";
                    txtResolucion.Text = Texto(lb.TiempoPromedioResolucionHoras);
                    txtRespuesta.Text = Texto(lb.TiempoPrimeraRespuestaHoras);
                    txtSla.Text = Texto(lb.PorcentajeSlaCumplido);
                    txtSatisfaccion.Text = Texto(lb.SatisfaccionPromedio);
                    txtFuente.Text = lb.Fuente;
                    txtObservaciones.Text = lb.Observaciones;
                    lblLineaBase.Text = $"Guardada el {lb.FechaRegistro:dd/MM/yyyy}\npor {lb.NombreUsuario}";
                }
                else
                {
                    lblLineaBase.Text = "Todavía no hay línea base.";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static string Texto(decimal? v) => v.HasValue ? v.Value.ToString("0.##", CultureInfo.CurrentCulture) : "";

        /// <summary>Número opcional: vacío = null. Acepta coma o punto decimal.</summary>
        private bool LeerDecimal(TextBox caja, out decimal? valor)
        {
            valor = null;
            string t = caja.Text.Trim();
            if (t.Length == 0) return true;
            t = t.Replace(',', '.');
            if (decimal.TryParse(t, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal d))
            {
                valor = d;
                return true;
            }
            errorProvider.SetError(caja, "Ingresa un número (o déjalo vacío).");
            return false;
        }

        private void GuardarLineaBase()
        {
            errorProvider.Clear();
            bool ok = true;
            ok &= LeerDecimal(txtTotal, out decimal? total);
            ok &= LeerDecimal(txtResolucion, out decimal? resolucion);
            ok &= LeerDecimal(txtRespuesta, out decimal? respuesta);
            ok &= LeerDecimal(txtSla, out decimal? sla);
            ok &= LeerDecimal(txtSatisfaccion, out decimal? satisfaccion);
            if (total.HasValue && total.Value != Math.Floor(total.Value))
            {
                errorProvider.SetError(txtTotal, "Debe ser un número entero.");
                ok = false;
            }
            if (!ok) return;

            try
            {
                var lb = new LineaBase
                {
                    Periodo = txtPeriodo.Text,
                    TotalIncidencias = total.HasValue ? (int?)decimal.ToInt32(total.Value) : null,
                    TiempoPromedioResolucionHoras = resolucion,
                    TiempoPrimeraRespuestaHoras = respuesta,
                    PorcentajeSlaCumplido = sla,
                    SatisfaccionPromedio = satisfaccion,
                    Fuente = string.IsNullOrWhiteSpace(txtFuente.Text) ? null : txtFuente.Text.Trim(),
                    Observaciones = string.IsNullOrWhiteSpace(txtObservaciones.Text) ? null : txtObservaciones.Text.Trim()
                };
                new LineaBaseLN().Guardar(lb, usuarioActual);
                lblLineaBase.Text = $"Guardada el {DateTime.Now:dd/MM/yyyy}\npor {lb.NombreUsuario}";
                MessageBox.Show("Línea base guardada.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private async Task Generar(bool pdf)
        {
            DateTime desde = dtpDesde.Value.Date, hasta = dtpHasta.Value.Date;
            if (hasta < desde)
            {
                MessageBox.Show("La fecha final no puede ser anterior a la inicial.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string ruta;
            using (var dialogo = new SaveFileDialog())
            {
                dialogo.Filter = pdf ? "Archivo PDF|*.pdf" : "Archivo Excel|*.xlsx";
                dialogo.FileName = $"Informe_Periodo_{desde:yyyyMMdd}_{hasta:yyyyMMdd}.{(pdf ? "pdf" : "xlsx")}";
                if (dialogo.ShowDialog(this) != DialogResult.OK) return;
                ruta = dialogo.FileName;
            }

            btnPdf.Enabled = btnExcel.Enabled = false;
            Cursor = Cursors.WaitCursor;
            try
            {
                await Task.Run(() =>
                {
                    var incidencias = new IncidenciaLN().ShowIncidencia();
                    var usuariosActivos = new UsuarioLN().ShowUsuario().Where(u => u.Rol == "Usuario" && u.Estado).ToList();
                    var envios = new GuiaEnvioLN().ShowEnvios();
                    var guias = new GuiaLN().ShowGuia();
                    var lineaBase = new LineaBaseLN().Obtener();

                    var datos = IncidenciaReportes.CalcularInformePeriodo(incidencias, desde, hasta, usuariosActivos, envios, guias, lineaBase);
                    byte[] archivo = pdf ? IncidenciaReportes.GenerarPdfInformePeriodo(datos) : IncidenciaReportes.GenerarExcelInformePeriodo(datos);
                    File.WriteAllBytes(ruta, archivo);

                    new AuditoriaLN().Registrar(usuarioActual.IdUsuario, $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                        "Generar informe", "Reporte", null, $"Informe del período {desde:dd/MM/yyyy} - {hasta:dd/MM/yyyy} ({(pdf ? "PDF" : "Excel")})");
                });

                MessageBox.Show("Informe generado correctamente.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                string detalle = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                MessageBox.Show(detalle, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnPdf.Enabled = btnExcel.Enabled = true;
                Cursor = Cursors.Default;
            }
        }
    }
}
