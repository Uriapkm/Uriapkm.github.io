document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('promptGeneratorForm');
    const generatedPromptTextarea = document.getElementById('generatedPrompt');
    const copyButton = document.getElementById('copyPromptBtn');
    const copyMessage = document.getElementById('copyMessage');

    // Elementos para los apartados de código separados
    const htmlCodeTextarea = document.getElementById('htmlCode');
    const cssCodeTextarea = document.getElementById('cssCode');
    const jsCodeTextarea = document.getElementById('jsCode');

    // Elementos para la selección de imágenes
    const imagenInput = document.getElementById('imagenInput');
    const previsualizacionesContainer = document.getElementById('previsualizaciones');
    let selectedImageFiles = []; // Array para almacenar los File objects de las imágenes

    // Elementos para la selección de logo
    const logoInput = document.getElementById('logoInput');
    const logoPreviewContainer = document.getElementById('logoPreview');
    let selectedLogoFile = null; // Variable para almacenar el File object del logo

    // Checkboxes de opciones
    const incluirLogoCheckbox = document.getElementById('incluirLogo');
    const incluirImagenesCheckbox = document.getElementById('incluirImagenes');

    const downloadWebButton = document.getElementById('downloadWebBtn');
    const downloadMessage = document.getElementById('downloadMessage');


    // --- Funcionalidad para generar el Prompt ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // Recopila los valores de los campos
        const temaWeb = document.getElementById('temaWeb').value.trim();
        const publicoObjetivo = document.getElementById('publicoObjetivo').value.trim();
        const seccionesClave = document.getElementById('seccionesClave').value.trim();
        const coloresPrincipales = document.getElementById('coloresPrincipales').value.trim();
        const estiloVisual = document.getElementById('estiloVisual').value.trim();
        const tipografia = document.getElementById('tipografia').value.trim();
        const llamadaAccion = document.getElementById('llamadaAccion').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const email = document.getElementById('email').value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const linkedin = document.getElementById('linkedin').value.trim();
        const twitter = document.getElementById('twitter').value.trim();
        const instagram = document.getElementById('instagram').value.trim();
        const facebook = document.getElementById('facebook').value.trim();
        const github = document.getElementById('github').value.trim();
        const otrosEnlaces = document.getElementById('otrosEnlaces').value.trim();
        const requisitosAdicionales = document.getElementById('requisitosAdicionales').value.trim();

        // Construye el prompt
        let promptContent = `Genera el código HTML, CSS y JavaScript completo para una landing page moderna y optimizada.
Entrega el código para cada archivo de forma separada (es decir, un bloque para HTML, otro para CSS y otro para JavaScript).
`;

        // Añadir opciones de logo e imágenes al prompt si están seleccionadas
        if (incluirLogoCheckbox.checked) {
            promptContent += `
**Especificación de Logo:**
  - La página debe incluir un espacio claro y prominente para un logo en la cabecera.
  - El logo se debe referenciar como 'logo.png' (ej. <img src="logo.png" alt="Logo de la empresa">).`;
        } else {
            promptContent += `
**Especificación de Logo:**
  - La página NO debe incluir un logo.`;
        }

        if (incluirImagenesCheckbox.checked) {
            promptContent += `
**Especificación de Imágenes:**
  - La página DEBE incluir imágenes. Utiliza la ruta "images/" para referenciar todas las imágenes (ej. <img src="images/mi-imagen.jpg" alt="Descripción">).
  - Incorpora imágenes de ejemplo temáticas y relevantes para cada sección que lo requiera.`;
        } else {
            promptContent += `
**Especificación de Imágenes:**
  - La página NO DEBE incluir imágenes de ningún tipo (ni en el contenido, ni como fondos CSS). Sé estricto con esta restricción.`;
        }

        promptContent += `
**Tema de la Web:** ${temaWeb}
**Público Objetivo:** ${publicoObjetivo}. El diseño y la experiencia de usuario deben estar específicamente adaptados a sus necesidades y expectativas.
**Secciones:** La página debe incluir de forma clara y diferenciada las siguientes secciones: ${seccionesClave}. Cada sección debe tener contenido de ejemplo temático y relevante para el tema.

**Diseño y Estilo Visual:**
**Paleta de Colores Principal:** ${coloresPrincipales}. Utiliza estos colores de forma coherente para transmitir la atmósfera deseada.
**Estilo Visual:** ${estiloVisual}. Prioriza [inserta aquí adjetivos como 'limpieza y simplicidad', 'texturas cálidas y tipografía amigable', etc. basados en el estilo].
${tipografia ? `**Tipografía:** Utiliza la tipografía '${tipografia}'.` : ''}

**Interacciones y Contacto:**
**Llamada a la Acción Principal (CTA):** Incorpora un botón principal de Llamada a la Acción (CTA) con el texto exacto: '${llamadaAccion}'. Este botón debe ser visualmente prominente y su ubicación debe ser estratégica para la conversión.
${telefono ? `**Contacto Teléfono:** Incluye el número de teléfono '${telefono}' en una sección de contacto visible (ej. footer, encabezado). Hazlo clickeable (tel:).` : ''}
${email ? `**Contacto Correo Electrónico:** Incluye el correo electrónico '${email}' en una sección de contacto visible (ej. footer). Hazlo clickeable (mailto:).` : ''}
${direccion ? `**Dirección Física:** Muestra la dirección '${direccion}' en el footer o una sección de contacto. Si es posible, integra un mapa de Google Maps simple en la sección de contacto, centrado en esta dirección.` : ''}

**Integración de Enlaces:**
${linkedin ? `**LinkedIn:** Incluye un icono de LinkedIn en el footer o una sección de redes sociales que enlace a '${linkedin}'.` : ''}
${twitter ? `**X (Twitter):** Incluye un icono de X (Twitter) en el footer o una sección de redes sociales que enlace a '${twitter}'.` : ''}
${instagram ? `**Instagram:** Incluye un icono de Instagram en el footer o una sección de redes sociales que enlace a '${instagram}'.` : ''}
${facebook ? `**Facebook:** Incluye un icono de Facebook en el footer o una sección de redes sociales que enlace a '${facebook}'.` : ''}
${github ? `**GitHub:** Incluye un icono de GitHub en el footer o una sección de redes sociales que enlace a '${github}'.` : ''}
${otrosEnlaces ? `**Otros Enlaces:** Incorpora los siguientes enlaces relevantes en el footer: ${otrosEnlaces.split('\n').map(link => `'${link.trim()}'`).filter(l => l !== "''").join(', ')}.` : ''}

**Funcionalidades Avanzadas:**
**Requisitos Adicionales:** ${requisitosAdicionales || "Ninguno"}. Detalla cualquier funcionalidad específica necesaria aquí (ej: 'implementa un carrusel de imágenes responsivo y automático con flechas de navegación y puntos indicadores', 'incluye un formulario de contacto con validación básica en el lado del cliente', 'añade un efecto de parallax en la sección hero').

**Calidad del Código:**
El HTML debe ser semántico, bien estructurado y accesible (WCAG). El CSS debe seguir un enfoque mobile-first, ser modular, estar bien organizado con comentarios, y optimizado para la carga. El JavaScript debe ser ligero, estar bien comentado, y solo incluir la lógica necesaria para las interacciones especificadas, sin librerías externas innecesarias a menos que se solicite explícitamente. Asegura que el código generado sea fácil de leer y modificar por un desarrollador.
`;

        // Limpia las líneas vacías que puedan quedar por campos opcionales no rellenados
        generatedPromptTextarea.value = promptContent.split('\n').filter(line => line.trim() !== '').join('\n');
    });

    copyButton.addEventListener('click', () => {
        generatedPromptTextarea.select();
        generatedPromptTextarea.setSelectionRange(0, 99999);
        document.execCommand('copy');

        copyMessage.textContent = '¡Prompt copiado al portapapeles!';
        copyMessage.classList.add('show');
        setTimeout(() => {
            copyMessage.classList.remove('show');
            copyMessage.textContent = '';
        }, 2000);
    });

    // --- Funcionalidad para selección y previsualización de imágenes ---
    imagenInput.addEventListener('change', (event) => {
        previsualizacionesContainer.innerHTML = ''; // Limpiar previsualizaciones anteriores
        selectedImageFiles = []; // Resetear el array de archivos seleccionados

        const files = event.target.files; // Obtener los archivos seleccionados

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Asegurarse de que es un archivo de imagen
                if (file.type.startsWith('image/')) {
                    selectedImageFiles.push(file); // Guardar el File object para JSZip

                    const reader = new FileReader();

                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result; // La URL de datos de la imagen
                        img.alt = `Previsualización de ${file.name}`;
                        img.classList.add('preview-image'); // Añadir clase para estilos CSS si es necesario
                        previsualizacionesContainer.appendChild(img);
                    };

                    reader.readAsDataURL(file); // Leer el archivo como una URL de datos para la previsualización
                } else {
                    console.warn(`El archivo ${file.name} no es una imagen y no se previsualizará ni se incluirá.`);
                }
            }
            if (selectedImageFiles.length === 0) {
                previsualizacionesContainer.textContent = "No se han seleccionado imágenes válidas.";
            }
        } else {
            previsualizacionesContainer.textContent = "No se han seleccionado imágenes.";
        }
    });

    // --- Funcionalidad para selección y previsualización de logo ---
    logoInput.addEventListener('change', (event) => {
        logoPreviewContainer.innerHTML = ''; // Limpiar previsualización anterior
        selectedLogoFile = null; // Resetear el archivo de logo seleccionado

        const file = event.target.files[0]; // Obtener el primer archivo seleccionado

        if (file) {
            // Asegurarse de que el archivo es un PNG y se llama logo.png
            if (file.type === 'image/png' && file.name === 'logo.png') {
                selectedLogoFile = file; // Guardar el File object para JSZip

                const reader = new FileReader();

                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result; // La URL de datos de la imagen
                    img.alt = `Previsualización de ${file.name}`;
                    img.classList.add('preview-image'); // Añadir clase para estilos CSS si es necesario
                    logoPreviewContainer.appendChild(img);
                };

                reader.readAsDataURL(file); // Leer el archivo como una URL de datos para la previsualización
            } else {
                logoPreviewContainer.textContent = "Por favor, sube un archivo PNG llamado 'logo.png'.";
                console.warn(`El archivo ${file.name} no es "logo.png" o no es un PNG.`);
                // Limpiar el input para que el usuario pueda seleccionar de nuevo
                event.target.value = '';
            }
        } else {
            logoPreviewContainer.textContent = "No se ha seleccionado un logo.";
        }
    });


    // --- Funcionalidad para procesar código de IA y descargar ZIP ---
    downloadWebButton.addEventListener('click', async () => {
        const htmlCode = htmlCodeTextarea.value.trim();
        const cssCode = cssCodeTextarea.value.trim();
        const jsCode = jsCodeTextarea.value.trim();

        if (!htmlCode && !cssCode && !jsCode && selectedImageFiles.length === 0 && selectedLogoFile === null) {
            showDownloadMessage('Por favor, pega al menos el código HTML o selecciona imágenes/logo para generar tu web.', 'error');
            return;
        }

        const zip = new JSZip();

        // Añadir HTML
        if (htmlCode) {
            zip.file("index.html", htmlCode);
        } else {
            console.warn("Código HTML no proporcionado. index.html no será creado.");
        }

        // Añadir CSS
        if (cssCode) {
            zip.file("style.css", cssCode);
        } else {
            console.warn("Código CSS no proporcionado. style.css no será creado.");
        }

        // Añadir JS
        if (jsCode) {
            zip.file("script.js", jsCode);
        } else {
            console.warn("Código JavaScript no proporcionado. script.js no será creado.");
        }

        // Añadir imágenes en una carpeta 'images/'
        if (selectedImageFiles.length > 0) {
            const imagesFolder = zip.folder("images");
            selectedImageFiles.forEach(file => {
                imagesFolder.file(file.name, file); // JSZip puede trabajar directamente con File objects
            });
            console.log(`Se han añadido ${selectedImageFiles.length} imágenes a la carpeta "images/".`);
        }

        // Añadir logo directamente en la raíz
        if (selectedLogoFile) {
            zip.file(selectedLogoFile.name, selectedLogoFile);
            console.log(`Se ha añadido el logo "${selectedLogoFile.name}" a la raíz.`);
        }

        // Generar el ZIP y descargarlo
        try {
            showDownloadMessage('Generando ZIP, por favor espera...', 'info'); // Mensaje de espera
            const content = await zip.generateAsync({ type: "blob" });
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(content);
            downloadLink.download = "mi-web-con-ia.zip";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            showDownloadMessage('¡Tu web ha sido descargada!', 'success');
            // Opcional: Limpiar los textareas y las imágenes después de la descarga
            // htmlCodeTextarea.value = '';
            // cssCodeTextarea.value = '';
            // jsCodeTextarea.value = '';
            // previsualizacionesContainer.innerHTML = '';
            // selectedImageFiles = [];
            // imagenInput.value = ''; // Resetear el input file para que pueda seleccionar los mismos archivos de nuevo
            // logoPreviewContainer.innerHTML = '';
            // selectedLogoFile = null;
            // logoInput.value = '';
        } catch (error) {
            console.error("Error generando el ZIP:", error);
            showDownloadMessage('Error al generar el archivo ZIP. Inténtalo de nuevo.', 'error');
        }
    });

    function showDownloadMessage(message, type) {
        downloadMessage.textContent = message;
        downloadMessage.className = 'download-message show';
        if (type === 'error') {
            downloadMessage.style.color = 'red';
        } else if (type === 'info') {
            downloadMessage.style.color = '#FFA500'; // Naranja para información
        }
        else {
            downloadMessage.style.color = '#007bff'; // Azul para éxito
        }
        setTimeout(() => {
            downloadMessage.classList.remove('show');
            downloadMessage.textContent = '';
            downloadMessage.style.color = '';
        }, 4000);
    }
});