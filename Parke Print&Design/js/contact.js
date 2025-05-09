document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactFormGlobal'); // ID correcto
  const messages = document.getElementById('form-messages');

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Validar campos obligatorios
    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const message = form.querySelector('#message').value.trim();
    const clientType = form.querySelector('#client_type').value.trim(); // Nuevo campo

    if (!name || !email || !message || !clientType) {
      messages.textContent = 'Por favor, completa todos los campos obligatorios.';
      messages.style.color = 'red';
      return;
    }

    // Preparar datos y enviar
    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
    .then(response => {
      if (response.ok) {
        messages.textContent = '¡Solicitud enviada con éxito! Te contactaremos pronto.';
        messages.style.color = 'green';
        form.reset();
      } else {
        return response.json().then(data => {
          throw new Error(data.errors ? data.errors.map(e => e.message).join(', ') : 'Error en el envío.');
        });
      }
    })
    .catch(error => {
      messages.textContent = 'Hubo un problema al enviar el formulario.';
      messages.style.color = 'red';
      console.error('Form submission error:', error);
    });
  });

  // Funciones para la galería "revolver"
  const slider = document.querySelector('.gallery-slider');
  const items = document.querySelectorAll('.gallery-item');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');

  if (slider && items.length > 0 && prevBtn && nextBtn) {
    let currentIndex = 0;
    const itemWidth = items[0].offsetWidth; // Ancho de cada imagen

    function updateSlider() {
      slider.style.transform = `translateX(${-currentIndex * itemWidth}px)`;
    }

    function nextSlide() {
      currentIndex = (currentIndex + 1) % items.length;
      updateSlider();
    }

    function prevSlide() {
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      updateSlider();
    }

    // Navegación manual
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    // Automático (Revolver)
    let interval = setInterval(nextSlide, 3000); // Cambia cada 3 segundos

    // Opcional: Pausar al pasar el ratón
    slider.addEventListener('mouseenter', () => clearInterval(interval));
    slider.addEventListener('mouseleave', () => {
      interval = setInterval(nextSlide, 3000);
    });

    // Inicializar al cargar la página (por si hay problemas con el ancho)
    window.addEventListener('load', updateSlider);
    window.addEventListener('resize', updateSlider); // Actualizar al cambiar el tamaño de la ventana
  }
});