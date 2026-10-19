using Entidades.Gestion_de_Entidades;
using Logica.Gestion_de_Logica;
using System;
using System.Drawing;
using System.Linq;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace Presentacion
{
    /// <summary>
    /// Opciones para enviar guías por correo (Etapa 3): a un correo, a todos los usuarios
    /// activos o a los usuarios de un área. Formulario construido por código, sin diseñador.
    /// </summary>
    public class FrmEnviarGuias : Form
    {
        private static readonly Regex RegexCorreo = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");

        private readonly RadioButton rbCorreo = new RadioButton();
        private readonly RadioButton rbTodos = new RadioButton();
        private readonly RadioButton rbArea = new RadioButton();
        private readonly TextBox txtCorreo = new TextBox();
        private readonly ComboBox cboArea = new ComboBox();
        private readonly CheckBox chkSoloSeleccionada = new CheckBox();
        private readonly TextBox txtAsunto = new TextBox();
        private readonly TextBox txtMensaje = new TextBox();
        private readonly ErrorProvider errorProvider = new ErrorProvider();

        public string TipoDestino { get; private set; }
        public string Correo => txtCorreo.Text.Trim();
        public int? IdArea => rbArea.Checked && cboArea.SelectedValue is int id && id > 0 ? id : (int?)null;
        public string NombreArea => rbArea.Checked ? cboArea.Text : null;
        public bool SoloSeleccionada => chkSoloSeleccionada.Enabled && chkSoloSeleccionada.Checked;
        public string Asunto => txtAsunto.Text.Trim();
        public string Mensaje => txtMensaje.Text.Trim();

        /// <param name="guiaSeleccionada">Título de la guía seleccionada, o null si no hay.</param>
        /// <param name="totalGuiasListadas">Guías visibles en la lista (las que se envían si no se elige solo una).</param>
        public FrmEnviarGuias(string guiaSeleccionada, int totalGuiasListadas)
        {
            Text = "Enviar guías por correo";
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(560, 520);
            Font = new Font("Segoe UI", 10.5F);
            BackColor = Color.White;

            int x = 20, y = 16;

            Controls.Add(Titulo("¿A quién?", x, y)); y += 32;

            Configurar(rbCorreo, "A un correo", x, y); y += 30;
            txtCorreo.Location = new Point(x + 24, y); txtCorreo.Width = 500; y += 38;

            Configurar(rbTodos, "A todos los usuarios activos (copia oculta)", x, y); y += 32;

            Configurar(rbArea, "A los usuarios de un área", x, y); y += 30;
            cboArea.Location = new Point(x + 24, y); cboArea.Width = 300;
            cboArea.DropDownStyle = ComboBoxStyle.DropDownList; y += 44;

            Controls.Add(Titulo("¿Qué guías?", x, y)); y += 30;
            chkSoloSeleccionada.Location = new Point(x, y);
            chkSoloSeleccionada.AutoSize = true;
            if (string.IsNullOrWhiteSpace(guiaSeleccionada))
            {
                chkSoloSeleccionada.Text = $"Las {totalGuiasListadas} guía(s) de la lista";
                chkSoloSeleccionada.Enabled = false;
            }
            else
            {
                chkSoloSeleccionada.Text = $"Solo \"{Recortar(guiaSeleccionada, 45)}\" (si no, las {totalGuiasListadas} de la lista)";
                chkSoloSeleccionada.Checked = true;
            }
            y += 40;

            Controls.Add(Titulo("Asunto", x, y)); y += 26;
            txtAsunto.Location = new Point(x, y); txtAsunto.Width = 520;
            txtAsunto.Text = "Guías de Ayuda - Sistema de Incidencias APPB"; y += 38;

            Controls.Add(Titulo("Mensaje (opcional)", x, y)); y += 26;
            txtMensaje.Location = new Point(x, y); txtMensaje.Size = new Size(520, 70);
            txtMensaje.Multiline = true; txtMensaje.ScrollBars = ScrollBars.Vertical; y += 84;

            var btnEnviar = Boton("📧 Enviar", TemaModerno.ColorSecundario, Color.White, new Point(300, y));
            var btnCancelar = Boton("Cancelar", Color.FromArgb(240, 242, 245), Color.FromArgb(70, 80, 95), new Point(430, y));
            btnCancelar.Width = 110;
            btnEnviar.Click += (s, e) => Confirmar();
            btnCancelar.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            AcceptButton = btnEnviar;
            CancelButton = btnCancelar;

            Controls.AddRange(new Control[] { rbCorreo, txtCorreo, rbTodos, rbArea, cboArea, chkSoloSeleccionada, txtAsunto, txtMensaje, btnEnviar, btnCancelar });

            CargarAreas();
            rbCorreo.CheckedChanged += (s, e) => ActualizarHabilitados();
            rbArea.CheckedChanged += (s, e) => ActualizarHabilitados();
            rbTodos.CheckedChanged += (s, e) => ActualizarHabilitados();
            rbCorreo.Checked = true;
            ActualizarHabilitados();
        }

        private static string Recortar(string texto, int max) => texto.Length <= max ? texto : texto.Substring(0, max - 1) + "…";

        private static Label Titulo(string texto, int x, int y) => new Label
        {
            Text = texto,
            AutoSize = true,
            Location = new Point(x, y),
            Font = new Font("Segoe UI", 10.5F, FontStyle.Bold),
            ForeColor = TemaModerno.ColorPrimario
        };

        private static void Configurar(RadioButton rb, string texto, int x, int y)
        {
            rb.Text = texto;
            rb.AutoSize = true;
            rb.Location = new Point(x, y);
        }

        private static Button Boton(string texto, Color fondo, Color letra, Point ubicacion)
        {
            var b = new Button
            {
                Text = texto,
                Location = ubicacion,
                Size = new Size(120, 40),
                FlatStyle = FlatStyle.Flat,
                BackColor = fondo,
                ForeColor = letra,
                Font = new Font("Segoe UI", 10.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            b.FlatAppearance.BorderSize = 0;
            return b;
        }

        private void CargarAreas()
        {
            try
            {
                var areas = new AreaLN().ShowArea();
                cboArea.DisplayMember = "NombreArea";
                cboArea.ValueMember = "IdArea";
                cboArea.DataSource = areas;
                if (areas.Count == 0) rbArea.Enabled = false;
            }
            catch (Exception ex)
            {
                rbArea.Enabled = false;
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void ActualizarHabilitados()
        {
            txtCorreo.Enabled = rbCorreo.Checked;
            cboArea.Enabled = rbArea.Checked;
            errorProvider.Clear();
        }

        private void Confirmar()
        {
            errorProvider.Clear();

            if (rbCorreo.Checked)
            {
                if (!RegexCorreo.IsMatch(Correo))
                {
                    errorProvider.SetError(txtCorreo, "Ingresa un correo válido.");
                    return;
                }
                TipoDestino = GuiaEnvio.DestinoCorreo;
            }
            else if (rbArea.Checked)
            {
                if (!IdArea.HasValue)
                {
                    errorProvider.SetError(cboArea, "Selecciona un área.");
                    return;
                }
                TipoDestino = GuiaEnvio.DestinoArea;
            }
            else
            {
                TipoDestino = GuiaEnvio.DestinoTodos;
            }

            if (string.IsNullOrWhiteSpace(Asunto))
            {
                errorProvider.SetError(txtAsunto, "El asunto es obligatorio.");
                return;
            }

            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
