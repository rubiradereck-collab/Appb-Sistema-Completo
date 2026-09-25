using System.Drawing;
using System.Windows.Forms;

namespace Presentacion
{
    public static class TemaModerno
    {
        public static Color ColorPrimario = Color.FromArgb(21, 50, 80);      
        public static Color ColorSecundario = Color.FromArgb(21, 101, 192); // Azul corporativo
        public static Color ColorPeligro = Color.FromArgb(231, 76, 60);     // Rojo
        public static Color ColorExito = Color.FromArgb(39, 174, 96);       // Verde esmeralda (Guardar)
        public static Color ColorFondo = Color.White;
        public static Color ColorFondoPanel = Color.FromArgb(235, 238, 243); 
        public static Color ColorGrisClaro = Color.FromArgb(243, 244, 246);
        public static Color ColorTexto = Color.FromArgb(40, 40, 40);         
        public static Color ColorBordes = Color.FromArgb(200, 200, 200);

        public static void Aplicar(Form formulario)
        {
            bool esFormPrincipal = formulario.Name == "FrmPrincipal" || formulario.Name == "FrmLogin";

            foreach (Control ctrl in formulario.Controls)
            {
                AplicarAControl(ctrl, !esFormPrincipal);
            }
        }

        private static void AplicarAControl(Control ctrl, bool forzarFondoClaro)
        {
            if (ctrl.HasChildren)
            {
                foreach (Control hijo in ctrl.Controls)
                {
                    AplicarAControl(hijo, forzarFondoClaro);
                }
            }

            if (ctrl is Button btn)
            {
                btn.FlatStyle = FlatStyle.Flat;
                btn.FlatAppearance.BorderSize = 0;
                btn.Cursor = Cursors.Hand;
                
                if (forzarFondoClaro)
                {
                    Color colorFondo = ColorSecundario;
                    string n = btn.Name.ToLower() + " " + btn.Text.ToLower();
                    
                    // Solo Guardar (y Crear) en Verde, Eliminar (y Quitar) en Rojo
                    if (n.Contains("eliminar") || n.Contains("cancelar") || n.Contains("cerrar") || n.Contains("quitar"))
                    {
                        colorFondo = ColorPeligro;
                    }
                    else if (n.Contains("guardar") || n.Contains("crear") || n.Contains("cambiar"))
                    {
                        colorFondo = ColorExito;
                    }
                    
                    btn.BackColor = colorFondo;
                    btn.ForeColor = Color.White;

                    // Dibujar esquinas redondeadas mágicamente
                    btn.Paint += (s, e) =>
                    {
                        Button b = (Button)s;
                        e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                        
                        System.Drawing.Drawing2D.GraphicsPath path = new System.Drawing.Drawing2D.GraphicsPath();
                        int radio = 14; 
                        Rectangle rect = new Rectangle(0, 0, b.Width, b.Height);
                        path.AddArc(rect.X, rect.Y, radio, radio, 180, 90);
                        path.AddArc(rect.Width - radio, rect.Y, radio, radio, 270, 90);
                        path.AddArc(rect.Width - radio, rect.Height - radio, radio, radio, 0, 90);
                        path.AddArc(rect.X, rect.Height - radio, radio, radio, 90, 90);
                        path.CloseFigure();
                        
                        b.Region = new Region(path);

                        using (SolidBrush brush = new SolidBrush(b.BackColor))
                        {
                            e.Graphics.FillPath(brush, path);
                        }

                        TextRenderer.DrawText(e.Graphics, b.Text, b.Font, rect, b.ForeColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                    };

                    btn.MouseEnter += (s, e) => { btn.BackColor = ControlPaint.Light(colorFondo, 0.2f); };
                    btn.MouseLeave += (s, e) => { btn.BackColor = colorFondo; };
                }
                else 
                {
                    Color colorOriginal = btn.BackColor;
                    btn.MouseEnter += (s, e) => { btn.BackColor = Color.FromArgb(43, 107, 154); };
                    btn.MouseLeave += (s, e) => { btn.BackColor = colorOriginal; };
                }
            }

            else if (ctrl is DataGridView grid)
            {
                grid.BackgroundColor = ColorFondo;
                grid.BorderStyle = BorderStyle.None;
                grid.CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal;
                grid.GridColor = ColorBordes;
                grid.RowHeadersVisible = false;
                grid.AllowUserToResizeRows = false;
                grid.EnableHeadersVisualStyles = false;

                grid.DefaultCellStyle.ForeColor = ColorTexto;
                grid.DefaultCellStyle.BackColor = ColorFondo;
                grid.DefaultCellStyle.SelectionBackColor = Color.FromArgb(235, 244, 250);
                grid.DefaultCellStyle.SelectionForeColor = ColorPrimario;
                grid.DefaultCellStyle.Padding = new Padding(5, 0, 0, 0);

                grid.ColumnHeadersBorderStyle = DataGridViewHeaderBorderStyle.None;
                grid.ColumnHeadersDefaultCellStyle.BackColor = ColorFondo;
                grid.ColumnHeadersDefaultCellStyle.ForeColor = ColorPrimario;
                grid.ColumnHeadersDefaultCellStyle.Padding = new Padding(5, 10, 5, 10);
                grid.ColumnHeadersDefaultCellStyle.SelectionBackColor = ColorFondo;
                grid.ColumnHeadersDefaultCellStyle.SelectionForeColor = ColorPrimario;

                grid.AlternatingRowsDefaultCellStyle.BackColor = ColorFondo;

                grid.RowTemplate.Height = 40;
                grid.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing;
                grid.ColumnHeadersHeight = 45;
            }

            else if (ctrl is TextBox txt)
            {
                txt.BorderStyle = BorderStyle.FixedSingle;
            }
            else if (ctrl is ComboBox cmb)
            {
                cmb.FlatStyle = FlatStyle.Flat; 
            }
        }
    }
}
