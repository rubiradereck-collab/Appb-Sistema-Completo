using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace Logica.Gestion_de_Logica
{
    public class CorreoService
    {
        public static void EnviarCorreoConAdjunto(string destinatario, string asunto, string cuerpo, byte[] adjuntoBytes, string nombreAdjunto)
        {
            var adjuntos = new List<Tuple<byte[], string>> { new Tuple<byte[], string>(adjuntoBytes, nombreAdjunto) };
            EnviarCorreoConAdjuntos(destinatario, asunto, cuerpo, adjuntos);
        }

                public static void EnviarCorreo(string destinatario, string asunto, string cuerpo)
        {
            EnviarCorreoConAdjuntos(destinatario, asunto, cuerpo, null);
        }

        public static void EnviarCorreoConAdjuntos(string destinatario, string asunto, string cuerpo, List<Tuple<byte[], string>> adjuntos)
        {
            string servidor = ConfigurationManager.AppSettings["SmtpServidor"];
            int puerto = int.Parse(ConfigurationManager.AppSettings["SmtpPuerto"]);
            string correo = ConfigurationManager.AppSettings["SmtpCorreo"];
            string password = ConfigurationManager.AppSettings["SmtpPassword"];
            string alias = ConfigurationManager.AppSettings["SmtpAlias"];
            bool ssl = bool.Parse(ConfigurationManager.AppSettings["SmtpSsl"]);
            bool ignorarCertificadoVencido = false;
            bool.TryParse(ConfigurationManager.AppSettings["SmtpIgnorarCertificadoVencido"], out ignorarCertificadoVencido);

            using (MailMessage mensaje = new MailMessage())
            {
                mensaje.From = new MailAddress(correo, alias);
                mensaje.To.Add(destinatario);
                mensaje.Subject = asunto;
                mensaje.Body = cuerpo;
                mensaje.IsBodyHtml = true;

                if (adjuntos != null)
                {
                    foreach (var adjunto in adjuntos)
                    {
                        var ms = new MemoryStream(adjunto.Item1);
                        mensaje.Attachments.Add(new Attachment(ms, adjunto.Item2));
                    }
                }

                using (SmtpClient smtp = new SmtpClient(servidor, puerto))
                {
                    smtp.Credentials = new NetworkCredential(correo, password);
                    smtp.EnableSsl = ssl;

                    if (ignorarCertificadoVencido)
                    {
                        ServicePointManager.ServerCertificateValidationCallback = ConfigurarValidacionCertificado;
                    }

                    smtp.Send(mensaje);
                }
            }
        }

        public static void EnviarCorreoMasivoBcc(List<string> destinatariosBcc, string asunto, string cuerpo, List<string> adjuntosRutas = null)
        {
            if (destinatariosBcc == null || destinatariosBcc.Count == 0) return;

            string servidor = ConfigurationManager.AppSettings["SmtpServidor"];
            int puerto = int.Parse(ConfigurationManager.AppSettings["SmtpPuerto"]);
            string correo = ConfigurationManager.AppSettings["SmtpCorreo"];
            string password = ConfigurationManager.AppSettings["SmtpPassword"];
            string alias = ConfigurationManager.AppSettings["SmtpAlias"];
            bool ssl = bool.Parse(ConfigurationManager.AppSettings["SmtpSsl"]);
            bool ignorarCertificadoVencido = false;
            bool.TryParse(ConfigurationManager.AppSettings["SmtpIgnorarCertificadoVencido"], out ignorarCertificadoVencido);

            using (MailMessage mensaje = new MailMessage())
            {
                mensaje.From = new MailAddress(correo, alias);
                mensaje.To.Add(new MailAddress(correo, alias)); 
                
                foreach (var bcc in destinatariosBcc)
                {
                    if (!string.IsNullOrWhiteSpace(bcc))
                        mensaje.Bcc.Add(bcc);
                }

                mensaje.Subject = asunto;
                mensaje.Body = cuerpo;
                mensaje.IsBodyHtml = true;

                if (adjuntosRutas != null)
                {
                    foreach (var ruta in adjuntosRutas)
                    {
                        if (File.Exists(ruta))
                            mensaje.Attachments.Add(new Attachment(ruta));
                    }
                }

                using (SmtpClient smtp = new SmtpClient(servidor, puerto))
                {
                    smtp.Credentials = new NetworkCredential(correo, password);
                    smtp.EnableSsl = ssl;
                    
                    if (ignorarCertificadoVencido)
                    {
                        ServicePointManager.ServerCertificateValidationCallback = ConfigurarValidacionCertificado;
                    }

                    smtp.Send(mensaje);
                }
            }
        }

        private static bool ConfigurarValidacionCertificado(object sender, X509Certificate certificate, X509Chain chain, SslPolicyErrors sslPolicyErrors)
        {
            return sslPolicyErrors == SslPolicyErrors.None || sslPolicyErrors == SslPolicyErrors.RemoteCertificateChainErrors;
        }
    }
}
