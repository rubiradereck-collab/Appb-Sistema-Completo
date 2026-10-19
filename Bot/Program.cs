using Entidades.Gestion_de_Entidades;
using Logica;
using Logica.Gestion_de_Logica;
using Serilog; // NUEVO: Librería de Logs
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Configuration;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;
using Topshelf;

namespace Bot
{
    class Program
    {
        static TelegramBotClient botClient;
        private static readonly ConcurrentDictionary<long, EstadoReportar> conversaciones = new ConcurrentDictionary<long, EstadoReportar>();
        private static readonly ConcurrentDictionary<long, EstadoTecnico> conversacionesTecnicos = new ConcurrentDictionary<long, EstadoTecnico>();
        static CancellationTokenSource cts;

        static void Main(string[] args)
        {
            // 1. Configuración del Sistema de Logs
            string carpetaBase = AppDomain.CurrentDomain.BaseDirectory;
            string rutaLogs = System.IO.Path.Combine(carpetaBase, "logs", "bot_.txt");

            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Information()
                .WriteTo.Console()
                .WriteTo.File(rutaLogs,
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30)
                            .CreateLogger();

            try
            {
                Log.Information("Iniciando el ejecutable del Bot...");

                var rc = HostFactory.Run(x =>
                {
                    // Le decimos a TopShelf que envíe sus reportes a nuestro archivo de Serilog
                    x.UseSerilog();

                    x.Service<BotMotor>(s =>
                    {
                        s.ConstructUsing(name => new BotMotor());
                        s.WhenStarted(tc => tc.Start());
                        s.WhenStopped(tc => tc.Stop());
                    });

                    x.RunAsLocalSystem();
                    x.SetDescription("Servicio en segundo plano del Bot de Telegram para el Sistema de Incidencias");
                    x.SetDisplayName("Incidencias Telegram Bot");
                    x.SetServiceName("IncidenciasTelegramBot");
                });

                var exitCode = (int)Convert.ChangeType(rc, rc.GetTypeCode());
                Environment.ExitCode = exitCode;
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "El servicio del Bot colapsó catastróficamente.");
            }
            finally
            {
                // Asegura que todos los textos se guarden en el archivo antes de cerrar
                Log.CloseAndFlush();
            }
        }

        public class BotMotor
        {
            private static System.Threading.Timer timerReporteMensual;
            private static System.Threading.Timer timerSLA;

            public void Start()
            {
                string token = ConfigurationManager.AppSettings["TelegramBotToken"];
                cts = new CancellationTokenSource();
                botClient = new TelegramBotClient(token, cancellationToken: cts.Token);

                var receiverOptions = new ReceiverOptions
                {
                    AllowedUpdates = Array.Empty<UpdateType>()
                };

                botClient.StartReceiving(
                    updateHandler: HandleUpdateAsync,
                    errorHandler: HandleErrorAsync,
                    receiverOptions: receiverOptions,
                    cancellationToken: cts.Token
                );

                Log.Information("Bot de Telegram conectado y escuchando mensajes correctamente.");
                timerReporteMensual = new System.Threading.Timer(RevisarReporteMensual, null, TimeSpan.Zero, TimeSpan.FromHours(6));
                timerSLA = new System.Threading.Timer(RevisarSLA, null, TimeSpan.FromMinutes(5), TimeSpan.FromHours(1)); 

            }

            public void Stop()
            {
                timerReporteMensual?.Dispose();
                timerSLA?.Dispose();
                cts?.Cancel();
                Log.Information("El Bot fue detenido de forma segura.");
            }
        }
        private static readonly System.Globalization.CultureInfo CulturaEs = new System.Globalization.CultureInfo("es-EC");

