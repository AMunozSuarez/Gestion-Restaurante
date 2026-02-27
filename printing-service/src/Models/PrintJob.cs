namespace PrintingService.Models
{
    public class PrintJob
    {
        public string? PrinterName { get; set; }
        public string Content { get; set; } = string.Empty;
        public string ContentType { get; set; } = "text";
        public int Copies { get; set; } = 1;
        public bool IsKitchen { get; set; } = false;
    }
}