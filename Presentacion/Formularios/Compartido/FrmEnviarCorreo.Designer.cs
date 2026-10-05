namespace Presentacion.Formularios.Compartido
{
    partial class FrmEnviarCorreo
    {
        private System.ComponentModel.IContainer components = null;

        private System.Windows.Forms.Panel pnlHeader;
        private System.Windows.Forms.Label lblIcono;
        private System.Windows.Forms.Label lblTitulo;
        private System.Windows.Forms.Label lblSubtitulo;

        private System.Windows.Forms.Label lblCorreo;
        private System.Windows.Forms.Label lblErrorCorreo;
        private System.Windows.Forms.Panel pnlCorreo;
        private System.Windows.Forms.TextBox txtCorreo;

        private System.Windows.Forms.Label lblAsunto;
        private System.Windows.Forms.Panel pnlAsunto;
        private System.Windows.Forms.TextBox txtAsunto;

        private System.Windows.Forms.Label lblMensaje;
        private System.Windows.Forms.Panel pnlMensaje;
        private System.Windows.Forms.TextBox txtMensaje;

        private System.Windows.Forms.Panel pnlOpciones;
        private System.Windows.Forms.CheckBox chkAdjuntarExcel;
        public System.Windows.Forms.CheckBox chkTodos;
        private System.Windows.Forms.Label lblTodosInfo;

        private System.Windows.Forms.Panel pnlFooter;
        private System.Windows.Forms.Panel pnlLineaFooter;
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
            this.pnlHeader = new System.Windows.Forms.Panel();
            this.lblIcono = new System.Windows.Forms.Label();
            this.lblTitulo = new System.Windows.Forms.Label();
            this.lblSubtitulo = new System.Windows.Forms.Label();
            this.lblCorreo = new System.Windows.Forms.Label();
            this.lblErrorCorreo = new System.Windows.Forms.Label();
            this.pnlCorreo = new System.Windows.Forms.Panel();
            this.txtCorreo = new System.Windows.Forms.TextBox();
            this.lblAsunto = new System.Windows.Forms.Label();
            this.pnlAsunto = new System.Windows.Forms.Panel();
            this.txtAsunto = new System.Windows.Forms.TextBox();
            this.lblMensaje = new System.Windows.Forms.Label();
            this.pnlMensaje = new System.Windows.Forms.Panel();
            this.txtMensaje = new System.Windows.Forms.TextBox();
            this.pnlOpciones = new System.Windows.Forms.Panel();
            this.chkAdjuntarExcel = new System.Windows.Forms.CheckBox();
            this.chkTodos = new System.Windows.Forms.CheckBox();
            this.lblTodosInfo = new System.Windows.Forms.Label();
            this.pnlFooter = new System.Windows.Forms.Panel();
            this.pnlLineaFooter = new System.Windows.Forms.Panel();
            this.btnEnviar = new System.Windows.Forms.Button();
            this.btnCancelar = new System.Windows.Forms.Button();
            this.pnlHeader.SuspendLayout();
            this.pnlCorreo.SuspendLayout();
            this.pnlAsunto.SuspendLayout();
            this.pnlMensaje.SuspendLayout();
            this.pnlOpciones.SuspendLayout();
            this.pnlFooter.SuspendLayout();
            this.SuspendLayout();
            //
            // pnlHeader
            //
            this.pnlHeader.BackColor = System.Drawing.Color.FromArgb(21, 50, 80);
            this.pnlHeader.Controls.Add(this.lblSubtitulo);
            this.pnlHeader.Controls.Add(this.lblTitulo);
            this.pnlHeader.Controls.Add(this.lblIcono);
            this.pnlHeader.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnlHeader.Location = new System.Drawing.Point(0, 0);
            this.pnlHeader.Name = "pnlHeader";
            this.pnlHeader.Size = new System.Drawing.Size(500, 72);
            this.pnlHeader.TabIndex = 0;
            //
            // lblIcono
            //
            this.lblIcono.Font = new System.Drawing.Font("Segoe UI Symbol", 22F);
            this.lblIcono.ForeColor = System.Drawing.Color.White;
            this.lblIcono.Location = new System.Drawing.Point(16, 12);
            this.lblIcono.Name = "lblIcono";
            this.lblIcono.Size = new System.Drawing.Size(48, 48);
            this.lblIcono.Text = "✉";
            this.lblIcono.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            //
            // lblTitulo
            //
            this.lblTitulo.AutoSize = true;
            this.lblTitulo.Font = new System.Drawing.Font("Segoe UI Semibold", 14F);
            this.lblTitulo.ForeColor = System.Drawing.Color.White;
            this.lblTitulo.Location = new System.Drawing.Point(68, 12);
            this.lblTitulo.Name = "lblTitulo";
            this.lblTitulo.Text = "Enviar por correo";
            //
            // lblSubtitulo
            //
            this.lblSubtitulo.AutoSize = true;
            this.lblSubtitulo.Font = new System.Drawing.Font("Segoe UI", 9F);
            this.lblSubtitulo.ForeColor = System.Drawing.Color.FromArgb(180, 200, 222);
            this.lblSubtitulo.Location = new System.Drawing.Point(70, 42);
            this.lblSubtitulo.Name = "lblSubtitulo";
            this.lblSubtitulo.Text = "El archivo se adjuntará automáticamente al correo";
            //
            // lblCorreo
            //
            this.lblCorreo.AutoSize = true;
            this.lblCorreo.Font = new System.Drawing.Font("Segoe UI Semibold", 9F);
            this.lblCorreo.ForeColor = System.Drawing.Color.FromArgb(70, 80, 95);
            this.lblCorreo.Location = new System.Drawing.Point(24, 88);
            this.lblCorreo.Name = "lblCorreo";
            this.lblCorreo.Text = "Correo destino";
            //
            // lblErrorCorreo
            //
            this.lblErrorCorreo.Font = new System.Drawing.Font("Segoe UI", 8.25F);
            this.lblErrorCorreo.ForeColor = System.Drawing.Color.FromArgb(220, 53, 69);
            this.lblErrorCorreo.Location = new System.Drawing.Point(200, 88);
            this.lblErrorCorreo.Name = "lblErrorCorreo";
            this.lblErrorCorreo.Size = new System.Drawing.Size(276, 18);
            this.lblErrorCorreo.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            this.lblErrorCorreo.Visible = false;
            //
            // pnlCorreo
            //
            this.pnlCorreo.BackColor = System.Drawing.Color.White;
            this.pnlCorreo.Controls.Add(this.txtCorreo);
            this.pnlCorreo.Location = new System.Drawing.Point(24, 108);
            this.pnlCorreo.Name = "pnlCorreo";
            this.pnlCorreo.Padding = new System.Windows.Forms.Padding(10, 8, 10, 4);
            this.pnlCorreo.Size = new System.Drawing.Size(452, 34);
            this.pnlCorreo.TabIndex = 1;
            //
            // txtCorreo
            //
            this.txtCorreo.BorderStyle = System.Windows.Forms.BorderStyle.None;
            this.txtCorreo.Dock = System.Windows.Forms.DockStyle.Fill;
            this.txtCorreo.Font = new System.Drawing.Font("Segoe UI", 10F);
            this.txtCorreo.Name = "txtCorreo";
            this.txtCorreo.TabIndex = 0;
            //
            // lblAsunto
            //
            this.lblAsunto.AutoSize = true;
            this.lblAsunto.Font = new System.Drawing.Font("Segoe UI Semibold", 9F);
            this.lblAsunto.ForeColor = System.Drawing.Color.FromArgb(70, 80, 95);
            this.lblAsunto.Location = new System.Drawing.Point(24, 154);
            this.lblAsunto.Name = "lblAsunto";
            this.lblAsunto.Text = "Asunto";
            //
            // pnlAsunto
            //
            this.pnlAsunto.BackColor = System.Drawing.Color.White;
            this.pnlAsunto.Controls.Add(this.txtAsunto);
            this.pnlAsunto.Location = new System.Drawing.Point(24, 174);
            this.pnlAsunto.Name = "pnlAsunto";
            this.pnlAsunto.Padding = new System.Windows.Forms.Padding(10, 8, 10, 4);
            this.pnlAsunto.Size = new System.Drawing.Size(452, 34);
            this.pnlAsunto.TabIndex = 2;
            //
            // txtAsunto
            //
            this.txtAsunto.BorderStyle = System.Windows.Forms.BorderStyle.None;
            this.txtAsunto.Dock = System.Windows.Forms.DockStyle.Fill;
            this.txtAsunto.Font = new System.Drawing.Font("Segoe UI", 10F);
            this.txtAsunto.Name = "txtAsunto";
            this.txtAsunto.TabIndex = 0;
            //
            // lblMensaje
            //
            this.lblMensaje.AutoSize = true;
            this.lblMensaje.Font = new System.Drawing.Font("Segoe UI Semibold", 9F);
            this.lblMensaje.ForeColor = System.Drawing.Color.FromArgb(70, 80, 95);
            this.lblMensaje.Location = new System.Drawing.Point(24, 220);
            this.lblMensaje.Name = "lblMensaje";
            this.lblMensaje.Text = "Mensaje (opcional)";
            //
            // pnlMensaje
            //
            this.pnlMensaje.BackColor = System.Drawing.Color.White;
            this.pnlMensaje.Controls.Add(this.txtMensaje);
            this.pnlMensaje.Location = new System.Drawing.Point(24, 240);
            this.pnlMensaje.Name = "pnlMensaje";
            this.pnlMensaje.Padding = new System.Windows.Forms.Padding(10, 8, 4, 6);
            this.pnlMensaje.Size = new System.Drawing.Size(452, 96);
            this.pnlMensaje.TabIndex = 3;
            //
            // txtMensaje
            //
            this.txtMensaje.AcceptsReturn = true;
            this.txtMensaje.BorderStyle = System.Windows.Forms.BorderStyle.None;
            this.txtMensaje.Dock = System.Windows.Forms.DockStyle.Fill;
            this.txtMensaje.Font = new System.Drawing.Font("Segoe UI", 10F);
            this.txtMensaje.Multiline = true;
            this.txtMensaje.Name = "txtMensaje";
            this.txtMensaje.ScrollBars = System.Windows.Forms.ScrollBars.Vertical;
            this.txtMensaje.TabIndex = 0;
            //
            // pnlOpciones
            //
            this.pnlOpciones.BackColor = System.Drawing.Color.FromArgb(240, 245, 252);
            this.pnlOpciones.Controls.Add(this.lblTodosInfo);
            this.pnlOpciones.Controls.Add(this.chkTodos);
            this.pnlOpciones.Controls.Add(this.chkAdjuntarExcel);
            this.pnlOpciones.Location = new System.Drawing.Point(24, 352);
            this.pnlOpciones.Name = "pnlOpciones";
            this.pnlOpciones.Size = new System.Drawing.Size(452, 90);
            this.pnlOpciones.TabIndex = 4;
            //
            // chkAdjuntarExcel
            //
            this.chkAdjuntarExcel.AutoSize = true;
            this.chkAdjuntarExcel.Cursor = System.Windows.Forms.Cursors.Hand;
            this.chkAdjuntarExcel.Font = new System.Drawing.Font("Segoe UI", 9.5F);
            this.chkAdjuntarExcel.ForeColor = System.Drawing.Color.FromArgb(21, 50, 80);
            this.chkAdjuntarExcel.Location = new System.Drawing.Point(14, 12);
            this.chkAdjuntarExcel.Name = "chkAdjuntarExcel";
            this.chkAdjuntarExcel.TabIndex = 0;
            this.chkAdjuntarExcel.Text = "Adjuntar también el reporte en Excel";
            this.chkAdjuntarExcel.UseVisualStyleBackColor = true;
            //
            // chkTodos
            //
            this.chkTodos.AutoSize = true;
            this.chkTodos.Cursor = System.Windows.Forms.Cursors.Hand;
            this.chkTodos.Font = new System.Drawing.Font("Segoe UI", 9.5F);
            this.chkTodos.ForeColor = System.Drawing.Color.FromArgb(21, 50, 80);
            this.chkTodos.Location = new System.Drawing.Point(14, 40);
            this.chkTodos.Name = "chkTodos";
            this.chkTodos.TabIndex = 1;
            this.chkTodos.Text = "Enviar a todo el personal activo";
            this.chkTodos.UseVisualStyleBackColor = true;
            //
            // lblTodosInfo
            //
            this.lblTodosInfo.Font = new System.Drawing.Font("Segoe UI", 8.25F);
            this.lblTodosInfo.ForeColor = System.Drawing.Color.FromArgb(110, 120, 135);
            this.lblTodosInfo.Location = new System.Drawing.Point(32, 62);
            this.lblTodosInfo.Name = "lblTodosInfo";
            this.lblTodosInfo.Size = new System.Drawing.Size(410, 18);
            this.lblTodosInfo.Text = "Cada usuario lo recibe sin ver a los demás destinatarios (copia oculta).";
            //
            // pnlFooter
            //
            this.pnlFooter.BackColor = System.Drawing.Color.FromArgb(245, 247, 250);
            this.pnlFooter.Controls.Add(this.btnCancelar);
            this.pnlFooter.Controls.Add(this.btnEnviar);
            this.pnlFooter.Controls.Add(this.pnlLineaFooter);
            this.pnlFooter.Dock = System.Windows.Forms.DockStyle.Bottom;
            this.pnlFooter.Location = new System.Drawing.Point(0, 456);
            this.pnlFooter.Name = "pnlFooter";
            this.pnlFooter.Size = new System.Drawing.Size(500, 64);
            this.pnlFooter.TabIndex = 5;
            //
            // pnlLineaFooter
            //
            this.pnlLineaFooter.BackColor = System.Drawing.Color.FromArgb(225, 230, 236);
            this.pnlLineaFooter.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnlLineaFooter.Name = "pnlLineaFooter";
            this.pnlLineaFooter.Size = new System.Drawing.Size(500, 1);
            //
            // btnCancelar
            //
            this.btnCancelar.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btnCancelar.Cursor = System.Windows.Forms.Cursors.Hand;
            this.btnCancelar.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            this.btnCancelar.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
            this.btnCancelar.Font = new System.Drawing.Font("Segoe UI Semibold", 9.75F);
            this.btnCancelar.Location = new System.Drawing.Point(232, 14);
            this.btnCancelar.Name = "btnCancelar";
            this.btnCancelar.Size = new System.Drawing.Size(110, 36);
            this.btnCancelar.TabIndex = 1;
            this.btnCancelar.Text = "Cancelar";
            this.btnCancelar.Click += new System.EventHandler(this.btnCancelar_Click);
            //
            // btnEnviar
            //
            this.btnEnviar.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btnEnviar.Cursor = System.Windows.Forms.Cursors.Hand;
            this.btnEnviar.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
            this.btnEnviar.Font = new System.Drawing.Font("Segoe UI Semibold", 9.75F);
            this.btnEnviar.Location = new System.Drawing.Point(352, 14);
            this.btnEnviar.Name = "btnEnviar";
            this.btnEnviar.Size = new System.Drawing.Size(124, 36);
            this.btnEnviar.TabIndex = 0;
            this.btnEnviar.Text = "Enviar correo";
            this.btnEnviar.Click += new System.EventHandler(this.btnEnviar_Click);
            //
            // FrmEnviarCorreo
            //
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.BackColor = System.Drawing.Color.White;
            this.CancelButton = this.btnCancelar;
            this.ClientSize = new System.Drawing.Size(500, 520);
            this.Controls.Add(this.pnlOpciones);
            this.Controls.Add(this.pnlMensaje);
            this.Controls.Add(this.lblMensaje);
            this.Controls.Add(this.pnlAsunto);
            this.Controls.Add(this.lblAsunto);
            this.Controls.Add(this.pnlCorreo);
            this.Controls.Add(this.lblErrorCorreo);
            this.Controls.Add(this.lblCorreo);
            this.Controls.Add(this.pnlFooter);
            this.Controls.Add(this.pnlHeader);
            this.Font = new System.Drawing.Font("Segoe UI", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "FrmEnviarCorreo";
            this.ShowInTaskbar = false;
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Enviar por correo";
            this.pnlHeader.ResumeLayout(false);
            this.pnlHeader.PerformLayout();
            this.pnlCorreo.ResumeLayout(false);
            this.pnlCorreo.PerformLayout();
            this.pnlAsunto.ResumeLayout(false);
            this.pnlAsunto.PerformLayout();
            this.pnlMensaje.ResumeLayout(false);
            this.pnlMensaje.PerformLayout();
            this.pnlOpciones.ResumeLayout(false);
            this.pnlOpciones.PerformLayout();
            this.pnlFooter.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();
        }
    }
}