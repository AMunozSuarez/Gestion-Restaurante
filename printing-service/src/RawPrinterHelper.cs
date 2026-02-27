using System;
using System.Runtime.InteropServices;

namespace PrintingService
{
    public static class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        private class DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName = "Ticket";
            [MarshalAs(UnmanagedType.LPStr)] public string? pOutputFile = null;
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType = "RAW";
        }

        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true)]
        private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
        private static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true)]
        private static extern bool StartDocPrinter(IntPtr hPrinter, int level,
            [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
        private static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
        private static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
        private static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
        private static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        public static void SendRawBytes(string printerName, byte[] data)
        {
            if (!OpenPrinter(printerName.Trim(), out IntPtr hPrinter, IntPtr.Zero))
                throw new Exception($"OpenPrinter failed for '{printerName}' (Win32 error: {Marshal.GetLastWin32Error()})");

            try
            {
                var di = new DOCINFOA();
                if (!StartDocPrinter(hPrinter, 1, di))
                    throw new Exception($"StartDocPrinter failed (Win32 error: {Marshal.GetLastWin32Error()})");

                if (!StartPagePrinter(hPrinter))
                {
                    EndDocPrinter(hPrinter);
                    throw new Exception($"StartPagePrinter failed (Win32 error: {Marshal.GetLastWin32Error()})");
                }

                IntPtr pData = Marshal.AllocCoTaskMem(data.Length);
                try
                {
                    Marshal.Copy(data, 0, pData, data.Length);
                    if (!WritePrinter(hPrinter, pData, data.Length, out int written))
                        throw new Exception($"WritePrinter failed (Win32 error: {Marshal.GetLastWin32Error()})");
                    Console.WriteLine($"WritePrinter OK: {written} bytes sent to '{printerName}'");
                }
                finally
                {
                    Marshal.FreeCoTaskMem(pData);
                    EndPagePrinter(hPrinter);
                    EndDocPrinter(hPrinter);
                }
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
    }
}
