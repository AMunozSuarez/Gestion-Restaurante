namespace PrintingService.Models
{
    public class PrinterInfo
    {
        public string PrinterName { get; set; } = string.Empty;
        public string Status { get; set; } = "Available";
        public bool IsDefault { get; set; }
    }
}