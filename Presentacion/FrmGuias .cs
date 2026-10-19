using Presentacion.Formularios.Compartido;
using Entidades.Gestion_de_Entidades;
using Logica.Gestion_de_Logica;
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
using System.IO;

namespace Presentacion
{
    public partial class FrmGuias : Form
    {
        private bool ordenAscendente = true;
        private string columnaOrdenada = null;
        private List<Guia> listaGuiasCompleta;
        private readonly GuiaLN guiaLN = new GuiaLN();
        private List<Guia> listaGuias;
        private Guia guiaSeleccionada;
        private readonly Usuario usuarioActual;

        // Etapa 3: tipo de incidencia de la guía (se crea por código, junto al título)
        private readonly ComboBox cboTipo = new ComboBox();

        public FrmGuias(Usuario usuarioActual)
        {
            InitializeComponent();
            TemaModerno.Aplicar(this);
            this.usuarioActual = usuarioActual;

            grid.SelectionChanged += grid_SelectionChanged;
            txtBuscar.TextChanged += txtBuscar_TextChanged;
            grid.ColumnHeaderMouseClick += grid_ColumnHeaderMouseClick;
            CrearComboTipo();
            CargarGrid();
            LimpiarFormulario();
            toolTip1.SetToolTip(button1, "Limpiar el formulario para crear una nueva guía");
            toolTip1.SetToolTip(button2, "Guardar los cambios de la guía");
            toolTip1.SetToolTip(button3, "Eliminar la guía permanentemente");
            toolTip1.SetToolTip(button4, "Exportar el catálogo de guías a PDF");
            toolTip1.SetToolTip(button5, "Exportar el catálogo de guías a Excel");

            if (usuarioActual != null && usuarioActual.Rol == "Usuario")
            {
                button1.Enabled = false; // Nuevo
                button2.Enabled = false; // Guardar
                button3.Enabled = false; // Eliminar
                cboTipo.Enabled = false;
            }

        }

        private void CrearComboTipo()
        {
            // El título se acorta para dejar sitio al tipo en la misma fila
            int anchoTotal = txtTitulo.Width;
            txtTitulo.Width = (int)(anchoTotal * 0.58);

            var lblTipo = new Label
            {
                Text = "🧩 Tipo",
                AutoSize = true,
                Font = label1.Font,
                Location = new Point(txtTitulo.Right + 10, label1.Top)
            };
            cboTipo.DropDownStyle = ComboBoxStyle.DropDownList;
            cboTipo.Font = txtTitulo.Font;
            cboTipo.Location = new Point(txtTitulo.Right + 12, txtTitulo.Top);
            cboTipo.Width = txtTitulo.Left + anchoTotal - cboTipo.Left;

            txtTitulo.Parent.Controls.Add(lblTipo);
            txtTitulo.Parent.Controls.Add(cboTipo);
            toolTip1.SetToolTip(cboTipo, "Tipo de incidencia que resuelve esta guía");
            CargarTipos(null);
        }

