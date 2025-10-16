using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace PrintingService
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var builder = Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = "Restaurant Print Service";
                })
                .ConfigureServices((hostContext, services) =>
                {
                    services.AddHostedService<PrintingBackgroundService>();
                })
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                });

            await builder.Build().RunAsync();
        }
    }

    public class PrintingBackgroundService : BackgroundService
    {
        private readonly ILogger<PrintingBackgroundService> _logger;
        private PrintService? _printService;
        private ApiServer? _apiServer;

        public PrintingBackgroundService(ILogger<PrintingBackgroundService> logger)
        {
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                _logger.LogInformation("Restaurant Print Service starting...");

                _printService = new PrintService();
                _apiServer = new ApiServer(_printService);

                await _printService.StartAsync();
                await _apiServer.StartAsync(stoppingToken);

                _logger.LogInformation("Restaurant Print Service is running.");
                _logger.LogInformation("API available at http://localhost:8088/");

                // Mantener el servicio corriendo
                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Service is shutting down...");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while running the service");
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Restaurant Print Service stopping...");

            if (_apiServer != null)
                await _apiServer.StopAsync();

            if (_printService != null)
                await _printService.StopAsync();

            await base.StopAsync(cancellationToken);

            _logger.LogInformation("Restaurant Print Service stopped.");
        }
    }
}