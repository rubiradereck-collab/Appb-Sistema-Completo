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
                    if (_usuarioLN.UltimoLoginConTemporal)
                    {
                        MessageBox.Show(
                            "Ingresaste con la contraseña temporal de recuperación, que ahora es tu contraseña.\n\n" +
                            "Cámbiala por una que solo tú conozcas en \"Mi Perfil\".",
                            "Contraseña temporal", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }

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
        internal static string GuardarErrorEnLog(Exception ex)
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

            // Etapa 4: mismo mensaje exista o no la cuenta (no revela qué usuarios o correos existen).
            // La clave temporal se guarda aparte y vence en 30 minutos: la contraseña actual sigue
            // funcionando, así nadie puede dejar a otra persona sin acceso pidiendo recuperaciones.
            const string mensajeGenerico =
                "Si los datos corresponden a una cuenta activa, se envió una contraseña temporal a su correo registrado.\n\n" +
                "La contraseña temporal vence en 30 minutos. Tu contraseña actual sigue funcionando.";
            try
            {
                var usuarioLN = new UsuarioLN();
                Usuario usuario = usuarioLN.BuscarPorUsuarioOCorreo(valor.Trim());

                if (usuario != null && usuario.Estado && !string.IsNullOrWhiteSpace(usuario.Correo))
                {
                    string passwordTemporal = usuarioLN.SolicitarRecuperacion(usuario);
                    if (passwordTemporal == null)
                    {
                        MessageBox.Show($"Ya se envió una contraseña temporal hace poco. Revisa tu correo o espera {UsuarioLN.MINUTOS_ENTRE_SOLICITUDES} minutos para pedir otra.",
                            "Recuperar contraseña", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return;
                    }

                    CorreoService.EnviarCorreo(
                        usuario.Correo,
                        "Recuperación de contraseña - Sistema de Incidencias APPB",
                        $"Hola {usuario.Nombre},\n\nTu contraseña temporal es: {passwordTemporal}\n\n" +
                        $"Vence en {UsuarioLN.MINUTOS_VALIDEZ_TEMPORAL} minutos. Tu contraseña actual sigue funcionando; " +
                        "si entras con la temporal, esa pasa a ser tu contraseña y te recomendamos cambiarla en Mi Perfil.\n\n" +
                        "Si no solicitaste este cambio, ignora este correo."
                    );
                }

                MessageBox.Show(mensajeGenerico, "Recuperar contraseña", MessageBoxButtons.OK, MessageBoxIcon.Information);
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

