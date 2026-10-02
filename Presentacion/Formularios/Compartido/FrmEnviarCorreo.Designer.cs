namespace Presentacion.Formularios.Compartido
{
    partial class FrmEnviarCorreo
    {
        private System.ComponentModel.IContainer components = null;
        private System.Windows.Forms.Label lblCorreo;
        private System.Windows.Forms.TextBox txtCorreo;
        private System.Windows.Forms.Label lblAsunto;
        private System.Windows.Forms.TextBox txtAsunto;
        private System.Windows.Forms.Label lblMensaje;
        private System.Windows.Forms.TextBox txtMensaje;
        private System.Windows.Forms.CheckBox chkAdjuntarExcel;
        private System.Windows.Forms.Button btnEnviar;
        private System.Windows.Forms.Button btnCancelar;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            this.lblCorreo = new System.Windows.Forms.Label();
            this.txtCorreo = new System.Windows.Forms.TextBox();
            this.lblAsunto = new System.Windows.Forms.Label();
            this.txtAsunto = new System.Windows.Forms.TextBox();
            this.lblMensaje = new System.Windows.Forms.Label();
            this.txtMensaje = new System.Windows.Forms.TextBox();
            this.chkAdjuntarExcel = new System.Windows.Forms.CheckBox();
            this.btnEnviar = new System.Windows.Forms.Button();
            this.btnCancelar = new System.Windows.Forms.Button();
            this.SuspendLayout();
            // lblCorreo
            this.lblCorreo.AutoSize = true;
            this.lblCorreo.Location = new System.Drawing.Point(20, 20);
            this.lblCorreo.Name = "lblCorreo";
            this.lblCorreo.Size = new System.Drawing.Size(94, 15);
            this.lblCorreo.TabIndex = 0;
            this.lblCorreo.Text = "Correo Destino:";
            // txtCorreo
            this.txtCorreo.Location = new System.Drawing.Point(20, 40);
            this.txtCorreo.Name = "txtCorreo";
            this.txtCorreo.Size = new System.Drawing.Size(340, 23);
            this.txtCorreo.TabIndex = 1;
            // lblAsunto
            this.lblAsunto.AutoSize = true;
            this.lblAsunto.Location = new System.Drawing.Point(20, 75);
            this.lblAsunto.Name = "lblAsunto";
            this.lblAsunto.Size = new System.Drawing.Size(48, 15);
            this.lblAsunto.TabIndex = 2;
            this.lblAsunto.Text = "Asunto:";
            // txtAsunto
            this.txtAsunto.Location = new System.Drawing.Point(20, 95);
            this.txtAsunto.Name = "txtAsunto";
            this.txtAsunto.Size = new System.Drawing.Size(340, 23);
            this.txtAsunto.TabIndex = 3;
            // lblMensaje
            this.lblMensaje.AutoSize = true;
            this.lblMensaje.Location = new System.Drawing.Point(20, 130);
            this.lblMensaje.Name = "lblMensaje";
            this.lblMensaje.Size = new System.Drawing.Size(117, 15);
            this.lblMensaje.TabIndex = 4;
            this.lblMensaje.Text = "Mensaje (Opcional):";
            // txtMensaje
            this.txtMensaje.Location = new System.Drawing.Point(20, 150);
            this.txtMensaje.Multiline = true;
            this.txtMensaje.Name = "txtMensaje";
            this.txtMensaje.Size = new System.Drawing.Size(340, 80);
            this.txtMensaje.TabIndex = 5;
            // chkAdjuntarExcel
            this.chkAdjuntarExcel.AutoSize = true;
            this.chkAdjuntarExcel.Location = new System.Drawing.Point(20, 245);
            this.chkAdjuntarExcel.Name = "chkAdjuntarExcel";
            this.chkAdjuntarExcel.Size = new System.Drawing.Size(155, 19);
            this.chkAdjuntarExcel.TabIndex = 6;
            this.chkAdjuntarExcel.Text = "Adjuntar también Excel";
            this.chkAdjuntarExcel.UseVisualStyleBackColor = true;
            // btnEnviar
            this.btnEnviar.Location = new System.Drawing.Point(180, 280);
            this.btnEnviar.Name = "btnEnviar";
            this.btnEnviar.Size = new System.Drawing.Size(85, 30);
            this.btnEnviar.TabIndex = 7;
            this.btnEnviar.Text = "Enviar";
            this.btnEnviar.UseVisualStyleBackColor = true;
            this.btnEnviar.Click += new System.EventHandler(this.btnEnviar_Click);
            // btnCancelar
            this.btnCancelar.Location = new System.Drawing.Point(275, 280);
            this.btnCancelar.Name = "btnCancelar";
            this.btnCancelar.Size = new System.Drawing.Size(85, 30);
            this.btnCancelar.TabIndex = 8;
            this.btnCancelar.Text = "Cancelar";
            this.btnCancelar.UseVisualStyleBackColor = true;
            this.btnCancelar.Click += new System.EventHandler(this.btnCancelar_Click);
            // FrmEnviarCorreo
            this.ClientSize = new System.Drawing.Size(384, 331);
            this.Controls.Add(this.btnCancelar);
            this.Controls.Add(this.btnEnviar);
            this.Controls.Add(this.chkAdjuntarExcel);
            this.Controls.Add(this.txtMensaje);
            this.Controls.Add(this.lblMensaje);
            this.Controls.Add(this.txtAsunto);
            this.Controls.Add(this.lblAsunto);
            this.Controls.Add(this.txtCorreo);
            this.Controls.Add(this.lblCorreo);
            this.Font = new System.Drawing.Font("Segoe UI", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "FrmEnviarCorreo";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Enviar por Correo";
            this.ResumeLayout(false);
            this.PerformLayout();
        }
    }
}