        // Revisa cada 6 horas. Si el reporte del mes anterior todavía no se ha enviado, lo envía
        // (sin importar el día): así no se pierde si el bot o el correo fallaron el día 1.
        // La tabla ReportesMensualesEnviados evita que se envíe dos veces.
        private static void RevisarReporteMensual(object state)
        {
            try
            {
                DateTime mesAnterior = DateTime.Today.AddMonths(-1);
                var reporteMensualLN = new ReporteMensualLN();

                if (reporteMensualLN.YaFueEnviado(mesAnterior.Year, mesAnterior.Month))
                    return;

                string nombreMes = CulturaEs.TextInfo.ToTitleCase(mesAnterior.ToString("MMMM yyyy", CulturaEs));

                var admins = new UsuarioLN().ShowUsuario()
                    .Where(u => u.Rol == "Administrador" && u.Estado && !string.IsNullOrWhiteSpace(u.Correo))
                    .ToList();

                if (admins.Count == 0)
                {
                    Log.Warning("Reporte mensual de {Mes}: no hay administradores activos con correo. Se reintentará en 6 horas.", nombreMes);
                    return;
                }

                var todas = new IncidenciaLN().ShowIncidencia();
                DateTime mesPrevio = mesAnterior.AddMonths(-1);

                var incidenciasDelMes = todas
                    .Where(i => i.Fecha.Year == mesAnterior.Year && i.Fecha.Month == mesAnterior.Month)
                    .ToList();
                var incidenciasMesPrevio = todas
                    .Where(i => i.Fecha.Year == mesPrevio.Year && i.Fecha.Month == mesPrevio.Month)
                    .ToList();

                int totalUsuariosActivos = new UsuarioLN().ShowUsuario().Count(u => u.Rol == "Usuario" && u.Estado);

                byte[] pdf = Reportes.IncidenciaReportes.GenerarPdfListado(
                    incidenciasDelMes,
                    $"Reporte Mensual de Incidencias - {nombreMes}",
                    totalUsuariosActivos,
                    incidenciasMesPrevio);

                byte[] excel = Reportes.IncidenciaReportes.GenerarExcelListado(
                    incidenciasDelMes,
                    totalUsuariosActivos,
                    incidenciasMesPrevio);

                var adjuntos = new List<Tuple<byte[], string>>
                {
                    new Tuple<byte[], string>(pdf, $"Reporte_Incidencias_{mesAnterior:yyyyMM}.pdf"),
                    new Tuple<byte[], string>(excel, $"Reporte_Incidencias_{mesAnterior:yyyyMM}.xlsx")
                };

                int resueltas = incidenciasDelMes.Count(i => i.NombreEstado == "Resuelto" || i.NombreEstado == "Cerrado");
                int pendientes = incidenciasDelMes.Count(i => i.NombreEstado == "Pendiente");

                // Etapa 3: SLA cumplido y satisfacción del mes
                var indicadores = new Reportes.MetricasIncidencias();
                Reportes.MetricasHelper.CalcularIndicadoresEtapa3(indicadores, incidenciasDelMes);
                string lineaSla = indicadores.PorcentajeSlaCumplido.HasValue
                    ? $"{indicadores.PorcentajeSlaCumplido.Value:0.#}% ({indicadores.TicketsEvaluadosSla} ticket(s) evaluados)"
                    : "sin tickets resueltos";
                string lineaSatisfaccion = indicadores.SatisfaccionPromedio.HasValue
                    ? $"{indicadores.SatisfaccionPromedio.Value:0.0} de 5 ({indicadores.TotalCalificaciones} respuesta(s))"
                    : "sin respuestas";

                string asunto = $"Reporte Mensual de Incidencias - {nombreMes}";
                string cuerpo =
                    "Estimado(a) administrador(a):\n\n" +
                    $"Adjunto encontrará el reporte mensual de incidencias correspondiente a {nombreMes} (PDF y Excel).\n\n" +
                    "Resumen:\n" +
                    $"  - Incidencias registradas: {incidenciasDelMes.Count} (mes anterior: {incidenciasMesPrevio.Count})\n" +
                    $"  - Resueltas o cerradas: {resueltas}\n" +
                    $"  - Pendientes: {pendientes}\n" +
                    $"  - SLA cumplido: {lineaSla}\n" +
                    $"  - Satisfacción: {lineaSatisfaccion}\n\n" +
                    "Este correo fue generado automáticamente por el Sistema de Incidencias APPB.\n" +
                    "Unidad de Tecnología - Autoridad Portuaria de Puerto Bolívar";

                int enviados = 0;
                foreach (var admin in admins)
                {
                    try
                    {
                        CorreoService.EnviarCorreoConAdjuntos(admin.Correo, asunto, cuerpo, adjuntos);
                        enviados++;
                    }
                    catch (Exception exCorreo)
                    {
                        Log.Error(exCorreo, "Reporte mensual: no se pudo enviar a {Correo}.", admin.Correo);
                    }
                }

                if (enviados > 0)
                {
                    reporteMensualLN.RegistrarEnvio(mesAnterior.Year, mesAnterior.Month);
                    new AuditoriaLN().Registrar(null, "Bot (automático)", "Enviar reporte mensual", "Reporte", null,
                        $"Reporte de {nombreMes} enviado a {enviados} de {admins.Count} administrador(es).");
                    Log.Information("Reporte mensual de {Mes} enviado a {Enviados} de {Total} administrador(es).", nombreMes, enviados, admins.Count);
                }
                else
                {
                    Log.Warning("Reporte mensual de {Mes}: no se pudo enviar a ningún administrador. Se reintentará en 6 horas.", nombreMes);
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error al generar/enviar el reporte mensual automático.");
            }
        }
        private static void RevisarSLA(object state)
        {
            try
            {
                var slaLN = new SlaLN();
                var incidencias = new IncidenciaLN().ShowIncidencia();
                var usuarios = new UsuarioLN().ShowUsuario();

                // 1. Pendientes: nadie las ha tomado. Se avisa a todos los técnicos (o al asignado).
                var pendientes = incidencias.Where(i => i.NombreEstado == "Pendiente").ToList();
                foreach (var inc in slaLN.ObtenerVencidasSinEscalar(pendientes))
                {
                    string mensaje = $"⚠️ *SLA VENCIDO* ⚠️\n\n" +
                                      $"*Ticket:* {Md(inc.NumeroTicket)}\n" +
                                      $"*Prioridad:* {Md(inc.NombrePrioridad)}\n" +
                                      $"*Lleva:* {(DateTime.Now - inc.Fecha).TotalHours:0.#} horas sin resolverse.\n" +
                                      $"*Área:* {Md(inc.NombreArea)}\n\n" +
                                      $"*Descripción:*\n{Md(inc.Descripcion)}";

                    List<Usuario> destinatarios = inc.IdTecnicoAsignado.HasValue
                        ? usuarios.Where(u => u.IdUsuario == inc.IdTecnicoAsignado.Value && u.TelegramChatId.HasValue).ToList()
                        : usuarios.Where(u => u.Rol == "Técnico" && u.Estado && u.TelegramChatId.HasValue).ToList();

                    EnviarATodos(destinatarios, mensaje, "SLA vencido");
                    slaLN.MarcarEscalado(inc.IdIncidencia);
                    Log.Information("SLA vencido notificado para el ticket {Ticket}", inc.NumeroTicket);
                }

                // 2. En Proceso (Etapa 2): el técnico asignado se pasó del tiempo. Se avisa a él
                //    y a los administradores, que pueden reasignar el ticket.
                var enProceso = incidencias.Where(i => i.NombreEstado == "En Proceso").ToList();
                foreach (var inc in slaLN.ObtenerVencidasEnProcesoSinEscalar(enProceso))
                {
                    DateTime desde = SlaLN.InicioConteo(inc, true);
                    string mensaje = $"⏳ *SLA VENCIDO (En Proceso)* ⏳\n\n" +
                                      $"*Ticket:* {Md(inc.NumeroTicket)}\n" +
                                      $"*Técnico:* {Md(inc.TecnicoAsignado ?? "Sin asignar")}\n" +
                                      $"*Prioridad:* {Md(inc.NombrePrioridad)}\n" +
                                      $"*Lleva:* {(DateTime.Now - desde).TotalHours:0.#} horas en proceso.\n" +
                                      $"*Área:* {Md(inc.NombreArea)}\n\n" +
                                      $"*Descripción:*\n{Md(inc.Descripcion)}";

                    var destinatarios = usuarios
                        .Where(u => u.Estado && u.TelegramChatId.HasValue &&
                                    (u.IdUsuario == inc.IdTecnicoAsignado || u.Rol == "Administrador"))
                        .ToList();

                    EnviarATodos(destinatarios, mensaje, "SLA en proceso vencido");
                    slaLN.MarcarEscalado(inc.IdIncidencia, enProceso: true);
                    Log.Information("SLA en proceso vencido notificado para el ticket {Ticket}", inc.NumeroTicket);
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error al revisar los SLA vencidos.");
            }
        }

        private static void EnviarATodos(List<Usuario> destinatarios, string mensajeMarkdown, string motivo)
        {
            foreach (var destinatario in destinatarios)
            {
                try
                {
                    if (TelegramNotificador.EnviarMensaje(destinatario.TelegramChatId.Value, mensajeMarkdown) == null)
                        Log.Warning("Telegram rechazó el aviso de {Motivo} para {Usuario}.", motivo, destinatario.Nombre);
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Error notificando {Motivo} a {Usuario}", motivo, destinatario.Nombre);
                }
            }
        }

        // ==========================================
        // UTILIDADES (Etapa 2)
        // ==========================================

        /// <summary>
        /// Escapa el texto que escriben los usuarios (descripción, nombres, observaciones) para el
        /// Markdown de Telegram. Sin esto, un "_" o un "*" en la descripción hacía que Telegram
        /// rechazara el mensaje completo y el técnico no recibía el aviso.
        /// </summary>
        static string Md(string texto)
        {
            if (string.IsNullOrEmpty(texto)) return texto ?? "";
            var sb = new System.Text.StringBuilder(texto.Length + 8);
            foreach (char c in texto)
            {
                if (c == '_' || c == '*' || c == '`' || c == '[') sb.Append('\\');
                sb.Append(c);
            }
            return sb.ToString();
        }

        /// <summary>Avisa (texto plano) a quien reportó el ticket, si tiene Telegram vinculado.</summary>
        static async Task NotificarReportante(int idIncidencia, string texto, long? excepto = null, InlineKeyboardMarkup teclado = null)
        {
            try
            {
                var inc = new IncidenciaLN().ShowIncidencia().FirstOrDefault(i => i.IdIncidencia == idIncidencia);
                if (inc == null) return;

                var usuarios = new UsuarioLN().ShowUsuario();
                Usuario reportante = inc.IdUsuarioReporta.HasValue
                    ? usuarios.FirstOrDefault(u => u.IdUsuario == inc.IdUsuarioReporta.Value)
                    : usuarios.FirstOrDefault(u => IncidenciaLN.EsDelUsuario(inc, u));

                if (reportante?.TelegramChatId == null || !reportante.Estado || reportante.TelegramChatId == excepto) return;

                await botClient.SendMessage(reportante.TelegramChatId.Value, texto, replyMarkup: teclado);
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "No se pudo avisar al reportante del ticket {Id}.", idIncidencia);
            }
        }

        /// <summary>Etapa 3: botones de la encuesta de satisfacción (1 a 5).</summary>
        static InlineKeyboardMarkup TecladoEncuesta(int idIncidencia)
        {
            return new InlineKeyboardMarkup(new[]
            {
                Enumerable.Range(1, 5)
                    .Select(n => InlineKeyboardButton.WithCallbackData($"{n} ⭐", $"cal_{idIncidencia}_{n}"))
                    .ToArray()
            });
        }

        /// <summary>Etapa 3: respuesta a la encuesta (botón cal_ID_N).</summary>
        static async Task ProcesarCalificacion(CallbackQuery callbackQuery)
        {
            long chatId = callbackQuery.Message.Chat.Id;
            string[] partes = callbackQuery.Data.Split('_');
            if (partes.Length != 3 || !int.TryParse(partes[1], out int idIncidencia) || !int.TryParse(partes[2], out int nota))
            {
                await botClient.AnswerCallbackQuery(callbackQuery.Id);
                return;
            }

            var usuario = new UsuarioLN().BuscarPorChatId(chatId);
            string resultado = new IncidenciaLN().Calificar(idIncidencia, usuario, nota);

            if (resultado == "OK")
            {
                await botClient.AnswerCallbackQuery(callbackQuery.Id, "¡Gracias por tu respuesta!");
                Log.Information("Ticket {Id} calificado con {Nota} desde Telegram.", idIncidencia, nota);
                try
                {
                    await botClient.EditMessageText(chatId, callbackQuery.Message.MessageId,
                        callbackQuery.Message.Text + $"\n\n✅ Calificaste la atención con {nota} de 5. ¡Gracias!");
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "No se pudo actualizar el mensaje de la encuesta.");
                }
            }
            else
            {
                await botClient.AnswerCallbackQuery(callbackQuery.Id, resultado, showAlert: true);
                try { await botClient.EditMessageReplyMarkup(chatId, callbackQuery.Message.MessageId, replyMarkup: null); }
                catch { /* el mensaje pudo haberse editado ya */ }
            }
        }

