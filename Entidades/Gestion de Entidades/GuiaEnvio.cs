using System;

namespace Entidades.Gestion_de_Entidades
{
    /// <summary>Un envío de guías por correo (Etapa 3). Se registra cada vez que se envían guías.</summary>
    public class GuiaEnvio
    {
        public const string DestinoCorreo = "Correo";
        public const string DestinoTodos = "Todos";
        public const string DestinoArea = "Area";

        public int IdEnvio { get; set; }
        public DateTime Fecha { get; set; }
        public int? IdUsuario { get; set; }
        public string NombreUsuario { get; set; }
        public string Canal { get; set; }

        /// <summary>Correo (una dirección), Todos (usuarios activos) o Area (usuarios de un área).</summary>
        public string TipoDestino { get; set; }
        public int? IdArea { get; set; }
        public string NombreArea { get; set; }
        public string Destinatarios { get; set; }
        public int TotalDestinatarios { get; set; }
        public int TotalGuias { get; set; }

        /// <summary>Títulos de las guías enviadas, separados por " | ".</summary>
        public string Guias { get; set; }
    }
}