        /// <summary>Tipos activos más el de la guía abierta (aunque esté desactivado).</summary>
        private void CargarTipos(int? idTipoDeLaGuia)
        {
            try
            {
                var tipos = new TipoIncidenciaLN().ShowTipos()
                    .Where(t => t.Activo || t.IdTipoIncidencia == idTipoDeLaGuia)
                    .ToList();
                tipos.Insert(0, new TipoIncidencia(0, "(Sin tipo)", true));
                cboTipo.DataSource = null;
                cboTipo.DisplayMember = "Nombre";
                cboTipo.ValueMember = "IdTipoIncidencia";
                cboTipo.DataSource = tipos;
                cboTipo.SelectedValue = idTipoDeLaGuia ?? 0;
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private int? TipoSeleccionado()
        {
            return cboTipo.SelectedValue is int id && id > 0 ? id : (int?)null;
        }

        private void FormatearColumnas()
        {
            foreach (string columna in new[] { "IdGuia", "Problema", "Solucion", "IdTipoIncidencia" })
            {
                if (grid.Columns[columna] != null) grid.Columns[columna].Visible = false;
            }
            if (grid.Columns["Titulo"] != null) grid.Columns["Titulo"].HeaderText = "Título";
            if (grid.Columns["NombreTipo"] != null) grid.Columns["NombreTipo"].HeaderText = "Tipo";
            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
        }

        private void CargarGrid()
        {
            try
            {
                listaGuiasCompleta = guiaLN.ShowGuia();
                AplicarBusqueda();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void grid_ColumnHeaderMouseClick(object sender, DataGridViewCellMouseEventArgs e)
        {
            string propiedad = grid.Columns[e.ColumnIndex].DataPropertyName;
            if (string.IsNullOrEmpty(propiedad)) return;

            if (columnaOrdenada == propiedad)
                ordenAscendente = !ordenAscendente;
            else
            {
                columnaOrdenada = propiedad;
                ordenAscendente = true;
            }

            var propInfo = typeof(Guia).GetProperty(propiedad);
            if (propInfo == null) return;

            listaGuias = ordenAscendente
                ? listaGuias.OrderBy(g => propInfo.GetValue(g)).ToList()
                : listaGuias.OrderByDescending(g => propInfo.GetValue(g)).ToList();

            grid.DataSource = null;
            grid.DataSource = listaGuias;
            FormatearColumnas();
        }
        private void AplicarBusqueda()
        {
            try
            {
                string busqueda = txtBuscar.Text.Trim();

                listaGuias = string.IsNullOrWhiteSpace(busqueda)
                    ? listaGuiasCompleta
                    : listaGuiasCompleta
                        .Where(g => g.Titulo.IndexOf(busqueda, StringComparison.OrdinalIgnoreCase) >= 0)
                        .ToList();

                grid.DataSource = null;
                grid.DataSource = listaGuias;
                FormatearColumnas();

                lblContador.Text = $"Total: {listaGuias.Count} guía(s)";
                lblSinDatos.Text = listaGuias.Count == 0 ? "No hay guías registradas." : "";
                lblSinDatos.Visible = listaGuias.Count == 0;
                lblSinDatos.BringToFront();
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

        }
        private void grid_SelectionChanged(object sender, EventArgs e)
        {
            if (grid.CurrentRow == null) return;

            guiaSeleccionada = grid.CurrentRow.DataBoundItem as Guia;
            if (guiaSeleccionada == null) return;

            txtTitulo.Text = guiaSeleccionada.Titulo;
            txtProblema.Text = guiaSeleccionada.Problema;
            txtSolucion.Text = guiaSeleccionada.Solucion;
            CargarTipos(guiaSeleccionada.IdTipoIncidencia);
        }


        private void button1_Click(object sender, EventArgs e)
        {
            LimpiarFormulario();
        }

        private void LimpiarFormulario()
        {
            grid.CurrentCell = null;
            grid.ClearSelection();

            guiaSeleccionada = null;
            txtTitulo.Clear();
            txtProblema.Clear();
            txtSolucion.Clear();
            CargarTipos(null);
            txtTitulo.Focus();
        }
        private bool ValidarCampos()
        {
            errorProvider1.Clear();
            bool esValido = true;

            if (string.IsNullOrWhiteSpace(txtTitulo.Text))
            {
                errorProvider1.SetError(txtTitulo, "Este campo es obligatorio.");
                esValido = false;
            }

            if (string.IsNullOrWhiteSpace(txtProblema.Text))
            {
                errorProvider1.SetError(txtProblema, "Este campo es obligatorio.");
                esValido = false;
            }

            if (string.IsNullOrWhiteSpace(txtSolucion.Text))
            {
                errorProvider1.SetError(txtSolucion, "Este campo es obligatorio.");
                esValido = false;
            }

            return esValido;
        }
        private void button2_Click(object sender, EventArgs e)
        {
            if (!ValidarCampos()) return;

            try
            {
                if (guiaSeleccionada == null)
                {
                    Guia nueva = new Guia(0, txtTitulo.Text, txtProblema.Text, txtSolucion.Text)
                    {
                        IdTipoIncidencia = TipoSeleccionado()
                    };
                    guiaLN.InsertGuia(nueva);
                    RegistrarAuditoria("Crear", nueva.IdGuia > 0 ? nueva.IdGuia : (int?)null, $"Guía: {nueva.Titulo} | Tipo: {cboTipo.Text}");
                }
                else
                {
                    guiaSeleccionada.Titulo = txtTitulo.Text;
                    guiaSeleccionada.Problema = txtProblema.Text;
                    guiaSeleccionada.Solucion = txtSolucion.Text;
                    guiaSeleccionada.IdTipoIncidencia = TipoSeleccionado();
                    guiaLN.UpdateGuia(guiaSeleccionada);
                    RegistrarAuditoria("Modificar", guiaSeleccionada.IdGuia, $"Guía: {guiaSeleccionada.Titulo} | Tipo: {cboTipo.Text}");
                }

                CargarGrid();
                LimpiarFormulario();
                MessageBox.Show("Guardado correctamente.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void button3_Click(object sender, EventArgs e)
        {
            if (guiaSeleccionada == null)
            {
                MessageBox.Show("Selecciona una guía primero.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            DialogResult confirmacion = MessageBox.Show(
                $"¿Eliminar la guía \"{guiaSeleccionada.Titulo}\"?",
                "Confirmar", MessageBoxButtons.YesNo, MessageBoxIcon.Question);

            if (confirmacion != DialogResult.Yes) return;

            try
            {
                guiaLN.DeleteGuia(guiaSeleccionada);
                RegistrarAuditoria("Eliminar", guiaSeleccionada.IdGuia, $"Guía: {guiaSeleccionada.Titulo}");
                CargarGrid();
                LimpiarFormulario();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void RegistrarAuditoria(string accion, int? idGuia, string detalle)
        {
            try
            {
                new AuditoriaLN().Registrar(usuarioActual?.IdUsuario,
                    usuarioActual != null ? $"{usuarioActual.Nombre} {usuarioActual.Apellido}" : "Desconocido",
                    accion, "Guía", idGuia, detalle);
            }
            catch { /* la auditoría no debe impedir el guardado */ }
        }

        private void button4_Click(object sender, EventArgs e)
        {
            try
            {
                byte[] pdf = IncidenciaReportes.GenerarPdfListadoGuias(listaGuias);
                GuardarArchivo(pdf, "pdf", "Archivo PDF|*.pdf");
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void button5_Click(object sender, EventArgs e)
        {
            try
            {
                byte[] excel = IncidenciaReportes.GenerarExcelListadoGuias(listaGuias);
                GuardarArchivo(excel, "xlsx", "Archivo Excel|*.xlsx");
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }


        private void GuardarArchivo(byte[] contenido, string extension, string filtro)
        {
            using (SaveFileDialog dialogo = new SaveFileDialog())
            {
                dialogo.Filter = filtro;
                dialogo.FileName = $"Guias_{DateTime.Now:yyyyMMdd_HHmm}.{extension}";

                if (dialogo.ShowDialog() == DialogResult.OK)
                {
                    File.WriteAllBytes(dialogo.FileName, contenido);
                    MessageBox.Show("Exportado correctamente.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
        }

        private void txtBuscar_TextChanged(object sender, EventArgs e)
        {
            AplicarBusqueda();

        }

        private void label9_Click(object sender, EventArgs e)
        {

        }

        private void FrmGuias_KeyDown(object sender, KeyEventArgs e)
        {
            bool enCampoMultilinea = this.ActiveControl is TextBox tb && tb.Multiline;

            if (e.KeyCode == Keys.Enter && !enCampoMultilinea)
            {
                button2.PerformClick();
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.Delete && !(this.ActiveControl is TextBox))
            {
                button3.PerformClick();
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.F5)
            {
                AplicarBusqueda();
                e.Handled = true;
            }
        }
        private void ConfigurarPlaceholder(TextBox txt, string textoPlaceholder)
        {
            txt.Text = textoPlaceholder;
            txt.ForeColor = Color.Gray;

            txt.Enter += (s, e) =>
            {
                if (txt.Text == textoPlaceholder)
                {
                    txt.Text = "";
                    txt.ForeColor = Color.Black;
                }
            };

            txt.Leave += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(txt.Text))
                {
                    txt.Text = textoPlaceholder;
                    txt.ForeColor = Color.Gray;
                }
            };
        }
        // Etapa 3: envío a un correo, a todos o a los usuarios de un área, y registro de cada envío
        private async void btnEnviarCorreo_Click(object sender, EventArgs e)
        {
            if (listaGuias == null || listaGuias.Count == 0)
            {
                MessageBox.Show("No hay guías para enviar.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string tipoDestino, correoDestino, nombreArea, asunto, mensaje;
            int? idArea;
            List<Guia> guias;
            using (var dlg = new FrmEnviarGuias(guiaSeleccionada?.Titulo, listaGuias.Count))
            {
                TemaModerno.Aplicar(dlg);
                if (dlg.ShowDialog(this) != DialogResult.OK) return;

                tipoDestino = dlg.TipoDestino;
                correoDestino = dlg.Correo;
                idArea = dlg.IdArea;
                nombreArea = dlg.NombreArea;
                asunto = dlg.Asunto;
                mensaje = string.IsNullOrWhiteSpace(dlg.Mensaje)
                    ? "Adjunto encontrará guías rápidas para solucionar problemas frecuentes."
                    : dlg.Mensaje;
                guias = dlg.SoloSeleccionada && guiaSeleccionada != null
                    ? new List<Guia> { guiaSeleccionada }
                    : listaGuias.ToList();
            }

            var envioLN = new GuiaEnvioLN();
            List<string> destinatarios;
            try
            {
                destinatarios = tipoDestino == GuiaEnvio.DestinoCorreo
                    ? new List<string> { correoDestino }
                    : envioLN.ObtenerDestinatarios(idArea);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            string descripcionDestino = tipoDestino == GuiaEnvio.DestinoCorreo ? correoDestino
                : tipoDestino == GuiaEnvio.DestinoArea ? $"los usuarios del área {nombreArea}"
                : "todos los usuarios activos";

            if (destinatarios.Count == 0)
            {
                MessageBox.Show(tipoDestino == GuiaEnvio.DestinoArea
                        ? $"No hay usuarios activos con correo en el área {nombreArea}. Asigna el área a los usuarios en el módulo Usuarios."
                        : "No hay usuarios activos con correo registrado.",
                    "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (tipoDestino != GuiaEnvio.DestinoCorreo)
            {
                var resp = MessageBox.Show(
                    $"Se enviarán {guias.Count} guía(s) a {destinatarios.Count} persona(s) ({descripcionDestino}) en copia oculta.\n\n¿Desea continuar?",
                    "Confirmar envío", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
                if (resp != DialogResult.Yes) return;
            }

            btnEnviarCorreo.Enabled = false;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                await Task.Run(() =>
                {
                    string titulo = guias.Count == 1 ? guias[0].Titulo : "Catálogo de Guías de Ayuda";
                    byte[] pdf = IncidenciaReportes.GenerarPdfListadoGuias(guias, titulo);

                    if (tipoDestino == GuiaEnvio.DestinoCorreo)
                    {
                        var adjuntos = new List<Tuple<byte[], string>> { new Tuple<byte[], string>(pdf, "GuiasDeAyuda.pdf") };
                        CorreoService.EnviarCorreoConAdjuntos(correoDestino, asunto, mensaje, adjuntos);
                    }
                    else
                    {
                        string tempPdf = Path.Combine(Path.GetTempPath(), $"GuiasDeAyuda_{Guid.NewGuid():N}.pdf");
                        File.WriteAllBytes(tempPdf, pdf);
                        try
                        {
                            var adjuntosRutas = new List<string> { tempPdf };
                            for (int i = 0; i < destinatarios.Count; i += 50)
                            {
                                var lote = destinatarios.Skip(i).Take(50).ToList();
                                CorreoService.EnviarCorreoMasivoBcc(lote, asunto, mensaje, adjuntosRutas);
                            }
                        }
                        finally
                        {
                            try { File.Delete(tempPdf); } catch { }
                        }
                    }

                    envioLN.Registrar(usuarioActual, tipoDestino, idArea, destinatarios, guias.Select(g => g.IdGuia));
                    new AuditoriaLN().Registrar(usuarioActual.IdUsuario,
                        $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                        tipoDestino == GuiaEnvio.DestinoCorreo ? "Enviar correo (Guías)" : "Enviar correo masivo (Guías)", "Guías", null,
                        $"{guias.Count} guía(s) a {destinatarios.Count} destinatario(s): {descripcionDestino}");
                });

                MessageBox.Show($"Guías enviadas correctamente a {descripcionDestino} ({destinatarios.Count} destinatario(s)).",
                    "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"No se pudo enviar el correo:\n\n{ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnEnviarCorreo.Enabled = true;
                this.Cursor = Cursors.Default;
            }
        }
    }
}