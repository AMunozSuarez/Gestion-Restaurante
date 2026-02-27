using System;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using PrintingService.Models;

namespace PrintingService
{
    public class ApiServer
    {
        private readonly PrintService _printService;
        private HttpListener? _listener;
        private CancellationTokenSource? _cts;
        private readonly string _url = "http://localhost:8088/";

        public ApiServer(PrintService printService)
        {
            _printService = printService;
        }

        public async Task StartAsync(CancellationToken cancellationToken = default)
        {
            _listener = new HttpListener();
            _listener.Prefixes.Add(_url);
            _listener.Start();
            _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

            Console.WriteLine($"API Server listening on {_url}");

            _ = Task.Run(async () =>
            {
                while (!_cts.Token.IsCancellationRequested)
                {
                    try
                    {
                        var context = await _listener.GetContextAsync();
                        _ = Task.Run(() => HandleRequestAsync(context), _cts.Token);
                    }
                    catch (HttpListenerException) when (_cts.Token.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error handling request: {ex.Message}");
                    }
                }
            }, _cts.Token);

            await Task.CompletedTask;
        }

        public Task StopAsync()
        {
            _cts?.Cancel();
            _listener?.Stop();
            _listener?.Close();
            Console.WriteLine("API Server stopped.");
            return Task.CompletedTask;
        }

        private async Task HandleRequestAsync(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;

            // CORS headers
            response.AddHeader("Access-Control-Allow-Origin", "*");
            response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.AddHeader("Access-Control-Allow-Headers", "Content-Type");

            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            try
            {
                var path = request.Url?.AbsolutePath ?? "/";

                switch (path)
                {
                    case "/health":
                        await HandleHealthCheck(response);
                        break;

                    case "/printers":
                        if (request.HttpMethod == "GET")
                            await HandleGetPrinters(response);
                        else
                            SendError(response, 405, "Method not allowed");
                        break;

                    case "/print":
                        if (request.HttpMethod == "POST")
                            await HandlePrint(request, response);
                        else
                            SendError(response, 405, "Method not allowed");
                        break;

                    case "/settings":
                        if (request.HttpMethod == "GET")
                            await HandleGetSettings(response);
                        else if (request.HttpMethod == "POST")
                            await HandleSaveSettings(request, response);
                        else
                            SendError(response, 405, "Method not allowed");
                        break;

                    default:
                        SendError(response, 404, "Endpoint not found");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing request: {ex.Message}");
                SendError(response, 500, ex.Message);
            }
        }

        private async Task HandleHealthCheck(HttpListenerResponse response)
        {
            var result = new { status = "ok", timestamp = DateTime.UtcNow };
            await SendJsonResponse(response, result);
        }

        private async Task HandleGetPrinters(HttpListenerResponse response)
        {
            var printers = _printService.GetPrinterManager().GetAvailablePrinters();
            await SendJsonResponse(response, new { printers });
        }

        private async Task HandleGetSettings(HttpListenerResponse response)
        {
            var settings = _printService.GetSettingsManager().GetSettings();
            await SendJsonResponse(response, settings);
        }

        private async Task HandleSaveSettings(HttpListenerRequest request, HttpListenerResponse response)
        {
            using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
            var body = await reader.ReadToEndAsync();

            var settings = JsonSerializer.Deserialize<PrintSettings>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (settings == null)
            {
                SendError(response, 400, "Invalid settings");
                return;
            }

            _printService.GetSettingsManager().SaveSettings(settings);
            await SendJsonResponse(response, new { success = true, message = "Settings saved" });
        }

        private async Task HandlePrint(HttpListenerRequest request, HttpListenerResponse response)
        {
            using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
            var body = await reader.ReadToEndAsync();

            var printJob = JsonSerializer.Deserialize<PrintJob>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (printJob == null)
            {
                SendError(response, 400, "Invalid print job");
                return;
            }

            try
            {
                var success = await _printService.PrintAsync(printJob);
                await SendJsonResponse(response, new { success = true, message = "Print job sent successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[HandlePrint] Error: {ex.Message}");
                SendError(response, 500, ex.Message);
            }
        }

        private async Task SendJsonResponse(HttpListenerResponse response, object data)
        {
            response.ContentType = "application/json";
            response.StatusCode = 200;

            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            var buffer = Encoding.UTF8.GetBytes(json);

            response.ContentLength64 = buffer.Length;
            await response.OutputStream.WriteAsync(buffer);
            response.Close();
        }

        private void SendError(HttpListenerResponse response, int statusCode, string message)
        {
            response.StatusCode = statusCode;
            response.ContentType = "application/json";

            var json = JsonSerializer.Serialize(new { error = message });
            var buffer = Encoding.UTF8.GetBytes(json);

            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.Close();
        }
    }
}