using Presentacion.Formularios.Compartido;
﻿using Entidades.Gestion_de_Entidades;
using Logica.Gestion_de_Logica;
using Reportes;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Net.Http;

namespace Presentacion
{
    public partial class FrmIncidencias : Form
    {
        private bool modoNuevaIncidencia = false;
        private readonly AuditoriaLN auditoriaLN = new AuditoriaLN();
        private readonly IncidenciaLN incidenciaLN = new IncidenciaLN();
        private readonly AreaLN areaLN = new AreaLN();
        private readonly PrioridadLN prioridadLN = new PrioridadLN();
        private readonly EstadoLN estadoLN = new EstadoLN();
        private readonly UsuarioLN usuarioLN = new UsuarioLN();
        private readonly TipoIncidenciaLN tipoIncidenciaLN = new TipoIncidenciaLN();
        private List<TipoIncidencia> tiposTodos = new List<TipoIncidencia>();
        private readonly Usuario usuarioActual;
        private readonly System.Windows.Forms.Timer tmrRefresco = new System.Windows.Forms.Timer { Interval = 15000 };
        private List<Incidencia> listaIncidencias;
        private List<Incidencia> listaIncidenciasCompleta;
        private Incidencia incidenciaSeleccionada;
        private FiltroIncidencias filtroActual = new FiltroIncidencias();
        private string ticketBusquedaActual = string.Empty;
        private bool ordenAscendente = true;
        private string columnaOrdenada = null;

        
        
        
        

        public FrmIncidencias(Usuario usuarioActual)
        {
            InitializeComponent();
            TemaModerno.Aplicar(this);
            toolTip1.SetToolTip(btnNuevo, "Limpiar el formulario para crear una nueva incidencia");
            toolTip1.SetToolTip(btnGuardar, "Guardar los cambios de la incidencia");
            // Etapa 4: "Eliminar" anula la incidencia; el borrado definitivo se pide aparte
            btnEliminar.Text = "🚫 Anular";
            toolTip1.SetToolTip(btnEliminar, "Anular la incidencia seleccionada (queda en el historial). Solo administradores.");
            toolTip1.SetToolTip(btnExportarPdf, "Exportar el listado actual a PDF");
            toolTip1.SetToolTip(btnExportarExcel, "Exportar el listado actual a Excel");
            toolTip1.SetToolTip(btnFiltros, "Filtrar por estado o rango de fechas");
            toolTip1.SetToolTip(txtBusquedaRapida, "Buscar por número de ticket");
            this.usuarioActual = usuarioActual;
            
            grid.SelectionChanged += grid_SelectionChanged;
            txtBusquedaRapida.TextChanged += txtBusquedaRapida_TextChanged;
            grid.ColumnHeaderMouseClick += grid_ColumnHeaderMouseClick;  
            CargarCombos();
            AplicarRestriccionesPorRol();
            CargarGrid();
            LimpiarFormulario();
            tmrRefresco.Tick += (s, e) => { if (incidenciaSeleccionada == null && !modoNuevaIncidencia) CargarGrid(); };
            tmrRefresco.Start();
            this.FormClosed += (s, e) => tmrRefresco.Stop();
        }
        private void txtBusquedaRapida_TextChanged(object sender, EventArgs e)
        {
            ticketBusquedaActual = txtBusquedaRapida.Text.Trim();
            AplicarFiltro();
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

            AplicarFiltro();
        }
        private bool ValidarCampos()
        {
            errorProvider1.Clear();
            bool esValido = true;

            if (string.IsNullOrWhiteSpace(txtEmpleado.Text))
            {
                errorProvider1.SetError(txtEmpleado, "Este campo es obligatorio.");
                esValido = false;
            }

            if (cboTipo.SelectedValue == null)
            {
                errorProvider1.SetError(cboTipo, "Selecciona el tipo de incidencia.");
                esValido = false;
            }

            if (string.IsNullOrWhiteSpace(txtDescripcion.Text))
            {
                errorProvider1.SetError(txtDescripcion, "Este campo es obligatorio.");
                esValido = false;
            }

            return esValido;
        }
        private void AplicarRestriccionesPorRol()
        {
            if (usuarioActual.Rol == "Usuario")
            {
                // Un usuario solo reporta a su propio nombre
                txtEmpleado.ReadOnly = true;
                cboEstado.Enabled = false;
                cboTecnico.Enabled = false;
                DeshabilitarBoton(btnEliminar);
                btnCorreo.Visible = false;
            }
            else if (usuarioActual.Rol == "Técnico")
            {
                cboTecnico.Enabled = false;
                DeshabilitarBoton(btnEliminar);
            }
        }

