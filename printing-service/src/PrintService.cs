using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using PrintingService.Models;

namespace PrintingService
{
    public class PrintService
    {
        private readonly PrinterManager _printerManager;
        private readonly SettingsManager _settingsManager;

        static PrintService()
        {
            // Required for Encoding.GetEncoding(850) in .NET 6+
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        }

        // ESC/POS commands
        private static readonly byte[] CMD_INIT         = { 0x1B, 0x40 };       // ESC @ - Initialize
        private static readonly byte[] CMD_CODEPAGE_850 = { 0x1B, 0x74, 0x02 }; // ESC t 2 - PC850 (Spanish chars)
        private static readonly byte[] CMD_BOLD_ON      = { 0x1B, 0x45, 0x01 }; // ESC E 1 - Bold on
        private static readonly byte[] CMD_BOLD_OFF     = { 0x1B, 0x45, 0x00 }; // ESC E 0 - Bold off
        private static readonly byte[] CMD_SIZE_2H      = { 0x1D, 0x21, 0x10 }; // GS ! 0x10 - Double height only
        private static readonly byte[] CMD_SIZE_NORMAL  = { 0x1D, 0x21, 0x00 }; // GS ! 0x00 - Normal size
        private static readonly byte[] CMD_FEED_CUT     = { 0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x01 }; // 4x LF + partial cut (GS V 1)

        public PrintService()
        {
            _printerManager = new PrinterManager();
            _settingsManager = new SettingsManager();
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

        public PrinterManager GetPrinterManager() => _printerManager;
        public SettingsManager GetSettingsManager() => _settingsManager;

        public async Task<bool> PrintAsync(PrintJob job)
        {
            if (job == null)
                throw new ArgumentNullException(nameof(job));

            if (string.IsNullOrEmpty(job.Content))
                throw new ArgumentException("Content cannot be empty", nameof(job));

            var printer = _printerManager.GetPrinterByName(job.PrinterName ?? string.Empty);
            if (printer == null)
            {
                var printers = _printerManager.GetAvailablePrinters();
                if (printers.Count == 0)
                    throw new InvalidOperationException("No printers available");
                printer = printers[0];
            }

            return await Task.Run(() =>
            {
                try
                {
                    var settings = _settingsManager.GetSettings();
                    var bytes = BuildEscPosData(job.Content, settings.Bold && job.IsKitchen);

                    for (int i = 0; i < job.Copies; i++)
                    {
                        RawPrinterHelper.SendRawBytes(printer.PrinterName, bytes);
                        Console.WriteLine($"Copy {i + 1}/{job.Copies} sent to '{printer.PrinterName}'");
                    }
                    return true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Print error: {ex.Message}");
                    throw; // propagate to ApiServer for proper error response
                }
            });
        }

        /// <summary>
        /// Pre-processes text so it encodes cleanly in CP850/CP437.
        /// Generic printers may ignore ESC t and fall back to CP437;
        /// uppercase accented vowels (Á Í Ó Ú) exist in CP850 but NOT CP437,
        /// so we map them to their unaccented equivalents as a safe fallback.
        /// Also replaces common Unicode symbols that have no equivalent in either codepage.
        /// </summary>
        private static string NormalizeForPrinter(string text)
        {
            // Precompose any decomposed Unicode characters (NFD → NFC)
            text = text.Normalize(NormalizationForm.FormC);

            var sb = new StringBuilder(text.Length);
            foreach (char c in text)
            {
                sb.Append(c switch
                {
                    // ── Uppercase accented vowels: same byte in CP850 ≠ CP437 ──────────
                    'Á' or 'À' or 'Â' or 'Ã'             => 'A',
                    'É' or 'È' or 'Ê'                     => 'E',  // É=0x90 in both, but map variants
                    'Í' or 'Ì' or 'Î'                     => 'I',
                    'Ó' or 'Ò' or 'Ô' or 'Õ'             => 'O',
                    'Ú' or 'Ù' or 'Û'                     => 'U',
                    // ── Lowercase accented vowels: same byte in CP850 AND CP437 ────────
                    // (á=0xA0, é=0x82, í=0xA1, ó=0xA2, ú=0xA3 — pass through unchanged)
                    // ── C/c cedilla: same byte in both ──────────────────────────────────
                    // (ç=0x87, Ç=0x80 — pass through unchanged)
                    // ── Common symbols not in CP850/CP437 ────────────────────────────────
                    '€'                                    => 'E',  // euro sign
                    '\u2018' or '\u2019'                   => '\'', // curly single quotes
                    '\u201C' or '\u201D'                   => '"',  // curly double quotes
                    '\u2013' or '\u2014'                   => '-',  // en-dash / em-dash
                    '\u2026'                               => '.',  // ellipsis
                    '\u00B7'                               => '.',  // middle dot
                    '\u00A0'                               => ' ',  // non-breaking space
                    // ── Pass everything else through (CP850 handles it or it's ASCII) ──
                    _ => c
                });
            }
            return sb.ToString();
        }

        private static byte[] BuildEscPosData(string content, bool applyBold)
        {
            // PC850 encoding for Spanish characters (á é í ó ú ñ Ñ ¡ ¿ etc.)
            // Use an encoder that substitutes unmappable chars with '?' rather than throwing
            var enc = Encoding.GetEncoding(850,
                new EncoderReplacementFallback("?"),
                new DecoderReplacementFallback("?"));

            var buf = new List<byte>();

            // Initialize + set codepage
            buf.AddRange(CMD_INIT);
            buf.AddRange(CMD_CODEPAGE_850);

            if (applyBold && content.Contains("[BOLD]"))
            {
                // Parse [BOLD]/[/BOLD] markers — only those sections get bold
                var parts = content.Split(new[] { "[BOLD]", "[/BOLD]" }, StringSplitOptions.None);
                bool boldActive = false;
                foreach (var part in parts)
                {
                    if (boldActive)
                    {
                        buf.AddRange(CMD_BOLD_ON);
                        buf.AddRange(CMD_SIZE_2H);
                        buf.AddRange(enc.GetBytes(NormalizeForPrinter(part)));
                        buf.AddRange(CMD_SIZE_NORMAL);
                        buf.AddRange(CMD_BOLD_OFF);
                    }
                    else
                    {
                        buf.AddRange(enc.GetBytes(NormalizeForPrinter(part)));
                    }
                    boldActive = !boldActive;
                }
            }
            else
            {
                // No markers — print entire content (markers stripped if present)
                var plain = content.Replace("[BOLD]", "").Replace("[/BOLD]", "");
                buf.AddRange(enc.GetBytes(NormalizeForPrinter(plain)));
            }

            // Feed lines + cut
            buf.AddRange(CMD_FEED_CUT);

            return buf.ToArray();
        }
    }
}
