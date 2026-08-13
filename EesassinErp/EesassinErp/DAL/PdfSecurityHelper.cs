using System;
using System.IO;
using iTextSharp.text.pdf;

public static class PdfSecurityHelper
{
    public static void SaveProtectedPdf(Stream uploadedFileStream,
    string outputFilePath,
    string password)
    {
        PdfReader reader = new PdfReader(uploadedFileStream);
 
    using (FileStream fs = new FileStream(outputFilePath, FileMode.Create))
        {
            PdfStamper stamper = new PdfStamper(reader, fs);

            stamper.SetEncryption(
                PdfWriter.STRENGTH128BITS,
                password,
                password,
                PdfWriter.ALLOW_PRINTING
            );

            stamper.Close();
        }

        reader.Close();
    }

    public static bool IsPdf(string fileName)
    {
        return Path.GetExtension(fileName)
                   .Equals(".pdf", StringComparison.OrdinalIgnoreCase);
    } 

}