        private void DeshabilitarBoton(Button boton)
        {
            boton.Enabled = false;
            boton.BackColor = Color.FromArgb(180, 180, 180);
            boton.ForeColor = Color.FromArgb(230, 230, 230);
        }

        private void CargarCombos()
        {
            cboArea.DataSource = areaLN.ShowArea();
            cboArea.DisplayMember = "NombreArea";
            cboArea.ValueMember = "IdArea";

            cboPrioridad.DataSource = prioridadLN.ShowPrioridad();
            cboPrioridad.DisplayMember = "Nombre";
            cboPrioridad.ValueMember = "IdPrioridad";

            tiposTodos = tipoIncidenciaLN.ShowTipos();
            CargarTipos(null);

            cboEstado.DataSource = estadoLN.ShowEstado();
            cboEstado.DisplayMember = "Nombre";
            cboEstado.ValueMember = "IdEstado";

            var tecnicos = usuarioLN.ShowUsuario()
                .Where(u => u.Rol == "Técnico" && u.Estado)
                .ToList();
            tecnicos.Insert(0, new Usuario { IdUsuario = 0, Nombre = "(Sin asignar)", Apellido = "" });

            cboTecnico.DataSource = tecnicos;
            cboTecnico.DisplayMember = "Nombre";
            cboTecnico.ValueMember = "IdUsuario";
        }

        /// <summary>
        /// Llena el combo de tipos con los activos. Si el ticket abierto tiene un tipo que ya
        /// se desactivó, se agrega también para no perderlo al guardar.
        /// </summary>
        private void CargarTipos(int? idTipoDelTicket)
        {
            var tipos = tiposTodos
                .Where(t => t.Activo || (idTipoDelTicket.HasValue && t.IdTipoIncidencia == idTipoDelTicket.Value))
                .ToList();

            cboTipo.DataSource = null;
            cboTipo.DisplayMember = "Nombre";
            cboTipo.ValueMember = "IdTipoIncidencia";
            cboTipo.DataSource = tipos;
        }

