using System;
using System.Collections.Generic;
using System.Drawing.Printing;
using System.Linq;
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
            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                printers.Add(new PrinterInfo { PrinterName = printer, Status = "Available" });
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
            if (!printers.Exists(p => p.PrinterName == printer.PrinterName))
            {
                printers.Add(printer);
            }
        }
    }
}