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
        public bool EnviarATodos { get { return chkTodos != null && chkTodos.Checked; } }
        public bool ConfirmaEnvio { get; private set; } = false;

        
        public System.Windows.Forms.CheckBox chkTodos;
        private void AgregarChkTodos()
        {
            chkTodos = new System.Windows.Forms.CheckBox();
            chkTodos.Text = "Enviar a todo el personal (BCC)";
            chkTodos.Location = new System.Drawing.Point(20, 275); // Adjust Y based on actual layout
            chkTodos.AutoSize = true;
            chkTodos.ForeColor = System.Drawing.Color.Black;
            chkTodos.CheckedChanged += (s, e) => {
                txtCorreo.Enabled = !chkTodos.Checked;
                if(chkTodos.Checked) txtCorreo.Text = "Todos los usuarios activos";
                else txtCorreo.Text = "";
            };
            this.Controls.Add(chkTodos);
        }

        public FrmEnviarCorreo(string correoDefault, string asuntoDefault, bool mostrarOpcionExcel)
        {
            InitializeComponent();
            AgregarChkTodos();
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
