const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
function parseWordDocxFile(inputElement) {
    var files = inputElement.files || [];
    if (!files.length) return;
    var file = files[0];

    let result;

    console.time();
    var reader = new FileReader();
    reader.onloadend = function (event) {
        var arrayBuffer = reader.result;

        var options = {
            convertImage: mammoth.images.imgElement(function (image) {
                return image.read("base64").then(function (imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    };
                });
            })
        }

        mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options).then(function (resultObject) {
            const result = resultObject.value;
            console.log(result)

            document.querySelector('#result').innerHTML = result

            htmlToPdf(result)
            
        });
    };

    reader.readAsArrayBuffer(file);
}

// Function to convert base64 image to PDF format
async function embedImage(pdfDoc, base64Image) {
    const imgBytes = Uint8Array.from(atob(base64Image.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(imgBytes);
    return img;
  }
  
  // Function to add text to the PDF
  const addText = (page, text, yPosition, indent = 0, fontSize = 12) => {
    page.drawText(text, { x: 50 + indent, y: yPosition, size: fontSize });
    return yPosition - fontSize - 5; // Adjust y position for next content
  };
  
  // Recursive function to process <ul> elements
  const processList = async (ulElement, page, yPosition, indent = 0) => {
    const listItems = ulElement.querySelectorAll('li');
    for (const li of listItems) {
      yPosition = await processElement(li, page, yPosition, indent, pdfDoc);
    }
    return yPosition;
  };
  
  // Function to process each element in the HTML
  const processElement = async (el, page, yPosition, indent = 0, pdfDoc) => {
    switch (el.tagName.toLowerCase()) {
      case 'p': {
        // Add paragraph text to the PDF
        yPosition = addText(page, el.textContent, yPosition, indent);
        break;
      }
      case 'ul': {
        // Process unordered lists (<ul>)
        yPosition = await processList(el, page, yPosition, indent);
        break;
      }
      case 'li': {
        // Add list item text to the PDF with bullet points
        yPosition = addText(page, `• ${el.textContent}`, yPosition, indent);
        break;
      }
      case 'a': {
        // Add link text to the PDF
        yPosition = addText(page, `Link: ${el.href}`, yPosition, indent);
        break;
      }
      case 'img': {
        // Process image (base64)
        const base64Image = el.src;
        const img = await embedImage(pdfDoc, base64Image);
        const { width, height } = img.scale(0.5);  // Adjust image scaling
        page.drawImage(img, {
          x: 50 + indent,
          y: yPosition - height,
          width,
          height,
        });
        yPosition -= height + 10;  // Adjust y position after the image
        break;
      }
      default:
        break;
    }
    return yPosition;
  };
  
  // Main function to handle HTML to PDF conversion
  async function htmlToPdf(htmlString) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    let yPosition = height - 50;  // Start from a little lower than the top
  
    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
  
    // Recursive function to process the HTML content
    const processHTML = async (el, yPosition, indent = 0, pdfDoc) => {
      if (el.tagName) {
        yPosition = await processElement(el, page, yPosition, indent, pdfDoc);
      }
  
      // Handle child elements
      for (const child of el.children) {
        if (child.tagName === 'ul') {
          // For nested <ul>, increase indentation
          yPosition = await processHTML(child, yPosition, indent + 20, pdfDoc);
        } else {
          yPosition = await processHTML(child, yPosition, indent, pdfDoc);
        }
      }
      return yPosition;
    };
  
    // Start processing the HTML body
    await processHTML(doc.body, yPosition, pdfDoc);
  
    // Check if content overflows, and add a new page if needed
    const pageCount = pdfDoc.getPages().length;
    if (yPosition < 50) {
      // Add a new page if necessary
      pdfDoc.addPage();
      const newPage = pdfDoc.getPages()[pageCount];
      yPosition = newPage.getHeight() - 50;
    }
  
    // Save the PDF and trigger download in browser
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'converted.pdf';
    link.click();
  }