        private void CargarGrid()
        {
            try
            {
                listaIncidenciasCompleta = incidenciaLN.ShowIncidencia();

                if (usuarioActual.Rol == "Usuario")
                {
                    listaIncidenciasCompleta = listaIncidenciasCompleta
                        .Where(i => IncidenciaLN.EsDelUsuario(i, usuarioActual))
                        .ToList();
                }

                AplicarFiltro();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void AplicarFiltro()
        {
            try
            {
                listaIncidencias = IncidenciaReportes.Filtrar(listaIncidenciasCompleta, filtroActual);

                if (!string.IsNullOrWhiteSpace(ticketBusquedaActual))
                {
                    listaIncidencias = listaIncidencias
                        .Where(i => i.NumeroTicket != null &&
                                    i.NumeroTicket.IndexOf(ticketBusquedaActual, StringComparison.OrdinalIgnoreCase) >= 0)
                        .ToList();
                }

                if (columnaOrdenada != null)
                {
                    var propInfo = typeof(Incidencia).GetProperty(columnaOrdenada);
                    if (propInfo != null)
                    {
                        listaIncidencias = ordenAscendente
                            ? listaIncidencias.OrderBy(i => propInfo.GetValue(i)).ToList()
                            : listaIncidencias.OrderByDescending(i => propInfo.GetValue(i)).ToList();
                    }
                }

                grid.DataSource = null;
                grid.DataSource = listaIncidencias;
                AplicarFormatoColumnas();
                lblSinDatos.Text = listaIncidencias.Count == 0 ? "No hay incidencias registradas." : "";
                lblSinDatos.Visible = listaIncidencias.Count == 0;
                lblSinDatos.BringToFront();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void AplicarFormatoColumnas()
        {
            foreach (string columna in new[] { "IdIncidencia", "IdArea", "IdPrioridad", "IdEstado", "IdTecnicoAsignado", "Descripcion", "Observaciones", "FilaVersion", "IdTipoIncidencia", "IdUsuarioReporta", "FechaCalificacion" })
            {
                if (grid.Columns[columna] != null) grid.Columns[columna].Visible = false;
            }

            // Orden, título y ancho relativo de cada columna visible
            var columnas = new[]
            {
                new { Nombre = "NumeroTicket",          Titulo = "Ticket",        Peso = 120f },
                new { Nombre = "Fecha",                 Titulo = "Fecha",         Peso = 105f },
                new { Nombre = "Empleado",              Titulo = "Empleado",      Peso = 130f },
                new { Nombre = "NombreArea",            Titulo = "Área",          Peso = 110f },
                new { Nombre = "TipoIncidencia",        Titulo = "Tipo",          Peso = 90f },
                new { Nombre = "NombrePrioridad",       Titulo = "Prioridad",     Peso = 85f },
                new { Nombre = "NombreEstado",          Titulo = "Estado",        Peso = 90f },
                new { Nombre = "TecnicoAsignado",       Titulo = "Técnico",       Peso = 115f },
                new { Nombre = "FechaAsignacion",       Titulo = "Asignada",      Peso = 105f },
                new { Nombre = "FechaPrimeraRespuesta", Titulo = "1.ª respuesta", Peso = 105f },
                new { Nombre = "FechaSolucion",         Titulo = "Solución",      Peso = 105f },
                new { Nombre = "Calificacion",          Titulo = "Calif.",        Peso = 60f },
            };

            Font fuenteTitulo = grid.ColumnHeadersDefaultCellStyle.Font ?? grid.Font;
            int orden = 0;
            foreach (var c in columnas)
            {
                DataGridViewColumn col = grid.Columns[c.Nombre];
                if (col == null) continue;

                col.HeaderText = c.Titulo;
                col.FillWeight = c.Peso;
                col.DisplayIndex = orden++;

                // Que el título nunca se corte: ancho mínimo = la palabra más larga del título
                int anchoTitulo = 0;
                foreach (string palabra in c.Titulo.Split(' '))
                    anchoTitulo = Math.Max(anchoTitulo, TextRenderer.MeasureText(palabra, fuenteTitulo).Width);
                col.MinimumWidth = anchoTitulo + 24;

                if (col.ValueType == typeof(DateTime) || col.ValueType == typeof(DateTime?))
                    col.DefaultCellStyle.Format = "dd/MM/yy HH:mm";
            }

            if (grid.Columns["Calificacion"] != null)
                grid.Columns["Calificacion"].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter;

            // Títulos de dos palabras ("1.ª respuesta") pasan a dos líneas en vez de cortarse
            grid.ColumnHeadersDefaultCellStyle.WrapMode = DataGridViewTriState.True;
            grid.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
        }

        private void grid_SelectionChanged(object sender, EventArgs e)
        {
            modoNuevaIncidencia = false;
            if (grid.CurrentRow == null) return;
            incidenciaSeleccionada = grid.CurrentRow.DataBoundItem as Incidencia;
            if (incidenciaSeleccionada == null) return;

            txtEmpleado.Text = incidenciaSeleccionada.Empleado;
            CargarTipos(incidenciaSeleccionada.IdTipoIncidencia);
            if (incidenciaSeleccionada.IdTipoIncidencia.HasValue)
                cboTipo.SelectedValue = incidenciaSeleccionada.IdTipoIncidencia.Value;
            else
                cboTipo.SelectedIndex = -1; // texto antiguo que no está en el catálogo: hay que elegir uno
            txtDescripcion.Text = incidenciaSeleccionada.Descripcion;
            txtObservaciones.Text = incidenciaSeleccionada.Observaciones;

            cboArea.SelectedValue = incidenciaSeleccionada.IdArea;
            cboPrioridad.SelectedValue = incidenciaSeleccionada.IdPrioridad;
            cboEstado.SelectedValue = incidenciaSeleccionada.IdEstado;
            cboTecnico.SelectedValue = incidenciaSeleccionada.IdTecnicoAsignado ?? 0;
        }
        private void panelFormulario_Paint(object sender, PaintEventArgs e)
        {

        }

        private void btnNuevo_Click(object sender, EventArgs e)
        {
            LimpiarFormulario();
            modoNuevaIncidencia = true;

        }

        private void LimpiarFormulario()
        {
            grid.CurrentCell = null;
            grid.ClearSelection();

            incidenciaSeleccionada = null;
            txtEmpleado.Clear();
            if (usuarioActual.Rol == "Usuario") txtEmpleado.Text = $"{usuarioActual.Nombre} {usuarioActual.Apellido}";
            CargarTipos(null);
            if (cboTipo.Items.Count > 0) cboTipo.SelectedIndex = 0;
            txtDescripcion.Clear();
            txtObservaciones.Clear();
            if (cboArea.Items.Count > 0) cboArea.SelectedIndex = 0;
            if (cboPrioridad.Items.Count > 0) cboPrioridad.SelectedIndex = 0;
            if (cboEstado.Items.Count > 0) cboEstado.SelectedIndex = 0;
            if (cboTecnico.Items.Count > 0) cboTecnico.SelectedIndex = 0;
            txtEmpleado.Focus();
        }

                private async Task NotificarA_NodeAPI(string tipoEvento, Incidencia inc, string nuevoEstado)
        {
            try
            {
                string apiUrl = System.Configuration.ConfigurationManager.AppSettings["NodeApiUrl"];
                string apiKey = System.Configuration.ConfigurationManager.AppSettings["InternalApiKey"];
                
                if (string.IsNullOrEmpty(apiUrl) || string.IsNullOrEmpty(apiKey))
                {
                    Console.WriteLine("NodeApiUrl o InternalApiKey no configurado. Se omite notificación.");
                    return;
                }
                
                using (var client = new System.Net.Http.HttpClient())
                {
                    client.DefaultRequestHeaders.Add("x-internal-key", apiKey);
                    
                    var payload = new {
                        tipoEvento = tipoEvento,
                        idIncidencia = inc.IdIncidencia,
                        idTecnicoAsignado = inc.IdTecnicoAsignado,
                        nuevoEstado = nuevoEstado,
                        empleado = inc.Empleado ?? "",
                        tipoIncidencia = inc.TipoIncidencia ?? "",
                        descripcion = inc.Descripcion ?? "",
                        idActor = usuarioActual.IdUsuario, // para no avisarle de su propio cambio
                        origen = "Escritorio"
                    };
                    
                    string json = System.Text.Json.JsonSerializer.Serialize(payload);
                    var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    var resp = await client.PostAsync($"{apiUrl}/api/interno/notificar", content);
                    if (!resp.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"Error HTTP al notificar: {resp.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al notificar al API Node: {ex.Message}");
            }
        }

        // Etapa 2: avisa por Telegram al asignar un técnico y en cada cambio de estado
        // (la API avisa al técnico asignado y a quien reportó el ticket).
        private async Task EnviarNotificacionesDeCambio(Incidencia incidencia, int? tecnicoAnterior, int estadoAnterior, string nombreEstadoNuevo)
        {
            if (incidencia.IdTecnicoAsignado.HasValue && incidencia.IdTecnicoAsignado != tecnicoAnterior)
                await NotificarA_NodeAPI("asignar", incidencia, nombreEstadoNuevo);

            if (incidencia.IdEstado != estadoAnterior)
                await NotificarA_NodeAPI("estado", incidencia, nombreEstadoNuevo);
        }

        private async Task NotificarNuevaIncidenciaATecnicosAsync(Incidencia incidenciaNueva)
        {
            await NotificarA_NodeAPI("nueva", incidenciaNueva, "");
        }

        private async void btnGuardar_Click(object sender, EventArgs e)
        {
            if (!ValidarCampos()) return;
            btnGuardar.Enabled = false;

            try
            {
                int? idTecnico = (int)cboTecnico.SelectedValue == 0 ? (int?)null : (int)cboTecnico.SelectedValue;
                bool esNueva = incidenciaSeleccionada == null;

                if (esNueva)
                {
                    Incidencia nueva = new Incidencia(
                        0, null, DateTime.Now, txtEmpleado.Text, (int)cboArea.SelectedValue,
                        cboTipo.Text, txtDescripcion.Text, (int)cboPrioridad.SelectedValue,
                        (int)cboEstado.SelectedValue, idTecnico, null, txtObservaciones.Text
                    );
                    nueva.IdTipoIncidencia = (int)cboTipo.SelectedValue;
                    // Quién reporta: el propio usuario, o el usuario cuyo nombre se escribió (si es único)
                    nueva.IdUsuarioReporta = usuarioActual.Rol == "Usuario"
                        ? usuarioActual.IdUsuario
                        : incidenciaLN.BuscarIdUsuarioPorNombre(txtEmpleado.Text);
                    incidenciaLN.InsertIncidencia(nueva, out int idIncidencia);

                    auditoriaLN.Registrar(
                        usuarioActual.IdUsuario,
                        $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                        "Crear",
                        "Incidencia",
                        null,
                        $"Empleado: {txtEmpleado.Text} | Tipo: {cboTipo.Text}"
                    );

                    // NUEVO: Buscar la incidencia recién creada para tener su número de ticket real
                    Incidencia incidenciaCreada = incidenciaLN.ShowIncidencia()
                         .FirstOrDefault(i => i.IdIncidencia == idIncidencia);

                    if (incidenciaCreada != null)
                    {
                        // AQUÍ ESTÁ LA MAGIA ASÍNCRONA
                        _ = NotificarNuevaIncidenciaATecnicosAsync(incidenciaCreada);
                    }
                }
                else
                {
                    string estadoAnterior = incidenciaSeleccionada.NombreEstado;
                    int idEstadoAnterior = incidenciaSeleccionada.IdEstado;
                    int? tecnicoAnterior = incidenciaSeleccionada.IdTecnicoAsignado;

                    incidenciaSeleccionada.Empleado = txtEmpleado.Text;
                    incidenciaSeleccionada.IdArea = (int)cboArea.SelectedValue;
                    incidenciaSeleccionada.TipoIncidencia = cboTipo.Text;
                    incidenciaSeleccionada.IdTipoIncidencia = (int)cboTipo.SelectedValue;
                    incidenciaSeleccionada.Descripcion = txtDescripcion.Text;
                    incidenciaSeleccionada.IdPrioridad = (int)cboPrioridad.SelectedValue;
                    incidenciaSeleccionada.IdEstado = (int)cboEstado.SelectedValue;
                    incidenciaSeleccionada.IdTecnicoAsignado = idTecnico;
                    incidenciaSeleccionada.Observaciones = txtObservaciones.Text;

                    bool actualizado;
                    try
                    {
                        actualizado = incidenciaLN.UpdateIncidencia(incidenciaSeleccionada, usuarioActual);
                    }
                    catch
                    {
                        // La fila del grid quedó con los valores rechazados: se recarga para no mostrarlos
                        CargarGrid();
                        LimpiarFormulario();
                        throw;
                    }

                    if (!actualizado)
                    {
                        MessageBox.Show(
                            "Esta incidencia fue modificada por otra persona mientras la tenías abierta.\n\nSe va a recargar la lista con los datos más recientes.",
                            "Conflicto de edición", MessageBoxButtons.OK, MessageBoxIcon.Warning);

                        CargarGrid();
                        LimpiarFormulario();
                        return;
                    }

                    string nuevoEstado = cboEstado.Text;
                    auditoriaLN.Registrar(
                        usuarioActual.IdUsuario,
                        $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                        "Modificar",
                        "Incidencia",
                        incidenciaSeleccionada.IdIncidencia,
                        $"Ticket: {incidenciaSeleccionada.NumeroTicket} | Estado: {estadoAnterior} → {nuevoEstado}"
                    );
                    _ = EnviarNotificacionesDeCambio(incidenciaSeleccionada, tecnicoAnterior, idEstadoAnterior, nuevoEstado);
                }

                CargarGrid();
                LimpiarFormulario();
                modoNuevaIncidencia = false;
                MessageBox.Show("Guardado correctamente.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnGuardar.Enabled = true;
            }
        }

        private void btnEliminar_Click(object sender, EventArgs e)
        {
            if (incidenciaSeleccionada == null)
            {
                MessageBox.Show("Selecciona una incidencia primero.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            DialogResult opcion = MessageBox.Show(
                $"¿Qué deseas hacer con la incidencia {incidenciaSeleccionada.NumeroTicket}?\n\n" +
                "Sí  →  Anularla (recomendado). Queda en el historial y en los informes con estado Anulado.\n" +
                "No  →  Borrarla definitivamente. Úsalo solo para registros de prueba o duplicados.\n" +
                "Cancelar  →  No hacer nada.",
                "Anular incidencia", MessageBoxButtons.YesNoCancel, MessageBoxIcon.Question, MessageBoxDefaultButton.Button1);

            if (opcion == DialogResult.Cancel) return;

            if (opcion == DialogResult.Yes)
            {
                string motivo = Microsoft.VisualBasic.Interaction.InputBox(
                    "Motivo de la anulación (por ejemplo: duplicado, reportado por error):",
                    "Anular " + incidenciaSeleccionada.NumeroTicket, "");
                if (string.IsNullOrWhiteSpace(motivo)) return;

                try
                {
                    Incidencia anulada = incidenciaSeleccionada;
                    if (!incidenciaLN.AnularIncidencia(anulada, usuarioActual, motivo))
                    {
                        MessageBox.Show("La incidencia ya estaba anulada.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return;
                    }

                    auditoriaLN.Registrar(
                        usuarioActual.IdUsuario,
                        $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                        "Anular",
                        "Incidencia",
                        anulada.IdIncidencia,
                        $"Ticket: {anulada.NumeroTicket} | Motivo: {motivo.Trim()}"
                    );
                    _ = NotificarA_NodeAPI("estado", anulada, "Anulado");

                    CargarGrid();
                    LimpiarFormulario();
                }
                catch (Exception ex)
                {
                    MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                return;
            }

            if (MessageBox.Show(
                    $"La incidencia {incidenciaSeleccionada.NumeroTicket} se borrará de la base de datos y no se podrá recuperar.\n\n¿Continuar?",
                    "Borrar definitivamente", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button2) != DialogResult.Yes)
                return;

            try
            {
                string ticketEliminado = incidenciaSeleccionada.NumeroTicket;
                int idEliminado = incidenciaSeleccionada.IdIncidencia;

                incidenciaLN.DeleteIncidencia(incidenciaSeleccionada);

                auditoriaLN.Registrar(
                    usuarioActual.IdUsuario,
                    $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                    "Eliminar",
                    "Incidencia",
                    idEliminado,
                    $"Ticket eliminado: {ticketEliminado}"
                );

                CargarGrid();
                LimpiarFormulario();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnExportarPdf_Click(object sender, EventArgs e)
        {
            try
            {
                byte[] pdf = IncidenciaReportes.GenerarPdfListado(listaIncidencias);
                GuardarArchivo(pdf, "pdf", "Archivo PDF|*.pdf");
            }
            catch (Exception ex)
            {
                string detalle = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                MessageBox.Show(detalle, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void btnExportarExcel_Click(object sender, EventArgs e)
        {
            try
            {
                byte[] excel = IncidenciaReportes.GenerarExcelListado(listaIncidencias);
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
                dialogo.FileName = $"Incidencias_{DateTime.Now:yyyyMMdd_HHmm}.{extension}";

                if (dialogo.ShowDialog() == DialogResult.OK)
                {
                    File.WriteAllBytes(dialogo.FileName, contenido);
                    MessageBox.Show("Exportado correctamente.", "Éxito", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
        }

        private void FrmIncidencias_Load(object sender, EventArgs e)
        {

        }

        private void grid_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {

        }
        

        private void btnFiltros_Click(object sender, EventArgs e)
        {
            using (FrmFiltroIncidencias dlg = new FrmFiltroIncidencias(estadoLN.ShowEstado(), filtroActual))
            {
                if (dlg.ShowDialog() == DialogResult.OK)
                {
                    filtroActual = dlg.Filtro;
                    AplicarFiltro();
                }
         
            }}

        private void FrmIncidencias_KeyDown(object sender, KeyEventArgs e)
        {

            bool enCampoMultilinea = this.ActiveControl is TextBox tb && tb.Multiline;

            if (e.KeyCode == Keys.Enter && !enCampoMultilinea)
            {
                btnGuardar.PerformClick();
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.Delete && !(this.ActiveControl is TextBox))
            {
                btnEliminar.PerformClick();
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.F5)
            {
                CargarGrid();
                e.Handled = true;
            }
        }
    
        private async void btnCorreo_Click(object sender, EventArgs e)
        {
            var frmOpciones = new Form();
            frmOpciones.Text = "Opciones de Envío";
            frmOpciones.Size = new System.Drawing.Size(350, 150);
            frmOpciones.StartPosition = FormStartPosition.CenterParent;
            frmOpciones.FormBorderStyle = FormBorderStyle.FixedDialog;
            frmOpciones.MaximizeBox = false;
            frmOpciones.MinimizeBox = false;

            var lbl = new Label() { Text = "¿Qué información deseas enviar?", Location = new System.Drawing.Point(20, 20), AutoSize = true };
            var btnListado = new Button() { Text = "Listado Actual", Location = new System.Drawing.Point(20, 60), Size = new System.Drawing.Size(130, 30) };
            var btnDetalle = new Button() { Text = "Incidencia Seleccionada", Location = new System.Drawing.Point(170, 60), Size = new System.Drawing.Size(150, 30) };
            
            if (incidenciaSeleccionada == null) btnDetalle.Enabled = false;

            int opcion = 0; // 1 = Listado, 2 = Detalle
            btnListado.Click += (s, ev) => { opcion = 1; frmOpciones.Close(); };
            btnDetalle.Click += (s, ev) => { opcion = 2; frmOpciones.Close(); };

            frmOpciones.Controls.Add(lbl);
            frmOpciones.Controls.Add(btnListado);
            frmOpciones.Controls.Add(btnDetalle);
            Presentacion.TemaModerno.Aplicar(frmOpciones);
            frmOpciones.ShowDialog();

            if (opcion == 0) return;

            var frmEnvio = new FrmEnviarCorreo(usuarioActual.Correo, opcion == 1 ? "Reporte de Incidencias" : $"Detalle Incidencia {incidenciaSeleccionada.NumeroTicket}", opcion == 1);
            frmEnvio.ShowDialog();

            if (!frmEnvio.ConfirmaEnvio) return;

            btnCorreo.Enabled = false;
            this.Cursor = Cursors.WaitCursor;

            try
            {
                string correoDestino = frmEnvio.CorreoDestino;
                string asunto = frmEnvio.Asunto;
                string mensaje = string.IsNullOrWhiteSpace(frmEnvio.Mensaje) ? "Adjunto encontrará el reporte de incidencias generado desde el Sistema de Incidencias APPB." : frmEnvio.Mensaje;
                bool adjuntarExcel = frmEnvio.AdjuntarExcel;
                var adjuntos = new System.Collections.Generic.List<Tuple<byte[], string>>();

                await Task.Run(() =>
                {
                    if (opcion == 1)
                    {
                        byte[] pdf = IncidenciaReportes.GenerarPdfListado(listaIncidencias);
                        adjuntos.Add(new Tuple<byte[], string>(pdf, "ListadoIncidencias.pdf"));
                        if (adjuntarExcel)
                        {
                            byte[] excel = IncidenciaReportes.GenerarExcelListado(listaIncidencias);
                            adjuntos.Add(new Tuple<byte[], string>(excel, "ListadoIncidencias.xlsx"));
                        }
                    }
                    else
                    {
                        byte[] pdf = IncidenciaReportes.GenerarPdfDetalleIncidencia(incidenciaSeleccionada);
                        adjuntos.Add(new Tuple<byte[], string>(pdf, $"Incidencia_{incidenciaSeleccionada.IdIncidencia}.pdf"));
                    }

                    CorreoService.EnviarCorreoConAdjuntos(correoDestino, asunto, mensaje, adjuntos);
                    
                    /* AuditoriaService.RegistrarAccion */ auditoriaLN.Registrar(
                        usuarioActual.IdUsuario,
                        $"{usuarioActual.Nombre} {usuarioActual.Apellido}",
                        "Enviar correo",
                        "Incidencia",
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
                btnCorreo.Enabled = true;
                this.Cursor = Cursors.Default;
            }
        }

        
    }
}



