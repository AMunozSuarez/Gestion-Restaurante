using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Win32;
using PrintingService.Models;

namespace PrintingService
{
    public class PrinterManager
    {
        private List<PrinterInfo> printers;

        public PrinterManager()
        {
            printers = new List<PrinterInfo>();
            DiscoverPrinters();
        }

        public void DiscoverPrinters()
        {
            printers.Clear();
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Print\Printers");
                if (key != null)
                {
                    foreach (var name in key.GetSubKeyNames())
                    {
                        printers.Add(new PrinterInfo { PrinterName = name, Status = "Available" });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error enumerating printers: {ex.Message}");
            }
        }

        public List<PrinterInfo> GetAvailablePrinters()
        {
            DiscoverPrinters();
            return printers;
        }

        public PrinterInfo? GetPrinterByName(string printerName)
        {
            return printers.FirstOrDefault(p => p.PrinterName.Equals(printerName, StringComparison.OrdinalIgnoreCase));
        }

        public void AddPrinter(PrinterInfo printer)
        {
            if (printers.Find(p => p.PrinterName == printer.PrinterName) == null)
            {
                printers.Add(printer);
            }
        }
    }
}