        static string EmojiTipo(string nombre)
        {
            switch ((nombre ?? "").Trim().ToLowerInvariant())
            {
                case "hardware": return "💻";
                case "software": return "📀";
                case "red": return "🌐";
                case "otro": return "➕";
                default: return "🏷️";
            }
        }

        // ==========================================
        // ENRUTADORES CENTRALES
        // ==========================================
        static async Task HandleUpdateAsync(ITelegramBotClient cliente, Update update, CancellationToken ct)
        {
            try
            {
                if (update.Type == UpdateType.Message && update.Message?.Text != null)
                {
                    await OnMessage(update.Message, update.Type);
                }
                else if (update.Type == UpdateType.CallbackQuery && update.CallbackQuery != null)
                {
                    await OnCallbackQuery(update.CallbackQuery);
                }
            }
            catch (Exception ex)
            {
                // Guardamos el error real en el archivo de texto
                Log.Error(ex, "Error crítico procesando una actualización de Telegram.");
            }
        }

        static Task HandleErrorAsync(ITelegramBotClient cliente, Exception exception, CancellationToken ct)
        {
            Log.Error(exception, "Error de comunicación con la API de Telegram.");
            return Task.CompletedTask;
        }

        // ==========================================
        // EVENTOS (MENSAJES Y BOTONES)
        // ==========================================
        static async Task OnMessage(Message msg, UpdateType type)
        {
            long chatId = msg.Chat.Id;
            string texto = msg.Text.Trim();

            // Nunca registrar el texto completo: /registrar lleva la contraseña del usuario.
            // Solo se guarda el comando (primera palabra) o la longitud del texto libre.
            string comandoParaLog = texto.StartsWith("/") ? texto.Split(' ')[0].ToLower() : $"(texto libre, {texto.Length} caracteres)";
            Log.Information("El chat [{ChatId}] envió: {Comando}", chatId, comandoParaLog);

            if (conversaciones.TryGetValue(chatId, out _))
            {
                if (texto.ToLower() == "/cancelar")
                {
                    conversaciones.TryRemove(chatId, out _);
                    await botClient.SendMessage(chatId, "❌ Reporte cancelado.");
                    return;
                }

                await ContinuarReportar(chatId, texto);
                return;
            }

            if (conversacionesTecnicos.TryGetValue(chatId, out var estadoTec))
            {
                await FinalizarEstadoTicket(chatId, estadoTec.IdIncidencia, estadoTec.NuevoEstado, texto);
                conversacionesTecnicos.TryRemove(chatId, out _);

                try
                {
                    await botClient.DeleteMessage(chatId, estadoTec.MessageIdPrompt);
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Error al borrar el mensaje de solicitud de observación.");
                }

                return;
            }

            string[] partes = texto.Split(' ');
            string comando = partes[0].ToLower();

            switch (comando)
            {
                case "/registrar":
                    await ManejarRegistrar(msg, partes);
                    break;
                case "/reportar":
                    await IniciarReportar(chatId);
                    break;
                case "/estado":
                    await ManejarEstado(chatId, partes);
                    break;
                default:
                    await botClient.SendMessage(chatId, "Comando no reconocido. Usa /registrar, /reportar o /estado.");
                    break;
            }
        }

