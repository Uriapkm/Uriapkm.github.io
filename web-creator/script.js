document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('promptGeneratorForm');
    const generatedPromptTextarea = document.getElementById('generatedPrompt');
    const copyButton = document.getElementById('copyPromptBtn');
    const copyMessage = document.getElementById('copyMessage');

    // Elements for separate code sections
    const htmlCodeTextarea = document.getElementById('htmlCode');
    const cssCodeTextarea = document.getElementById('cssCode');
    const jsCodeTextarea = document.getElementById('jsCode');

    // Elements for image selection
    const imageInput = document.getElementById('imagenInput');
    const previewsContainer = document.getElementById('previsualizaciones');
    let selectedImageFiles = []; // Array to store File objects for images

    // Elements for logo selection
    const logoInput = document.getElementById('logoInput');
    const logoPreviewContainer = document.getElementById('logoPreview');
    let selectedLogoFile = null; // Variable to store the File object for the logo

    // Option checkboxes
    const includeLogoCheckbox = document.getElementById('incluirLogo');
    const includeImagesCheckbox = document.getElementById('incluirImagenes');

    const downloadWebButton = document.getElementById('downloadWebBtn');
    const downloadMessage = document.getElementById('downloadMessage');

    // --- Functionality to generate the Prompt ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // Collect field values
        const websiteTheme = document.getElementById('temaWeb').value.trim();
        const targetAudience = document.getElementById('publicoObjetivo').value.trim();
        const keySections = document.getElementById('seccionesClave').value.trim();
        const mainColors = document.getElementById('coloresPrincipales').value.trim();
        const visualStyle = document.getElementById('estiloVisual').value.trim();
        const typography = document.getElementById('tipografia').value.trim();
        const callToAction = document.getElementById('llamadaAccion').value.trim();
        const phone = document.getElementById('telefono').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('direccion').value.trim(); // Corrected getById to getElementById
        const linkedin = document.getElementById('linkedin').value.trim();
        const twitter = document.getElementById('twitter').value.trim();
        const instagram = document.getElementById('instagram').value.trim();
        const facebook = document.getElementById('facebook').value.trim();
        const github = document.getElementById('github').value.trim();
        const otherLinks = document.getElementById('otrosEnlaces').value.trim();
        const additionalRequirements = document.getElementById('requisitosAdicionales').value.trim();

        // Build the prompt
        let promptContent = `Generate complete HTML, CSS, and JavaScript code for a modern and optimized landing page.
Provide the code for each file separately (i.e., one block for HTML, another for CSS, and another for JavaScript).
`;

        // Add logo and image options to the prompt if selected
        if (includeLogoCheckbox.checked) {
            promptContent += `
**Logo Specification:**
  - The page must include a clear and prominent space for a logo in the header.
  - The logo should be referenced as 'logo.png' (e.g., <img src="logo.png" alt="Company Logo">).`;
        } else {
            promptContent += `
**Logo Specification:**
  - The page MUST NOT include a logo.`;
        }

        if (includeImagesCheckbox.checked) {
            promptContent += `
**Image Specification:**
  - The page MUST include images. Use the "images/" path to reference all images (e.g., <img src="images/my-image.jpg" alt="Description">).
  - Incorporate thematic and relevant example images for each section that requires them.`;
        } else {
            promptContent += `
**Image Specification:**
  - The page MUST NOT include any images (neither in the content nor as CSS backgrounds). Be strict with this restriction.`;
        }

        promptContent += `
**Website Theme:** ${websiteTheme}
**Target Audience:** ${targetAudience}. The design and user experience must be specifically tailored to their needs and expectations.
**Sections:** The page must clearly and distinctly include the following sections: ${keySections}. Each section must have thematic and relevant example content.

**Design and Visual Style:**
**Main Color Palette:** ${mainColors}. Use these colors consistently to convey the desired atmosphere.
**Visual Style:** ${visualStyle}. Prioritize [insert adjectives here like 'clean and simple', 'warm textures and friendly typography', etc., based on the style].
${typography ? `**Typography:** Use the '${typography}' typography.` : ''}

**Interactions and Contact:**
**Main Call to Action (CTA):** Include a main Call to Action (CTA) button with the exact text: '${callToAction}'. This button must be visually prominent and strategically placed for conversion.
${phone ? `**Contact Phone:** Include the phone number '${phone}' in a visible contact section (e.g., footer, header). Make it clickable (tel:).` : ''}
${email ? `**Contact Email:** Include the email '${email}' in a visible contact section (e.g., footer). Make it clickable (mailto:).` : ''}
${address ? `**Physical Address:** Display the address '${address}' in the footer or a contact section. If possible, integrate a simple Google Maps map in the contact section, centered on this address.` : ''}

**Link Integration:**
${linkedin ? `**LinkedIn:** Include a LinkedIn icon in the footer or a social media section linking to '${linkedin}'.` : ''}
${twitter ? `**X (Twitter):** Include a Twitter icon in the footer or a social media section linking to '${twitter}'.` : ''}
${instagram ? `**Instagram:** Include an Instagram icon in the footer or a social media section linking to '${instagram}'.` : ''}
${facebook ? `**Facebook:** Include a Facebook icon in the footer or a social media section linking to '${facebook}'.` : ''}
${github ? `**GitHub:** Include a GitHub icon in the footer or a social media section linking to '${github}'.` : ''}
${otherLinks ? `**Other Links:** Incorporate the following relevant links in the footer: ${otherLinks.split('\n').map(link => `'${link.trim()}'`).filter(l => l !== "''").join(', ')}` : ''}
${additionalRequirements ? `**Additional Requirements:** ${additionalRequirements}` : ''}
`;

        generatedPromptTextarea.value = promptContent;
        // Clear other textareas when a new prompt is generated
        htmlCodeTextarea.value = '';
        cssCodeTextarea.value = '';
        jsCodeTextarea.value = '';
    });

    // --- Copy to Clipboard Functionality ---
    copyButton.addEventListener('click', () => {
        generatedPromptTextarea.select();
        document.execCommand('copy');
        copyMessage.textContent = '¡Prompt copiado!';
        setTimeout(() => {
            copyMessage.textContent = '';
        }, 2000);
    });

    // --- Image Previews Functionality ---
    imageInput.addEventListener('change', (event) => {
        previewsContainer.innerHTML = ''; // Clear previous previews
        selectedImageFiles = []; // Clear previous files

        const files = event.target.files;
        if (files.length > 0) {
            for (const file of files) {
                selectedImageFiles.push(file); // Store the File object
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-preview-container';
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = 'Previsualización de imagen';
                    imgContainer.appendChild(img);

                    const fileName = document.createElement('span');
                    fileName.textContent = file.name;
                    imgContainer.appendChild(fileName);

                    previewsContainer.appendChild(imgContainer);
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // --- Logo Previews Functionality ---
    logoInput.addEventListener('change', (event) => {
        logoPreviewContainer.innerHTML = ''; // Clear previous preview
        selectedLogoFile = null; // Clear previous file

        const file = event.target.files[0];
        if (file) {
            selectedLogoFile = file; // Store the File object
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'logo-preview-container';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Previsualización de logo';
                imgContainer.appendChild(img);

                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                imgContainer.appendChild(fileName);

                logoPreviewContainer.appendChild(imgContainer);
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Download Website Functionality (Basic Example) ---
    downloadWebButton.addEventListener('click', async () => {
        // In a real application, you'd likely send the prompt content
        // to a backend server or a more sophisticated client-side
        // library to generate and bundle the files.
        // For this example, we'll just create dummy files based on the textareas.

        const zip = new JSZip();

        // Add index.html if htmlCodeTextarea has content
        if (htmlCodeTextarea.value.trim()) {
            zip.file("index.html", htmlCodeTextarea.value);
        } else {
            zip.file("index.html", "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Generated Website</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n    <h1>Welcome to your generated website!</h1>\n    <script src=\"script.js\"></script>\n</body>\n</html>");
        }

        // Add style.css if cssCodeTextarea has content
        if (cssCodeTextarea.value.trim()) {
            zip.file("style.css", cssCodeTextarea.value);
        } else {
            zip.file("style.css", "/* Generar CSS aquí */\nbody {\n    font-family: sans-serif;\n    margin: 20px;\n}\n");
        }

        // Add script.js if jsCodeTextarea has content
        if (jsCodeTextarea.value.trim()) {
            zip.file("script.js", jsCodeTextarea.value);
        } else {
            zip.file("script.js", "// Generar JavaScript aquí\nconsole.log('Website loaded!');\n");
        }

        // Add images if selected
        if (includeImagesCheckbox.checked && selectedImageFiles.length > 0) {
            const imgFolder = zip.folder("images");
            for (const file of selectedImageFiles) {
                imgFolder.file(file.name, file);
            }
        }

        // Add logo if selected
        if (includeLogoCheckbox.checked && selectedLogoFile) {
            zip.file("logo.png", selectedLogoFile);
        }

        // Generate and download the zip file
        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                saveAs(content, "generated_website.zip");
                downloadMessage.textContent = '¡Web descargada!';
                setTimeout(() => {
                    downloadMessage.textContent = '';
                }, 3000);
            })
            .catch(err => {
                console.error("Error generating zip:", err);
                downloadMessage.textContent = 'Error al descargar la web.';
                setTimeout(() => {
                    downloadMessage.textContent = '';
                }, 3000);
            });
    });

    // --- Helper function to save file (requires FileSaver.js) ---
    // Make sure you include FileSaver.js in your HTML:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
});