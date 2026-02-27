using System;
using System.IO;
using System.Text.Json;
using PrintingService.Models;

namespace PrintingService
{
    public class SettingsManager
    {
        private static readonly string SettingsPath = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "settings.json");

        private PrintSettings _cached = new PrintSettings();

        public PrintSettings GetSettings()
        {
            try
            {
                if (File.Exists(SettingsPath))
                {
                    var json = File.ReadAllText(SettingsPath);
                    _cached = JsonSerializer.Deserialize<PrintSettings>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new PrintSettings();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading settings: {ex.Message}");
            }
            return _cached;
        }

        public void SaveSettings(PrintSettings settings)
        {
            try
            {
                _cached = settings;
                var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                File.WriteAllText(SettingsPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving settings: {ex.Message}");
            }
        }
    }
}
