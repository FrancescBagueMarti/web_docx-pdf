const { PDFDocument, StandardFonts } = window.PDFLib;

// Function to convert base64 image to a buffer
async function base64ToImageData(base64) {
    const imageData = await fetch(base64).then((res) => res.arrayBuffer());
    return imageData;
}

// Main function to convert HTML to PDF
async function generatePdf(htmlContent) {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Define the page size (A4 size)
    let page = pdfDoc.addPage([595, 842]); // A4 size in points
    const { width, height } = page.getSize();
    let yPosition = height - 20; // Start from the top of the page
    const margin = 20;

    // Regular expressions to find base64 images and text in HTML
    const imageRegex = /<img src="data:image\/([a-zA-Z]*);base64,([^\"]+)"/g;
    
    // Convert HTML to text with line breaks and markdown-like formatting
    const textContent = htmlContent
        .replace(/<h1>/g, '### ')       // Convert <h1> to markdown-like format
        .replace(/<\/h1>/g, '\n')
        .replace(/<p>/g, '')            // Convert <p> to a new line
        .replace(/<\/p>/g, '\n')
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '\n')
        .replace(/<li>/g, '    * ')      // Convert <li> to bullet points
        .replace(/<\/li>/g, '\n')
        .replace(/<\/?[^>]+(>|$)/g, "");  // Remove remaining HTML tags

    // Extract and process all base64 images
    const imageMatches = [...htmlContent.matchAll(imageRegex)];

    // Helper function to check if we need a new page
    const checkPageOverflow = (spaceNeeded) => {
        if (yPosition - spaceNeeded < 20) {
            page = pdfDoc.addPage([595, 842]); // Create a new page
            yPosition = height - 20; // Reset yPosition to the top
        }
    };

    // Process all images
    for (const match of imageMatches) {
        const imageType = match[1];
        const base64Data = match[2];

        // Decode the image from base64
        const imageBytes = await base64ToImageData(`data:image/${imageType};base64,${base64Data}`);

        // Embed the image in the PDF
        const image = await pdfDoc.embedPng(imageBytes);

        // Get image dimensions
        // const imageWidth = 150;  // You can adjust this value
        // const imageHeight = (image.height / image.width) * imageWidth;
        const imageWidth = image.width /2;
        const imageHeight = image.height /2;

        // Check if the image fits in the current page
        checkPageOverflow(imageHeight + 20); // Add some padding after image

        // Place the image at the current yPosition
        page.drawImage(image, {
            x: margin,
            y: yPosition - imageHeight,
            width: imageWidth,
            height: imageHeight,
        });

        // Adjust yPosition after the image to prevent overlap
        yPosition -= imageHeight + 10; // Add some space after the image
    }

    // Set the font for the text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Draw the content on the PDF with wrapping and line breaks
    const lines = textContent.split('\n').filter(line => line.trim() !== ''); // Split the text into lines
    for (const line of lines) {
        console.log(line)
        // Check if the text fits in the current page
        checkPageOverflow(20); // Check if we have enough space for a line of text

        // Draw the line of text on the PDF
        page.drawText(line, {
            x: margin,
            y: yPosition,
            font: font,
            size: 10,
            lineHeight: 12,
            maxWidth: width - 2 * margin, // Keep within the page width
        });

        // Adjust yPosition after the text to prevent overlap
        yPosition -= 20; // Add some space after each line of text
    }

    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();

    // Return the PDF file as a byte array
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url); // Open the PDF in a new tab
}

// Function to parse DOCX file and convert to PDF
function parseWordDocxFile(inputElement) {
    var files = inputElement.files || [];
    if (!files.length) return;
    var file = files[0];

    let result;

    console.time();
    var reader = new FileReader();
    reader.onloadend = function(event) {
        var arrayBuffer = reader.result;

        var options = {
            convertImage: mammoth.images.imgElement(function(image) {
                return image.read("base64").then(function(imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    };
                });
            })
        }

        mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options).then(function(resultObject) {
            const result = resultObject.value;
            generatePdf(result); // This is the point where we generate the PDF
            document.querySelector('div#result').innerHTML = result;
        });
    };

    reader.readAsArrayBuffer(file);
}