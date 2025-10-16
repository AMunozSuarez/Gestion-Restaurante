using System;
using System.Drawing;
using System.Drawing.Printing;
using System.Threading.Tasks;
using PrintingService.Models;

namespace PrintingService
{
    public class PrintService
    {
        private readonly PrinterManager _printerManager;

        public PrintService()
        {
            _printerManager = new PrinterManager();
        }

        public Task StartAsync()
        {
            _printerManager.DiscoverPrinters();
            Console.WriteLine($"Print service started. Found {_printerManager.GetAvailablePrinters().Count} printers.");
            return Task.CompletedTask;
        }

        public Task StopAsync()
        {
            Console.WriteLine("Print service stopped.");
            return Task.CompletedTask;
        }

        public PrinterManager GetPrinterManager()
        {
            return _printerManager;
        }

        public async Task<bool> PrintAsync(PrintJob job)
        {
            if (job == null)
                throw new ArgumentNullException(nameof(job));

            if (string.IsNullOrEmpty(job.Content))
                throw new ArgumentException("Content cannot be empty", nameof(job));

            var printer = _printerManager.GetPrinterByName(job.PrinterName ?? string.Empty);
            if (printer == null)
            {
                // Si no se especifica impresora, usar la predeterminada
                var printers = _printerManager.GetAvailablePrinters();
                if (printers.Count == 0)
                    throw new InvalidOperationException("No printers available");
                
                printer = printers[0];
            }

            return await Task.Run(() =>
            {
                try
                {
                    using (var printDocument = new PrintDocument())
                    {
                        printDocument.PrinterSettings.PrinterName = printer.PrinterName;
                        printDocument.PrinterSettings.Copies = (short)job.Copies;

                        printDocument.PrintPage += (sender, e) =>
                        {
                            if (e.Graphics == null) return;

                            // Configuración para impresoras térmicas de tickets (80mm)
                            float yPos = 0;
                            float leftMargin = 0;
                            Font printFont = new Font("Courier New", 12, FontStyle.Regular);

                            var lines = job.Content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

                            foreach (var line in lines)
                            {
                                e.Graphics.DrawString(line, printFont, Brushes.Black, leftMargin, yPos);
                                yPos += printFont.GetHeight(e.Graphics);
                            }

                            printFont.Dispose();
                        };

                        printDocument.Print();
                    }
                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Print error: {ex.Message}");
                    return false;
                }
            });
        }
    }
}