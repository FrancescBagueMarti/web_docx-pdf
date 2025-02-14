function parseWordDocxFile(inputElement) {
    var files = inputElement.files || [];
    if (!files.length) return;
    var file = files[0];
    let result;

    console.time();
    var reader = new FileReader();
    reader.onloadend = function(event) {
        var arrayBuffer = reader.result;
        // debugger

        var options = {
          convertImage: mammoth.images.imgElement(function(image) {
              return image.read("base64").then(function(imageBuffer) {
                  return {
                      src: "data:" + image.contentType + ";base64," + imageBuffer
                  };
              });
          })
        }

        mammoth.convertToHtml({arrayBuffer: arrayBuffer}, options).then(function (resultObject) {
            const result = resultObject.value
            generatePdf(result)
            document.querySelector('div#result').innerHTML = result;
        })
    };
    reader.readAsArrayBuffer(file);
}
async function generatePdf(html) {
    const { PDFDocument, StandardFonts } = window.PDFLib;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add a page to the document
    const page = pdfDoc.addPage([600, 800]);

    // Get the page size and context
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Simple HTML content (you can change this)
    const htmlContent = html;

    // Convert the HTML content to plain text (basic conversion)
    const textContent = htmlContent
        .replace(/<h1>/g, '### ')       // Convert <h1> to markdown-like format
        .replace(/<\/h1>/g, '')
        .replace(/<p>/g, '')            // Convert <p> to a new line
        .replace(/<\/p>/g, '\n')
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '\n')
        .replace(/<li>/g, '    * ')         // Convert <li> to bullet points
        .replace(/<\/li>/g, '\n')
        .replace(/<\/?[^>]+(>|$)/g, ""); // Remove any remaining HTML tags

    // Draw the content on the PDF
    page.drawText(textContent, {
        x: 50,
        y: height - 100,
        font: font,
        size: 12,
        lineHeight: 14,
        maxWidth: width - 100,
    });

    // Find the base 64 imaes in the HTMl
    const base64Images = htmlContent.match(/data:image\/[^;]+;base64,([a-zA-Z0-9+/=]+)/g);
    if (base64Images) {
        for (let i = 0; i < base64Images.length; i++) {
            const base64Image = base64Images[i];

            // Remove the "data:image" part and get the base64 string
            const base64String = base64Image.split(',')[1];

            // Convert the base64 string to a byte array
            const imageBytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));

            // Embed the image into the PDF (use embedPng or embedJpg based on the image format)
            const image = base64Image.includes('jpeg') || base64Image.includes('jpg')
                ? await pdfDoc.embedJpg(imageBytes)
                : await pdfDoc.embedPng(imageBytes); // For PNG images

            const imageDims = image.scale(0.5); // Scale image to fit

            // Draw the image on the PDF (adjust x, y, width, height as needed)
            page.drawImage(image, {
                x: 50,                           // X position of image
                y: height - 200 - (i * 150),     // Y position of image, adjust based on index
                width: imageDims.width,          // Width of image
                height: imageDims.height,        // Height of image
            });
        }
    }

    // Serialize the document to bytes
    const pdfBytes = await pdfDoc.save();

    // Create a download link for the PDF file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    link.download = 'generated-pdf.pdf';
    link.click();
}