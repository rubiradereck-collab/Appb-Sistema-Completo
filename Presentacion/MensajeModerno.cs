using System;
using System.Drawing;
using System.Windows.Forms;

namespace Presentacion
{
    public static class MensajeModerno
    {
        public static DialogResult Mostrar(string mensaje, string titulo = "Mensaje", MessageBoxButtons botones = MessageBoxButtons.OK, MessageBoxIcon icono = MessageBoxIcon.Information)
        {
            Form form = new Form();
            form.Text = titulo;
            form.BackColor = Color.White;
            form.FormBorderStyle = FormBorderStyle.None;
            form.StartPosition = FormStartPosition.CenterParent;
            form.Size = new Size(400, 200);
            form.ShowInTaskbar = false;

            // Panel superior para título
            Panel topPanel = new Panel();
            topPanel.BackColor = TemaModerno.ColorPrimario;
            topPanel.Dock = DockStyle.Top;
            topPanel.Height = 35;
            form.Controls.Add(topPanel);

            Label lblTitulo = new Label();
            lblTitulo.Text = titulo;
            lblTitulo.ForeColor = Color.White;
            lblTitulo.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            lblTitulo.Location = new Point(10, 8);
            lblTitulo.AutoSize = true;
            topPanel.Controls.Add(lblTitulo);

            // Cuerpo del mensaje
            Label lblMensaje = new Label();
            lblMensaje.Text = mensaje;
            lblMensaje.ForeColor = TemaModerno.ColorTexto;
            lblMensaje.Font = new Font("Segoe UI", 11F);
            lblMensaje.Location = new Point(20, 60);
            lblMensaje.MaximumSize = new Size(360, 0);
            lblMensaje.AutoSize = true;
            form.Controls.Add(lblMensaje);

            // Contenedor de botones
            FlowLayoutPanel btnPanel = new FlowLayoutPanel();
            btnPanel.Dock = DockStyle.Bottom;
            btnPanel.Height = 60;
            btnPanel.BackColor = TemaModerno.ColorGrisClaro;
            btnPanel.FlowDirection = FlowDirection.RightToLeft;
            btnPanel.Padding = new Padding(10, 10, 10, 0);
            form.Controls.Add(btnPanel);

            DialogResult resultado = DialogResult.None;

            if (botones == MessageBoxButtons.YesNo || botones == MessageBoxButtons.OKCancel)
            {
                Button btnNo = CrearBoton(botones == MessageBoxButtons.YesNo ? "No" : "Cancelar", TemaModerno.ColorPeligro);
                btnNo.Click += (s, e) => { resultado = botones == MessageBoxButtons.YesNo ? DialogResult.No : DialogResult.Cancel; form.Close(); };
                btnPanel.Controls.Add(btnNo);

                Button btnYes = CrearBoton(botones == MessageBoxButtons.YesNo ? "Sí" : "Aceptar", TemaModerno.ColorSecundario);
                btnYes.Click += (s, e) => { resultado = botones == MessageBoxButtons.YesNo ? DialogResult.Yes : DialogResult.OK; form.Close(); };
                btnPanel.Controls.Add(btnYes);
            }
            else
            {
                Button btnOk = CrearBoton("Aceptar", TemaModerno.ColorSecundario);
                btnOk.Click += (s, e) => { resultado = DialogResult.OK; form.Close(); };
                btnPanel.Controls.Add(btnOk);
            }

            // Efecto sombra (borde sutil)
            form.Paint += (s, e) =>
            {
                ControlPaint.DrawBorder(e.Graphics, form.ClientRectangle, TemaModerno.ColorPrimario, ButtonBorderStyle.Solid);
            };

            form.ShowDialog();
            return resultado;
        }

        private static Button CrearBoton(string texto, Color colorFondo)
        {
            Button btn = new Button();
            btn.Text = texto;
            btn.BackColor = colorFondo;
            btn.ForeColor = Color.White;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btn.Size = new Size(100, 35);
            btn.Cursor = Cursors.Hand;
            btn.Margin = new Padding(10, 0, 0, 0);

            btn.MouseEnter += (s, e) => { btn.BackColor = ControlPaint.Light(colorFondo, 0.2f); };
            btn.MouseLeave += (s, e) => { btn.BackColor = colorFondo; };

            return btn;
        }
    }
}
