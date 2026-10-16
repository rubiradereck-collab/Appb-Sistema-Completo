using Entidades.Gestion_de_Entidades;
using Logica.Gestion_de_Logica;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;

namespace Presentacion
{
    /// <summary>
    /// Catálogo de tipos de incidencia (Etapa 2). Se abre desde Áreas (solo administradores).
    /// Formulario construido por código, sin diseñador.
    /// </summary>
    public class FrmTiposIncidencia : Form
    {
        private readonly TipoIncidenciaLN tipoLN = new TipoIncidenciaLN();
        private readonly AuditoriaLN auditoriaLN = new AuditoriaLN();
        private readonly Usuario usuarioActual;
        private TipoIncidencia seleccionado;

        private readonly DataGridView grid = new DataGridView();
        private readonly TextBox txtNombre = new TextBox();
        private readonly CheckBox chkActivo = new CheckBox();
        private readonly Button btnNuevo = new Button();
        private readonly Button btnGuardar = new Button();
        private readonly Button btnEliminar = new Button();
        private readonly ErrorProvider errorProvider = new ErrorProvider();

        public FrmTiposIncidencia(Usuario usuarioActual)
        {
            this.usuarioActual = usuarioActual;
            ConstruirInterfaz();
            TemaModerno.Aplicar(this);
            CargarGrid();
            Limpiar();
        }

        private void ConstruirInterfaz()
        {
            Text = "Tipos de incidencia";
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(760, 470);
            Font = new Font("Segoe UI", 11F);
            KeyPreview = true;
            KeyDown += (s, e) => { if (e.KeyCode == Keys.Escape) Close(); };

            grid.Location = new Point(16, 16);
            grid.Size = new Size(440, 438);
            grid.ReadOnly = true;
            grid.AllowUserToAddRows = false;
            grid.AllowUserToDeleteRows = false;
            grid.MultiSelect = false;
            grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            grid.RowHeadersVisible = false;
            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            grid.BackgroundColor = Color.White;
            grid.SelectionChanged += Grid_SelectionChanged;

            var lblNombre = new Label { Text = "Nombre del tipo", Location = new Point(476, 16), AutoSize = true };
            txtNombre.Location = new Point(476, 44);
            txtNombre.Size = new Size(268, 32);
            txtNombre.MaxLength = 100;

            chkActivo.Text = "Activo (se ofrece al reportar)";
            chkActivo.Location = new Point(476, 86);
            chkActivo.AutoSize = true;

            ConfigurarBoton(btnNuevo, "➕ Nuevo", new Point(476, 140), TemaModerno.ColorSecundario, (s, e) => Limpiar());
            ConfigurarBoton(btnGuardar, "💾 Guardar", new Point(476, 200), TemaModerno.ColorExito, (s, e) => Guardar());
            ConfigurarBoton(btnEliminar, "🗑️ Eliminar", new Point(476, 260), TemaModerno.ColorPeligro, (s, e) => Eliminar());

            var lblAyuda = new Label
            {
                Text = "Un tipo que ya tiene tickets no se borra: se desactiva, " +
                       "así los reportes anteriores conservan su tipo.",
                Location = new Point(476, 330),
                Size = new Size(268, 90),
                ForeColor = Color.DimGray,
                Font = new Font("Segoe UI", 9.5F)
            };

            Controls.AddRange(new Control[] { grid, lblNombre, txtNombre, chkActivo, btnNuevo, btnGuardar, btnEliminar, lblAyuda });
        }

        private static void ConfigurarBoton(Button boton, string texto, Point ubicacion, Color color, EventHandler click)
        {
            boton.Text = texto;
            boton.Location = ubicacion;
            boton.Size = new Size(268, 50);
            boton.FlatStyle = FlatStyle.Flat;
            boton.FlatAppearance.BorderSize = 0;
            boton.BackColor = color;
            boton.ForeColor = Color.White;
            boton.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold);
            boton.Cursor = Cursors.Hand;
            boton.Click += click;
        }

