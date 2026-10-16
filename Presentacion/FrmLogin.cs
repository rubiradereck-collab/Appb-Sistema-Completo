using Entidades.Gestion_de_Entidades;
using Logica;
using Logica.Gestion_de_Logica;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Presentacion
{
    public partial class FrmLogin : Form
    {
        private UsuarioLN _usuarioLN = new UsuarioLN();

        public FrmLogin()
        {
            InitializeComponent();
            TemaModerno.Aplicar(this);
            _usuarioLN = new UsuarioLN();
            this.btnIngresar.Location = new System.Drawing.Point(100, 200);
            txtPassword.UseSystemPasswordChar = !passwordVisible;
            toolTip1.SetToolTip(btnIngresar, "Iniciar sesión en el sistema");

        }


        private void btnIngresar_Click(object sender, EventArgs e)
        {
            string user = txtUsuario.Text.Trim();
            string pass = txtPassword.Text.Trim();

            if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
            {
                MessageBox.Show("Por favor, ingrese usuario y contraseña.", "Advertencia", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                Usuario usuarioValido = _usuarioLN.Login(user, pass);

                if (usuarioValido != null)
                {
                    FrmPrincipal frmPrincipal = new FrmPrincipal(usuarioValido);
                    this.Hide();
                    frmPrincipal.ShowDialog(); 
                    txtPassword.Clear();
                    txtPassword.Focus();
                    this.Show();
                }
                else
                {
                    MessageBox.Show("Credenciales incorrectas o usuario inactivo.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (LogicaExcepciones ex) when (ex.InnerException == null)
            {
                // Error de negocio con mensaje pensado para el usuario (ej. cuenta bloqueada)
                MessageBox.Show(ex.Message, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (Exception ex)
            {
                // Error técnico (conexión, base de datos...): el detalle completo va al log
                string rutaLog = GuardarErrorEnLog(ex);
#if DEBUG
                // Ejecutando desde Visual Studio: mostrar el detalle completo para depurar
                MessageBox.Show(ex.ToString(), "Error de Sistema", MessageBoxButtons.OK, MessageBoxIcon.Error);
#else
                MessageBox.Show(
                    "No se pudo iniciar sesión porque el sistema no logró conectarse con el servidor.\n\n" +
                    "Verifica tu conexión a la red e inténtalo de nuevo. Si el problema continúa, " +
                    "contacta al área de soporte." +
                    (rutaLog != null ? "\n\nDetalle técnico guardado en:\n" + rutaLog : ""),
                    "No se pudo conectar", MessageBoxButtons.OK, MessageBoxIcon.Error);
#endif
            }

        }

        /// <summary>
        /// Guarda el detalle completo del error en %LOCALAPPDATA%\APPB\errores.log
        /// para que soporte pueda revisarlo. Devuelve la ruta, o null si no se pudo escribir.
        /// </summary>
        private static string GuardarErrorEnLog(Exception ex)
        {
            try
            {
                string carpeta = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APPB");
                System.IO.Directory.CreateDirectory(carpeta);
                string ruta = System.IO.Path.Combine(carpeta, "errores.log");
                System.IO.File.AppendAllText(ruta,
                    "==== " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " ====" + Environment.NewLine +
                    ex + Environment.NewLine + Environment.NewLine);
                return ruta;
            }
            catch
            {
                return null; // Si no se puede escribir el log, no bloquear al usuario
            }
        }

        private void FrmLogin_Load(object sender, EventArgs e)
        {

        }

        private void linkLabel1_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
        {
            string valor = Microsoft.VisualBasic.Interaction.InputBox(
                "Ingresa tu usuario o correo registrado:",
                "Recuperar contraseña", "");

            if (string.IsNullOrWhiteSpace(valor))
                return;

            try
            {
                var usuarioLN = new UsuarioLN();
                Usuario usuario = usuarioLN.BuscarPorUsuarioOCorreo(valor.Trim());

                if (usuario == null || string.IsNullOrWhiteSpace(usuario.Correo))
                {
                    MessageBox.Show("No se encontró ninguna cuenta con ese usuario o correo.",
                        "Recuperar contraseña", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                string passwordTemporal = usuarioLN.GenerarPasswordTemporal(usuario);

                CorreoService.EnviarCorreo(
                    usuario.Correo,
                    "Recuperación de contraseña - Sistema de Incidencias APPB",
                    $"Hola {usuario.Nombre},\n\nTu nueva contraseña temporal es: {passwordTemporal}\n\n" +
                    "Por seguridad, te recomendamos cambiarla apenas inicies sesión.\n\n" +
                    "Si no solicitaste este cambio, contacta al administrador del sistema de inmediato."
                );

                MessageBox.Show($"Se envió una contraseña temporal a {usuario.Correo}.",
                    "Recuperar contraseña", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (LogicaExcepciones lex)
            {
                MessageBox.Show(lex.Message, "Recuperar contraseña", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Ocurrió un error al procesar la solicitud: " + ex.Message,
                    "Recuperar contraseña", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private bool passwordVisible = false;

        private void lblVerPassword_Click(object sender, EventArgs e)
        {
            passwordVisible = !passwordVisible;
            txtPassword.UseSystemPasswordChar = !passwordVisible;
            lblVerPassword.Text = passwordVisible ? "🙈" : "👁";
        }

        private void btnSalir_Click(object sender, EventArgs e)
        {
            Application.Exit();
        }
    }
}

