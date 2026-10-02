using System;
using System.Drawing;
using System.Windows.Forms;


namespace Presentacion.Formularios.Compartido
{
    public partial class FrmEnviarCorreo : Form
    {
        public string CorreoDestino { get { return txtCorreo.Text; } }
        public string Asunto { get { return txtAsunto.Text; } }
        public string Mensaje { get { return txtMensaje.Text; } }
        public bool AdjuntarExcel { get { return chkAdjuntarExcel.Checked; } }
        public bool ConfirmaEnvio { get; private set; } = false;

        public FrmEnviarCorreo(string correoDefault, string asuntoDefault, bool mostrarOpcionExcel)
        {
            InitializeComponent();
            Presentacion.TemaModerno.Aplicar(this);

            txtCorreo.Text = correoDefault;
            txtAsunto.Text = asuntoDefault;
            chkAdjuntarExcel.Visible = mostrarOpcionExcel;
        }

        private void btnEnviar_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtCorreo.Text) || !txtCorreo.Text.Contains("@"))
            {
                MessageBox.Show("Ingrese un correo válido.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            ConfirmaEnvio = true;
            this.Close();
        }

        private void btnCancelar_Click(object sender, EventArgs e)
        {
            ConfirmaEnvio = false;
            this.Close();
        }
    }
}