        private void CargarGrid()
        {
            try
            {
                List<TipoIncidencia> tipos = tipoLN.ShowTipos();
                grid.DataSource = null;
                grid.DataSource = tipos;

                if (grid.Columns["IdTipoIncidencia"] != null) grid.Columns["IdTipoIncidencia"].Visible = false;
                if (grid.Columns["Nombre"] != null) grid.Columns["Nombre"].HeaderText = "Tipo";
                if (grid.Columns["Activo"] != null) { grid.Columns["Activo"].HeaderText = "Activo"; grid.Columns["Activo"].FillWeight = 40; }
                if (grid.Columns["TotalIncidencias"] != null) { grid.Columns["TotalIncidencias"].HeaderText = "Tickets"; grid.Columns["TotalIncidencias"].FillWeight = 40; }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void Grid_SelectionChanged(object sender, EventArgs e)
        {
            seleccionado = grid.CurrentRow?.DataBoundItem as TipoIncidencia;
            if (seleccionado == null) return;
            txtNombre.Text = seleccionado.Nombre;
            chkActivo.Checked = seleccionado.Activo;
        }

        private void Limpiar()
        {
            grid.ClearSelection();
            grid.CurrentCell = null;
            seleccionado = null;
            txtNombre.Clear();
            chkActivo.Checked = true;
            errorProvider.Clear();
            txtNombre.Focus();
        }

        private string NombreActor => $"{usuarioActual.Nombre} {usuarioActual.Apellido}";

        private void Guardar()
        {
            errorProvider.Clear();
            if (string.IsNullOrWhiteSpace(txtNombre.Text))
            {
                errorProvider.SetError(txtNombre, "Este campo es obligatorio.");
                return;
            }

            try
            {
                if (seleccionado == null)
                {
                    var nuevo = new TipoIncidencia { Nombre = txtNombre.Text, Activo = chkActivo.Checked };
                    int id = tipoLN.InsertTipo(nuevo);
                    auditoriaLN.Registrar(usuarioActual.IdUsuario, NombreActor, "Crear", "TipoIncidencia", id, $"Tipo: {nuevo.Nombre}");
                }
                else
                {
                    string nombreAnterior = seleccionado.Nombre;
                    bool activoAnterior = seleccionado.Activo;
                    var cambio = new TipoIncidencia(seleccionado.IdTipoIncidencia, txtNombre.Text, chkActivo.Checked);
                    tipoLN.UpdateTipo(cambio);
                    auditoriaLN.Registrar(usuarioActual.IdUsuario, NombreActor, "Modificar", "TipoIncidencia", cambio.IdTipoIncidencia,
                        $"Tipo: {nombreAnterior} → {cambio.Nombre} | Activo: {(activoAnterior ? "Sí" : "No")} → {(cambio.Activo ? "Sí" : "No")}");
                }

                CargarGrid();
                Limpiar();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void Eliminar()
        {
            if (seleccionado == null)
            {
                MessageBox.Show("Selecciona un tipo primero.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (MessageBox.Show($"¿Eliminar el tipo \"{seleccionado.Nombre}\"?", "Confirmar",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            try
            {
                bool eliminado = tipoLN.DeleteTipo(seleccionado);
                auditoriaLN.Registrar(usuarioActual.IdUsuario, NombreActor, eliminado ? "Eliminar" : "Desactivar",
                    "TipoIncidencia", seleccionado.IdTipoIncidencia, $"Tipo: {seleccionado.Nombre}");

                if (!eliminado)
                    MessageBox.Show($"\"{seleccionado.Nombre}\" ya tiene tickets, así que se desactivó en lugar de borrarse.",
                        "Tipo desactivado", MessageBoxButtons.OK, MessageBoxIcon.Information);

                CargarGrid();
                Limpiar();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
