using Entidades.Gestion_de_Entidades;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace Presentacion
{
    public partial class FrmManual : Form
    {
        private readonly Usuario usuarioActual;
        private readonly Dictionary<string, List<(string tipo, string texto)>> contenido =
            new Dictionary<string, List<(string, string)>>();

        public FrmManual(Usuario usuarioActual)
        {
            InitializeComponent();
            TemaModerno.Aplicar(this);
            this.usuarioActual = usuarioActual;

            treeSecciones.DrawMode = TreeViewDrawMode.OwnerDrawText;
            treeSecciones.DrawNode += TreeSecciones_DrawNode;

            CargarContenido();
            CargarSecciones();

            treeSecciones.AfterSelect += (s, e) =>
            {
                if (e.Node.Tag != null)
                {
                    MostrarContenido(e.Node.Tag.ToString());
                }
            };
        }

        private void TreeSecciones_DrawNode(object sender, DrawTreeNodeEventArgs e)
        {
            bool seleccionado = (e.State & TreeNodeStates.Selected) != 0;
            Color fondo = seleccionado ? Color.FromArgb(43, 107, 154) : Color.FromArgb(21, 50, 80);
            Color texto = Color.White;

            using (SolidBrush brushFondo = new SolidBrush(fondo))
            {
                e.Graphics.FillRectangle(brushFondo, e.Bounds);
            }

            TextRenderer.DrawText(e.Graphics, e.Node.Text, treeSecciones.Font, e.Bounds, texto,
                TextFormatFlags.VerticalCenter | TextFormatFlags.Left);
        }

        private void CargarSecciones()
        {
            treeSecciones.Nodes.Clear();

            treeSecciones.Nodes.Add(new TreeNode("🔐 Inicio de Sesión") { Tag = "Login" });
            treeSecciones.Nodes.Add(new TreeNode("🛠️ Incidencias") { Tag = "Incidencias" });

            if (usuarioActual.Rol == "Administrador")
            {
                treeSecciones.Nodes.Add(new TreeNode("👥 Usuarios") { Tag = "Usuarios" });
                treeSecciones.Nodes.Add(new TreeNode("🏢 Áreas") { Tag = "Areas" });
            }

            treeSecciones.Nodes.Add(new TreeNode("📖 Guías") { Tag = "Guias" });
            treeSecciones.Nodes.Add(new TreeNode("📊 Dashboard") { Tag = "Dashboard" });
            treeSecciones.Nodes.Add(new TreeNode("🤖 Bot de Telegram") { Tag = "Bot" });
            treeSecciones.Nodes.Add(new TreeNode("👤 Mi Perfil") { Tag = "Perfil" });

            if (treeSecciones.Nodes.Count > 0)
            {
                treeSecciones.SelectedNode = treeSecciones.Nodes[0];
                MostrarContenido("Login");
            }
        }

        private void MostrarContenido(string clave)
        {
            rtbContenido.Clear();

            foreach (var (tipo, texto) in contenido[clave])
            {
                switch (tipo)
                {
                    case "titulo":
                        rtbContenido.SelectionFont = new Font("Segoe UI", 22, FontStyle.Bold);
                        rtbContenido.SelectionColor = Color.FromArgb(21, 50, 80);
                        rtbContenido.AppendText(texto + "\n\n");
                        break;

                    case "subtitulo":
                        rtbContenido.SelectionFont = new Font("Segoe UI", 14, FontStyle.Bold);
                        rtbContenido.SelectionColor = Color.FromArgb(43, 107, 154);
                        rtbContenido.AppendText(texto + "\n");
                        break;

                    case "texto":
                        rtbContenido.SelectionFont = new Font("Segoe UI", 12, FontStyle.Regular);
                        rtbContenido.SelectionColor = Color.Black;
                        rtbContenido.AppendText(texto + "\n\n");
                        break;
                }
            }

            rtbContenido.SelectionStart = 0;
        }

        private void CargarContenido()
        {
            contenido["Login"] = new List<(string, string)>
            {
                ("titulo", "🏠 Inicio de Sesión"),
                ("texto", "Esta es la puerta de entrada al sistema. Ingresa el nombre de usuario y la contraseña que te asignó el Administrador para acceder a tu cuenta."),
                ("subtitulo", "¿Olvidaste tu contraseña?"),
                ("texto", "El sistema no permite recuperar contraseñas por ti mismo (por seguridad, las contraseñas se guardan cifradas y nadie, ni siquiera el Administrador, puede ver la tuya original). Contacta al Administrador — él puede generarte una contraseña temporal nueva desde el módulo de Usuarios, o ponerte una que tú elijas."),
                ("subtitulo", "Bloqueo de cuenta por seguridad"),
                ("texto", "Si escribes tu contraseña incorrecta 5 veces seguidas, tu cuenta se bloquea automáticamente durante 5 minutos. Esto protege el sistema contra intentos de adivinar contraseñas. Si esto te pasa, simplemente espera el tiempo indicado y vuelve a intentar."),
                ("subtitulo", "Verificar conexión"),
                ("texto", "Si no logras iniciar sesión y sospechas que es un problema de red (no de contraseña), usa el botón 'Verificar Conexión' en la pantalla de Login — te dirá específicamente si el problema es la conexión al servidor.")
            };

            contenido["Incidencias"] = new List<(string, string)>
            {
                ("titulo", "📝 Gestión de Incidencias"),
                ("texto", "Este es el módulo principal del sistema. Aquí puedes ver, crear y resolver los tickets (problemas) reportados."),
                ("subtitulo", "Crear una nueva incidencia"),
                ("texto", "Presiona 'Nuevo', llena los datos (Empleado que reporta, Área, Prioridad, etc.) y presiona 'Guardar'. Si asignas un Técnico al momento de crearla, el sistema le enviará una notificación a su Telegram automáticamente (si lo tiene vinculado)."),
                ("subtitulo", "Filtros rápidos y avanzados"),
                ("texto", "Puedes usar la barra superior para buscar un ticket por número (ej. '00010'), o usar el botón 'Filtros' abajo a la derecha para búsquedas complejas (ej. 'Mostrar todas las incidencias de prioridad Alta del mes pasado')."),
                ("subtitulo", "Exportar información"),
                ("texto", "Con los botones azules puedes descargar la lista de incidencias en un reporte PDF o en una hoja de Excel, ideal para reportes semanales.")
            };

            contenido["Usuarios"] = new List<(string, string)>
            {
                ("titulo", "👥 Gestión de Usuarios"),
                ("texto", "Aquí se administran las cuentas de acceso al sistema (solo visible para Administradores)."),
                ("subtitulo", "Crear usuarios"),
                ("texto", "Para crear un usuario, llena sus datos personales y asígnale un Rol (Administrador o Técnico). Al guardar, el sistema le autogenerará una contraseña segura (ej. 'Admin123*') que luego el usuario deberá cambiar."),
                ("subtitulo", "Restablecer contraseñas"),
                ("texto", "Si un usuario olvidó su contraseña, selecciónalo y presiona 'Restablecer Contraseña'. El sistema generará una clave temporal al azar, se la copias y se la envías por interno. El sistema le exigirá que la cambie apenas inicie sesión."),
                ("subtitulo", "Protecciones de seguridad"),
                ("texto", "El sistema no permite eliminar ni desactivar al último Administrador activo (evita que la organización se quede sin nadie que administre), ni que un Administrador elimine su propia cuenta por accidente.")
            };

            contenido["Areas"] = new List<(string, string)>
            {
                ("titulo", "🏢 Gestión de Áreas"),
                ("texto", "Catálogo de las áreas o departamentos de la organización (ej. Tecnología, Finanzas, Talento Humano). Cada incidencia debe pertenecer a un área, lo que permite generar estadísticas de qué áreas reportan más problemas."),
                ("subtitulo", "Restricción importante"),
                ("texto", "No se puede eliminar un área que ya tenga incidencias asociadas — el sistema te va a avisar si intentas hacerlo. Esto protege el historial: si pudieras borrar un área con tickets, esos tickets quedarían huérfanos.")
            };

            contenido["Guias"] = new List<(string, string)>
            {
                ("titulo", "📖 Guías de Ayuda"),
                ("texto", "Catálogo de soluciones rápidas a problemas comunes y repetitivos, para que cualquier empleado pueda resolver algo simple por su cuenta sin necesidad de abrir un ticket y esperar a un técnico."),
                ("subtitulo", "Enviar el catálogo por correo"),
                ("texto", "Escribe un correo de destino en el campo correspondiente y presiona 'Enviar por Correo' — el sistema arma un PDF con todas las guías registradas y lo manda como adjunto. Útil para distribuir las guías a un área completa de una sola vez.")
            };

            contenido["Dashboard"] = new List<(string, string)>
            {
                ("titulo", "📊 Dashboard"),
                ("texto", "Panel de métricas para tener una vista rápida del estado general del sistema, sin tener que revisar incidencia por incidencia."),
                ("subtitulo", "Las 4 tarjetas superiores"),
                ("texto", "Total (todas las incidencias en el rango seleccionado), Pendientes, Resueltas, y Tiempo Promedio de resolución (calculado solo sobre las incidencias que ya tienen fecha de solución)."),
                ("subtitulo", "Las 3 pestañas del gráfico"),
                ("texto", "Por Estado, Por Prioridad, y Por Área — cada una desglosa las incidencias del período seleccionado según esa categoría, para identificar patrones (ej. ¿qué área genera más tickets?)."),
                ("subtitulo", "Filtro de fecha"),
                ("texto", "El menú desplegable arriba permite ver Todo el histórico, Hoy, Últimos 7/30 días, Este mes, o un rango Personalizado.")
            };

            contenido["Bot"] = new List<(string, string)>
            {
                ("titulo", "🤖 Bot de Telegram"),
                ("texto", "El sistema tiene un asistente de Telegram que permite interactuar con algunas funciones desde tu celular."),
                ("subtitulo", "Vincular tu cuenta"),
                ("texto", "Busca el bot en Telegram y envíale el comando:\n\n/registrar tu_usuario tu_contraseña\n\nUna vez vinculado, tu chat de Telegram queda asociado a tu cuenta del sistema, y aparecerá como 'Vinculado' en tu Perfil.")
            };

            contenido["Perfil"] = new List<(string, string)>
            {
                ("titulo", "👤 Mi Perfil"),
                ("texto", "Aquí puedes ver y actualizar tu propia información, sin necesidad de pedirle nada al Administrador."),
                ("subtitulo", "Datos editables"),
                ("texto", "Nombre, Apellido y Correo. El Usuario y Rol son de solo lectura — esos solo los puede cambiar el Administrador."),
                ("subtitulo", "Foto de perfil"),
                ("texto", "'Cambiar Foto' abre un explorador de archivos para subir una imagen nueva (se ajusta automáticamente). 'Quitar Foto' regresa al ícono genérico por defecto."),
                ("subtitulo", "Cambiar tu contraseña"),
                ("texto", "Necesitas escribir tu contraseña ACTUAL correctamente antes de poder ponerte una nueva — esto evita que alguien cambie tu contraseña si dejaste la sesión abierta sin querer.")
            };
        }
    }
}