        static async Task OnCallbackQuery(CallbackQuery callbackQuery)
        {
            long chatId = callbackQuery.Message.Chat.Id;
            string datosBoton = callbackQuery.Data;

            Log.Information("El chat [{ChatId}] presionó el botón interactivo: {DatosBoton}", chatId, datosBoton);

            // --- 1. PROCESAR BOTÓN DE ACEPTAR TICKET ---
            if (datosBoton.StartsWith("aceptar_"))
            {
                int idIncidencia = int.Parse(datosBoton.Split('_')[1]);
                var logica = new Logica.Gestion_de_Logica.IncidenciaLN();

                bool incidenciaExiste = logica.ShowIncidencia().Any(i => i.IdIncidencia == idIncidencia);
                if (!incidenciaExiste)
                {
                    await botClient.AnswerCallbackQuery(callbackQuery.Id, "❌ Esta incidencia ya no existe (fue eliminada desde el sistema).", showAlert: true);
                    await botClient.EditMessageText(chatId: chatId, messageId: callbackQuery.Message.MessageId, text: Md(callbackQuery.Message.Text) + "\n\n🗑️ *(Este ticket fue eliminado del sistema)*", parseMode: ParseMode.Markdown);
                    return;
                }

                string resultado = logica.AceptarIncidenciaPorTelegram(idIncidencia, chatId);

                if (resultado == "SUCCESS")
                {
                    await botClient.AnswerCallbackQuery(callbackQuery.Id, "¡Ticket asignado a ti correctamente!", showAlert: false);

                    var inc = logica.BuscarPorTicket(logica.ShowIncidencia().FirstOrDefault(i => i.IdIncidencia == idIncidencia)?.NumeroTicket);
                    string textoBase = $"🚨 *NUEVA INCIDENCIA REPORTADA* 🚨\n\n*Ticket:* {Md(inc.NumeroTicket)}\n*Empleado:* {Md(inc.Empleado)}\n*Área:* {Md(inc.NombreArea)}\n*Tipo:* {Md(inc.TipoIncidencia)}\n*Prioridad:* {Md(inc.NombrePrioridad)}\n\n*Descripción:*\n{Md(inc.Descripcion)}";

                    var mensajesEnviados = logica.ObtenerMensajesTelegram(idIncidencia);

                    var botonesEstado = new InlineKeyboardMarkup(new[] {
                        new[] { InlineKeyboardButton.WithCallbackData("✅ Marcar Resuelto", $"estado_{idIncidencia}_Resuelto") },
                        new[] { InlineKeyboardButton.WithCallbackData("🔒 Cerrar Ticket", $"estado_{idIncidencia}_Cerrado") }
                    });

                    foreach (var m in mensajesEnviados)
                    {
                        try
                        {
                            if (m.ChatId == chatId)
                            {
                                await botClient.EditMessageText(chatId: m.ChatId, messageId: m.MessageId, text: textoBase + "\n\n👉 *¡Aceptaste este ticket y está En Proceso!*", parseMode: ParseMode.Markdown, replyMarkup: botonesEstado);
                            }
                            else
                            {
                                await botClient.EditMessageText(chatId: m.ChatId, messageId: m.MessageId, text: textoBase + $"\n\n🔒 *(Este ticket fue tomado por otro técnico)*", parseMode: ParseMode.Markdown, replyMarkup: null);
                            }
                        }
                        catch (Exception ex)
                        {
                            Log.Error(ex, "Error borrando el botón al técnico con ChatId {ChatId}", m.ChatId);
                        }
                    }

                    // Etapa 2: avisar a quien reportó
                    var tecnicoQueAcepto = new UsuarioLN().BuscarPorChatId(chatId);
                    string nombreTecnico = tecnicoQueAcepto != null ? $"{tecnicoQueAcepto.Nombre} {tecnicoQueAcepto.Apellido}" : "un técnico";
                    await NotificarReportante(idIncidencia,
                        $"🔔 Tu {inc.NumeroTicket} fue asignada a {nombreTecnico} y ya está En Proceso.", excepto: chatId);
                }
                else
                {
                    await botClient.AnswerCallbackQuery(callbackQuery.Id, resultado, showAlert: true);
                    await botClient.EditMessageText(chatId: chatId, messageId: callbackQuery.Message.MessageId, text: callbackQuery.Message.Text + "\n\n🔒 *(Ticket tomado por otro técnico)*");
                }
                return;
            }

            // --- 2. PROCESAR BOTONES DE CAMBIO DE ESTADO ---
            if (datosBoton.StartsWith("estado_"))
            {
                string[] partes = datosBoton.Split('_');
                int idIncidencia = int.Parse(partes[1]);
                string nuevoEstado = partes[2];

                var botonOmitir = new InlineKeyboardMarkup(new[] {
        InlineKeyboardButton.WithCallbackData("⏭️ Omitir observación", "omitir_obs")
    });

                var mensajePrompt = await botClient.SendMessage(chatId, $"Has elegido marcar el ticket como *{nuevoEstado}*.\n\nPor favor, escribe una observación sobre el trabajo realizado:", parseMode: ParseMode.Markdown, replyMarkup: botonOmitir);

                conversacionesTecnicos[chatId] = new EstadoTecnico { IdIncidencia = idIncidencia, NuevoEstado = nuevoEstado, MessageIdPrompt = mensajePrompt.MessageId };

                await botClient.AnswerCallbackQuery(callbackQuery.Id);
                return;
            }

            // NUEVO: Manejar el botón de "Omitir"
            if (datosBoton == "omitir_obs")
            {
                if (conversacionesTecnicos.TryGetValue(chatId, out var estadoTecOmitir))
                {
                    await FinalizarEstadoTicket(chatId, estadoTecOmitir.IdIncidencia, estadoTecOmitir.NuevoEstado, "Sin observaciones detalladas.");
                    conversacionesTecnicos.TryRemove(chatId, out _);
                }
                await botClient.AnswerCallbackQuery(callbackQuery.Id);
                // Borramos el mensaje de "escribe una observación"
                await botClient.DeleteMessage(chatId, callbackQuery.Message.MessageId);
                return;
            }

            // --- Etapa 3: respuesta a la encuesta de satisfacción ---
            if (datosBoton.StartsWith("cal_"))
            {
                await ProcesarCalificacion(callbackQuery);
                return;
            }

            // --- 3. CÓDIGO EXISTENTE DE CREACIÓN DE TICKETS ---
            await botClient.AnswerCallbackQuery(callbackQuery.Id);

            if (datosBoton == "cancelar")
            {
                conversaciones.TryRemove(chatId, out _);
                await botClient.EditMessageText(chatId, callbackQuery.Message.MessageId, "❌ Reporte cancelado.");
                return;
            }

            if (conversaciones.TryGetValue(chatId, out var estado))
            {
                try
                {
                    if (estado.Paso == 1 && datosBoton.StartsWith("area_"))
                    {
                        estado.IdArea = int.Parse(datosBoton.Split('_')[1]);
                        estado.Paso = 2;
                        await botClient.EditMessageText(chatId, callbackQuery.Message.MessageId, "✅ Área seleccionada.");

                        // Etapa 2: los tipos salen del catálogo (solo los activos)
                        var botonesTipo = new TipoIncidenciaLN().ShowTipos(soloActivos: true)
                            .Select(t => new[] { InlineKeyboardButton.WithCallbackData($"{EmojiTipo(t.Nombre)} {t.Nombre}", $"tipo_{t.IdTipoIncidencia}") })
                            .ToList();
                        botonesTipo.Add(new[] { InlineKeyboardButton.WithCallbackData("❌ Cancelar", "cancelar") });

                        await botClient.SendMessage(chatId: chatId, text: "¿Cuál es el tipo de incidencia? *(Toca un botón)*:", parseMode: ParseMode.Markdown, replyMarkup: new InlineKeyboardMarkup(botonesTipo));
                    }
                    else if (estado.Paso == 2 && datosBoton.StartsWith("tipo_"))
                    {
                        int idTipo = int.Parse(datosBoton.Substring(5));
                        var tipo = new TipoIncidenciaLN().ShowTipos(soloActivos: true).FirstOrDefault(t => t.IdTipoIncidencia == idTipo);
                        if (tipo == null)
                        {
                            await botClient.SendMessage(chatId, "Ese tipo ya no está disponible. Elige otro de la lista o escribe /cancelar.");
                            return;
                        }
                        estado.IdTipoIncidencia = tipo.IdTipoIncidencia;
                        estado.TipoIncidencia = tipo.Nombre;
                        estado.Paso = 3;

                        await botClient.EditMessageText(chatId, callbackQuery.Message.MessageId, $"✅ Tipo seleccionado: {estado.TipoIncidencia}");
                        await botClient.SendMessage(chatId, "Describe el problema (mínimo 10 caracteres):");
                    }
                    else if (estado.Paso == 4 && datosBoton.StartsWith("pri_"))
                    {
                        estado.IdPrioridad = int.Parse(datosBoton.Split('_')[1]);
                        await botClient.EditMessageText(chatId, callbackQuery.Message.MessageId, "✅ Prioridad seleccionada.");

                        await FinalizarReportar(chatId, estado);
                        conversaciones.TryRemove(chatId, out _);
                    }
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "Error durante el flujo interactivo de reporte.");
                    conversaciones.TryRemove(chatId, out _);
                    await botClient.SendMessage(chatId, $"Ocurrió un error, el reporte se canceló: {ex.Message}");
                }
            }
        }

        // ==========================================
        // MÉTODOS DE FLUJO (/reportar)
        // ==========================================
        static async Task IniciarReportar(long chatId)
        {
            try
            {
                Usuario usuario = new UsuarioLN().BuscarPorChatId(chatId);

                if (usuario == null)
                {
                    await botClient.SendMessage(chatId, "Primero debes vincular tu cuenta con /registrar usuario contraseña.");
                    return;
                }
                if (!usuario.Estado)
                {
                    await botClient.SendMessage(chatId, "Tu cuenta está desactivada. Comunícate con la Unidad de Tecnología.");
                    return;
                }

                var areas = new AreaLN().ShowArea();
                var botones = new List<InlineKeyboardButton[]>();

                foreach (var area in areas)
                {
                    botones.Add(new[] { InlineKeyboardButton.WithCallbackData(area.NombreArea, $"area_{area.IdArea}") });
                }
                botones.Add(new[] { InlineKeyboardButton.WithCallbackData("❌ Cancelar", "cancelar") });

                conversaciones[chatId] = new EstadoReportar { Paso = 1 };

                await botClient.SendMessage(chatId: chatId, text: "📝 *Vamos a reportar una incidencia.*\n\n¿En qué área ocurrió? *(Toca un botón)*:", parseMode: ParseMode.Markdown, replyMarkup: new InlineKeyboardMarkup(botones));
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error en IniciarReportar");
                await botClient.SendMessage(chatId, $"Error al iniciar el reporte: {ex.Message}");
            }
        }

        static async Task ContinuarReportar(long chatId, string texto)
        {
            if (!conversaciones.TryGetValue(chatId, out var estado))
            {
                await botClient.SendMessage(chatId, "No hay un reporte en curso. Escribe /reportar para iniciar uno.");
                return;
            }

            try
            {
                switch (estado.Paso)
                {
                    case 3:
                        if (texto.Trim().Length < 10)
                        {
                            await botClient.SendMessage(chatId, "La descripción debe tener al menos 10 caracteres. Intenta de nuevo.");
                            return;
                        }

                        estado.Descripcion = texto;
                        estado.Paso = 4;

                        var prioridades = new PrioridadLN().ShowPrioridad();
                        var botonesPri = new List<InlineKeyboardButton[]>();

                        foreach (var pri in prioridades)
                        {
                            botonesPri.Add(new[] { InlineKeyboardButton.WithCallbackData(pri.Nombre, $"pri_{pri.IdPrioridad}") });
                        }
                        botonesPri.Add(new[] { InlineKeyboardButton.WithCallbackData("❌ Cancelar", "cancelar") });

                        await botClient.SendMessage(chatId: chatId, text: "¿Qué prioridad tiene? *(Toca un botón)*:", parseMode: ParseMode.Markdown, replyMarkup: new InlineKeyboardMarkup(botonesPri));
                        break;

                    default:
                        await botClient.SendMessage(chatId, "Por favor, selecciona una opción de los botones o escribe /cancelar.");
                        break;
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error en ContinuarReportar");
                conversaciones.TryRemove(chatId, out _);
                await botClient.SendMessage(chatId, $"Ocurrió un error, el reporte se canceló: {ex.Message}");
            }
        }

        static async Task FinalizarReportar(long chatId, EstadoReportar estado)
        {
            Usuario usuario = new UsuarioLN().BuscarPorChatId(chatId);
            string nombreEmpleado = $"{usuario.Nombre} {usuario.Apellido}";

            Incidencia nueva = new Incidencia(
                0, null, DateTime.Now,
                nombreEmpleado,
                estado.IdArea.Value,
                estado.TipoIncidencia,
                estado.Descripcion,
                estado.IdPrioridad.Value,
                0,
                null, null, null
            );
            nueva.IdTipoIncidencia = estado.IdTipoIncidencia;
            nueva.IdUsuarioReporta = usuario.IdUsuario;

            new IncidenciaLN().InsertIncidencia(nueva, out int idIncidencia);

            Incidencia ultimaInsertada = new IncidenciaLN().ShowIncidencia()
        .FirstOrDefault(i => i.IdIncidencia == idIncidencia);

            string numeroTicket = ultimaInsertada != null ? ultimaInsertada.NumeroTicket : "tu solicitud";

            await botClient.SendMessage(chatId, $"✅ {numeroTicket} reportada correctamente. Un técnico la atenderá pronto.");

            if (ultimaInsertada != null)
            {
                var tecnicos = new UsuarioLN().ShowUsuario()
                    .Where(u => u.Rol == "Técnico" && u.Estado && u.TelegramChatId.HasValue)
                    .ToList();

                string mensajeTecnicos = $"🚨 *NUEVA INCIDENCIA DESDE TELEGRAM* 🚨\n\n" +
                                         $"*Ticket:* {Md(numeroTicket)}\n" +
                                         $"*Empleado:* {Md(ultimaInsertada.Empleado)}\n" +
                                         $"*Área:* {Md(ultimaInsertada.NombreArea)}\n" +
                                         $"*Tipo:* {Md(ultimaInsertada.TipoIncidencia)}\n" +
                                         $"*Prioridad:* {Md(ultimaInsertada.NombrePrioridad)}\n\n" +
                                         $"*Descripción:*\n{Md(ultimaInsertada.Descripcion)}";

                foreach (var tecnico in tecnicos)
                {
                    try
                    {
                        int? messageId = await Bot.TelegramNotificador.EnviarMensajeAsync(tecnico.TelegramChatId.Value, mensajeTecnicos, ultimaInsertada.IdIncidencia);

                        if (messageId.HasValue)
                        {
                            new Logica.Gestion_de_Logica.IncidenciaLN().RegistrarMensajeTelegram(ultimaInsertada.IdIncidencia, tecnico.TelegramChatId.Value, messageId.Value);
                        }
                        else
                        {
                            Log.Warning("Telegram rechazó el aviso de nueva incidencia para {Tecnico}.", tecnico.Nombre);
                        }
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "Error enviando notificación al técnico {Tecnico}", tecnico.Nombre);
                    }
                }
            }
        }

        static async Task FinalizarEstadoTicket(long chatId, int idIncidencia, string nuevoEstado, string observacion)
        {
            try
            {
                var logica = new Logica.Gestion_de_Logica.IncidenciaLN();
                string resultado = logica.CambiarEstadoPorTelegram(idIncidencia, chatId, nuevoEstado, observacion);

                if (resultado.StartsWith("SUCCESS"))
                {
                    await botClient.SendMessage(chatId, $"🏁 *Ticket {nuevoEstado} exitosamente.*\n\n*Observación guardada:*\n{Md(observacion)}", parseMode: ParseMode.Markdown);
                    Log.Information("Técnico [{ChatId}] cambió ticket {Id} a {Estado}.", chatId, idIncidencia, nuevoEstado);

                    // Etapa 2: avisar a quien reportó
                    var ticket = logica.ShowIncidencia().FirstOrDefault(i => i.IdIncidencia == idIncidencia);
                    // Etapa 3: si quedó Resuelto o Cerrado, se pide la calificación
                    bool pedirEncuesta = (nuevoEstado == "Resuelto" || nuevoEstado == "Cerrado") && ticket != null && !ticket.Calificacion.HasValue;
                    string textoAviso = $"ℹ️ Tu {ticket?.NumeroTicket ?? "solicitud"} ahora está {nuevoEstado}.\nObservación del técnico: {observacion}";
                    if (pedirEncuesta) textoAviso += "\n\n¿Cómo calificas la atención? (1 = muy mala, 5 = excelente)";
                    await NotificarReportante(idIncidencia, textoAviso, excepto: chatId,
                        teclado: pedirEncuesta ? TecladoEncuesta(idIncidencia) : null);

                    // Quitar los botones del mensaje original para que no se puedan volver a presionar
                    var mensajeOriginal = logica.ObtenerMensajesTelegram(idIncidencia)
                        .FirstOrDefault(m => m.ChatId == chatId);

                    if (mensajeOriginal != null)
                    {
                        try
                        {
                            await botClient.EditMessageReplyMarkup(chatId, mensajeOriginal.MessageId, replyMarkup: null);
                        }
                        catch (Exception ex)
                        {
                            Log.Error(ex, "Error al quitar los botones del ticket ya resuelto/cerrado.");
                        }
                    }
                }
                else
                {
                    await botClient.SendMessage(chatId, $"❌ No se pudo actualizar el ticket: {resultado}");
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error al guardar observación del técnico");
                await botClient.SendMessage(chatId, "Ocurrió un error al intentar guardar el ticket.");
            }
        }

        // ==========================================
        // OTROS COMANDOS
        // ==========================================
        static async Task ManejarRegistrar(Message msg, string[] partes)
        {
            // El mensaje lleva la contraseña en claro: se borra del chat apenas se lee,
            // tenga o no el formato correcto.
            if (partes.Length > 1)
            {
                try
                {
                    await botClient.DeleteMessage(msg.Chat, msg.MessageId);
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "No se pudo borrar del chat el mensaje de /registrar.");
                }
            }

            if (partes.Length != 3)
            {
                await botClient.SendMessage(msg.Chat, "Uso: /registrar usuario contraseña\n(Por seguridad, el mensaje con tu contraseña se borra automáticamente.)");
                return;
            }

            string usuario = partes[1];
            string password = partes[2];

            try
            {
                bool ok = new UsuarioLN().RegistrarChatTelegram(usuario, password, msg.Chat.Id);
                if (ok)
                {
                    await botClient.SendMessage(msg.Chat, "Cuenta vinculada correctamente. Ya puedes usar /reportar y /estado.");
                    Log.Information("Usuario {Usuario} vinculó su cuenta de Telegram con éxito.", usuario);
                }
            }
            catch (LogicaExcepciones ex)
            {
                await botClient.SendMessage(msg.Chat, $"No se pudo vincular: {ex.Message}");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error inesperado al intentar registrar cuenta de Telegram.");
                await botClient.SendMessage(msg.Chat, "Ocurrió un error inesperado. Intenta más tarde.");
            }
        }

        static async Task ManejarEstado(long chatId, string[] partes)
        {
            try
            {
                Usuario usuario = new UsuarioLN().BuscarPorChatId(chatId);

                if (usuario == null)
                {
                    await botClient.SendMessage(chatId, "Primero debes vincular tu cuenta con /registrar usuario contraseña.");
                    return;
                }

                Incidencia incidencia = null;

                if (partes.Length == 1)
                {
                    incidencia = new IncidenciaLN().ShowIncidenciasDelUsuario(usuario)
                        .OrderByDescending(i => i.IdIncidencia)
                        .FirstOrDefault();

                    if (incidencia == null)
                    {
                        await botClient.SendMessage(chatId, "No tienes ninguna incidencia reportada aún.");
                        return;
                    }
                }
                else if (partes.Length == 2)
                {
                    incidencia = new IncidenciaLN().BuscarPorTicket(partes[1]);

                    // Un usuario solo consulta sus propios tickets (técnicos y administradores, todos)
                    if (incidencia != null && usuario.Rol == "Usuario" && !IncidenciaLN.EsDelUsuario(incidencia, usuario))
                        incidencia = null;

                    if (incidencia == null)
                    {
                        await botClient.SendMessage(chatId, $"No se encontró ningún ticket con el número {partes[1]}.");
                        return;
                    }
                }
                else
                {
                    await botClient.SendMessage(chatId, "Uso rápido: /estado\nPara una específica: /estado Solicitud-0001");
                    return;
                }

                string tecnico = string.IsNullOrWhiteSpace(incidencia.TecnicoAsignado) ? "Sin asignar" : incidencia.TecnicoAsignado;
                string fechaSolucion = incidencia.FechaSolucion.HasValue ? incidencia.FechaSolucion.Value.ToString("dd/MM/yyyy HH:mm") : "N/A";

                string mensaje =
                    $"🎫 {incidencia.NumeroTicket}\n\n" +
                    $"Estado: {incidencia.NombreEstado}\n" +
                    $"Área: {incidencia.NombreArea}\n" +
                    $"Tipo: {incidencia.TipoIncidencia}\n" +
                    $"Prioridad: {incidencia.NombrePrioridad}\n" +
                    $"Técnico: {tecnico}\n" +
                    $"Fecha creación: {incidencia.Fecha:dd/MM/yyyy HH:mm}\n" +
                    $"Fecha solución: {fechaSolucion}";

                await botClient.SendMessage(chatId, mensaje);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error al manejar el comando /estado");
                await botClient.SendMessage(chatId, $"Ocurrió un error al consultar el ticket: {ex.Message}");
            }
        }

        // ==========================================2
        // CLASES AUXILIARES
        // ==========================================
        class EstadoReportar
        {
            public int Paso { get; set; }
            public int? IdArea { get; set; }
            public int? IdTipoIncidencia { get; set; }
            public string TipoIncidencia { get; set; }
            public string Descripcion { get; set; }
            public int? IdPrioridad { get; set; }
        }

        class EstadoTecnico
        {
            public int IdIncidencia { get; set; }
            public string NuevoEstado { get; set; }
            public int MessageIdPrompt { get; set; }
        }
    }
}