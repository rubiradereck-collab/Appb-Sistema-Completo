using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace Presentacion.Formularios.Compartido
{
    public partial class FrmEnviarCorreo : Form
    {
        // ---------- Resultado para quien abre el formulario ----------
        public string CorreoDestino { get { return EnviarATodos ? "" : txtCorreo.Text.Trim(); } }
        public string Asunto { get { return txtAsunto.Text.Trim(); } }
        public string Mensaje { get { return txtMensaje.Text; } }
        // OJO: no usar .Visible aquí; un control devuelve Visible=false cuando el formulario está cerrado
        public bool AdjuntarExcel { get { return _mostrarExcel && chkAdjuntarExcel.Checked; } }
        public bool EnviarATodos { get { return _mostrarTodos && chkTodos.Checked; } }
        public bool ConfirmaEnvio { get; private set; } = false;

        // ---------- Colores ----------
        private static readonly Color ColorAzul = Color.FromArgb(21, 101, 192);
        private static readonly Color ColorAzulHover = Color.FromArgb(30, 120, 220);
        private static readonly Color ColorBorde = Color.FromArgb(205, 212, 222);
        private static readonly Color ColorBordeOpciones = Color.FromArgb(210, 225, 245);
        private static readonly Color ColorError = Color.FromArgb(220, 53, 69);
        private static readonly Color ColorDeshabilitado = Color.FromArgb(243, 244, 246);

        private readonly bool _mostrarExcel;
        private readonly bool _mostrarTodos;
        private string _correoAnterior = "";
        private bool _errorCorreo = false;

        // mostrarOpcionTodos = true solo desde Guías (envío masivo en copia oculta)
        public FrmEnviarCorreo(string correoDefault, string asuntoDefault, bool mostrarOpcionExcel, bool mostrarOpcionTodos = false)
        {
            InitializeComponent();

            _mostrarExcel = mostrarOpcionExcel;
            _mostrarTodos = mostrarOpcionTodos;

            txtCorreo.Text = correoDefault ?? "";
            txtAsunto.Text = asuntoDefault ?? "";

            ConfigurarCampo(pnlCorreo, txtCorreo, () => _errorCorreo);
            ConfigurarCampo(pnlAsunto, txtAsunto, () => false);
            ConfigurarCampo(pnlMensaje, txtMensaje, () => false);

            ConfigurarBoton(btnEnviar, ColorAzul, ColorAzulHover, Color.White, ColorAzul);
            ConfigurarBoton(btnCancelar, Color.White, Color.FromArgb(240, 242, 245), Color.FromArgb(70, 80, 95), ColorBorde);

            pnlOpciones.Paint += (s, e) => DibujarBordeRedondeado(e.Graphics, pnlOpciones, ColorBordeOpciones, pnlOpciones.BackColor);

            chkTodos.CheckedChanged += ChkTodos_CheckedChanged;
            txtCorreo.TextChanged += (s, e) => { if (_errorCorreo) MostrarErrorCorreo(null); };

            AcomodarControles();

            this.Shown += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(txtCorreo.Text)) txtCorreo.Focus();
                else txtMensaje.Focus();
            };
        }

        // ================== DISEÑO ==================

        // Coordenadas en unidades de diseño (96 ppp); WinForms las escala solo en pantallas con zoom
        private void AcomodarControles()
        {
            int y = 352; // debajo del mensaje

            if (_mostrarExcel || _mostrarTodos)
            {
                int yInterno = 12;

                chkAdjuntarExcel.Visible = _mostrarExcel;
                if (_mostrarExcel)
                {
                    chkAdjuntarExcel.Location = new Point(14, yInterno);
                    yInterno += 28;
                }

                chkTodos.Visible = _mostrarTodos;
                lblTodosInfo.Visible = _mostrarTodos;
                if (_mostrarTodos)
                {
                    chkTodos.Location = new Point(14, yInterno);
                    lblTodosInfo.Location = new Point(32, yInterno + 23);
                    yInterno += 48;
                }

                pnlOpciones.Visible = true;
                pnlOpciones.Location = new Point(24, y);
                pnlOpciones.Height = yInterno + 6;
                y += pnlOpciones.Height + 16;
            }
            else
            {
                pnlOpciones.Visible = false;
            }

            this.ClientSize = new Size(500, y + pnlFooter.Height);
        }

        // Campo de texto con borde redondeado: azul al enfocar, rojo si hay error
        private void ConfigurarCampo(Panel contenedor, TextBox txt, Func<bool> tieneError)
        {
            contenedor.Paint += (s, e) =>
            {
                Color borde = tieneError() ? ColorError : (txt.Focused ? ColorAzul : ColorBorde);
                DibujarBordeRedondeado(e.Graphics, contenedor, borde, contenedor.BackColor);
            };
            txt.Enter += (s, e) => contenedor.Invalidate();
            txt.Leave += (s, e) => contenedor.Invalidate();
            contenedor.Click += (s, e) => txt.Focus();
            contenedor.Resize += (s, e) => contenedor.Invalidate();
        }

        private static void DibujarBordeRedondeado(Graphics g, Control ctrl, Color borde, Color fondo)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(ctrl.Parent != null ? ctrl.Parent.BackColor : Color.White);

            Rectangle r = new Rectangle(0, 0, ctrl.Width - 1, ctrl.Height - 1);
            using (GraphicsPath path = RectanguloRedondeado(r, 8))
            using (SolidBrush brush = new SolidBrush(fondo))
            using (Pen pen = new Pen(borde, 1.5f))
            {
                g.FillPath(brush, path);
                g.DrawPath(pen, path);
            }
        }

        private static GraphicsPath RectanguloRedondeado(Rectangle r, int radio)
        {
            int d = radio * 2;
            var path = new GraphicsPath();
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        // Botón redondeado dibujado a mano (sin bordes serruchados)
        private void ConfigurarBoton(Button btn, Color fondo, Color fondoHover, Color texto, Color borde)
        {
            bool hover = false;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.UseVisualStyleBackColor = false;
            btn.BackColor = btn.Parent != null ? btn.Parent.BackColor : Color.White;
            btn.FlatAppearance.MouseOverBackColor = btn.BackColor;
            btn.FlatAppearance.MouseDownBackColor = btn.BackColor;

            btn.MouseEnter += (s, e) => { hover = true; btn.Invalidate(); };
            btn.MouseLeave += (s, e) => { hover = false; btn.Invalidate(); };

            btn.Paint += (s, e) =>
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(btn.Parent != null ? btn.Parent.BackColor : Color.White);

                Color colorFondo = !btn.Enabled ? Color.FromArgb(180, 190, 200) : (hover ? fondoHover : fondo);
                Rectangle r = new Rectangle(0, 0, btn.Width - 1, btn.Height - 1);
                using (GraphicsPath path = RectanguloRedondeado(r, 8))
                using (SolidBrush brush = new SolidBrush(colorFondo))
                using (Pen pen = new Pen(borde, 1f))
                {
                    g.FillPath(brush, path);
                    g.DrawPath(pen, path);
                }
                TextRenderer.DrawText(g, btn.Text, btn.Font, btn.ClientRectangle, texto,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            };
        }

        // ================== EVENTOS ==================

        private void ChkTodos_CheckedChanged(object sender, EventArgs e)
        {
            if (chkTodos.Checked)
            {
                _correoAnterior = txtCorreo.Text;
                txtCorreo.Text = "Todos los usuarios activos";
                txtCorreo.Enabled = false;
                pnlCorreo.BackColor = ColorDeshabilitado;
                txtCorreo.BackColor = ColorDeshabilitado;
                MostrarErrorCorreo(null);
            }
            else
            {
                txtCorreo.Text = _correoAnterior;
                txtCorreo.Enabled = true;
                pnlCorreo.BackColor = Color.White;
                txtCorreo.BackColor = Color.White;
            }
            pnlCorreo.Invalidate();
        }

        private void MostrarErrorCorreo(string mensaje)
        {
            _errorCorreo = mensaje != null;
            lblErrorCorreo.Text = mensaje ?? "";
            lblErrorCorreo.Visible = _errorCorreo;
            pnlCorreo.Invalidate();
        }

        private static bool CorreoValido(string correo)
        {
            if (string.IsNullOrWhiteSpace(correo)) return false;
            try
            {
                var addr = new System.Net.Mail.MailAddress(correo);
                return addr.Address == correo && correo.Contains(".");
            }
            catch
            {
                return false;
            }
        }

        private void btnEnviar_Click(object sender, EventArgs e)
        {
            if (!EnviarATodos)
            {
                string correo = txtCorreo.Text.Trim();
                if (string.IsNullOrWhiteSpace(correo))
                {
                    MostrarErrorCorreo("Ingrese el correo del destinatario");
                    txtCorreo.Focus();
                    return;
                }
                if (!CorreoValido(correo))
                {
                    MostrarErrorCorreo("El correo no tiene un formato válido");
                    txtCorreo.Focus();
                    return;
                }
            }

            if (string.IsNullOrWhiteSpace(txtAsunto.Text))
            {
                MessageBox.Show("Ingrese el asunto del correo.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                txtAsunto.Focus();
                return;
            }

            ConfirmaEnvio = true;
            this.DialogResult = DialogResult.OK;
            this.Close();
        }

        private void btnCancelar_Click(object sender, EventArgs e)
        {
            ConfirmaEnvio = false;
            this.Close();
        }
    }
}