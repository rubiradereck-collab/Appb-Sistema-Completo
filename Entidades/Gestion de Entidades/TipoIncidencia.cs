namespace Entidades.Gestion_de_Entidades
{
    /// <summary>Catálogo de tipos de incidencia (Hardware, Software, Red...).</summary>
    public class TipoIncidencia
    {
        public TipoIncidencia()
        {
            Activo = true;
        }

        public TipoIncidencia(int idTipoIncidencia, string nombre, bool activo, int totalIncidencias = 0)
        {
            IdTipoIncidencia = idTipoIncidencia;
            Nombre = nombre;
            Activo = activo;
            TotalIncidencias = totalIncidencias;
        }

        public int IdTipoIncidencia { get; set; }
        public string Nombre { get; set; }

        /// <summary>Los inactivos no se ofrecen al reportar, pero se conservan en los tickets antiguos.</summary>
        public bool Activo { get; set; }

        /// <summary>Cuántos tickets usan este tipo (solo lectura, viene del listado).</summary>
        public int TotalIncidencias { get; set; }
    }
}
