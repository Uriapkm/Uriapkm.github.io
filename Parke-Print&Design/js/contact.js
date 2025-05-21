// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    init() {
        ContactForm.init();
        Gallery.init();
        MobileMenu.init();
    }
};

const ContactForm = {
    init() {
        const form = document.getElementById('contactFormGlobal');
        const messages = document.getElementById('form-messages');
        
        if (!form || !messages) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!this.validate(form)) {
                this.showMessage('Por favor, completa todos los campos obligatorios.', 'error');
                return;
            }

            try {
                const response = await this.submit(form);
                this.handleResponse(response);
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        });
    },

    validate(form) {
        return ['name', 'email', 'message', 'client_type'].every(field => {
            return form.querySelector(`#${field}`).value.trim() !== '';
        });
    },

    async submit(form) {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error en el envío.');
        }
        
        return response;
    },

    showMessage(text, type = 'success') {
        const messages = document.getElementById('form-messages');
        messages.textContent = text;
        messages.style.color = type === 'error' ? '#dc3545' : '#28a745';
    },

    handleResponse(response) {
        this.showMessage('Mensaje enviado correctamente. ¡Gracias!');
        document.getElementById('contactFormGlobal').reset();
    }
};

const Gallery = {
    slider: null,
    autoplayInterval: 3000,

    init() {
        this.slider = {
            container: document.querySelector('.gallery-slider'),
            items: document.querySelectorAll('.gallery-item'),
            prevBtn: document.querySelector('.prev-btn'),
            nextBtn: document.querySelector('.next-btn'),
            currentIndex: 0
        };

        if (!this.isValid()) return;

        this.initControls();
        this.initAutoplay();
        this.initResponsive();
    },

    isValid() {
        return this.slider.container && 
               this.slider.items.length > 0 && 
               this.slider.prevBtn && 
               this.slider.nextBtn;
    },

    initControls() {
        this.slider.nextBtn.addEventListener('click', () => this.next());
        this.slider.prevBtn.addEventListener('click', () => this.prev());
    },

    next() {
        this.slider.currentIndex = (this.slider.currentIndex + 1) % this.slider.items.length;
        this.updatePosition();
    },

    prev() {
        this.slider.currentIndex = (this.slider.currentIndex - 1 + this.slider.items.length) % this.slider.items.length;
        this.updatePosition();
    },

    updatePosition() {
        const itemWidth = this.slider.items[0].offsetWidth;
        this.slider.container.style.transform = `translateX(${-this.slider.currentIndex * itemWidth}px)`;
    },

    initAutoplay() {
        let interval;
        const startAutoplay = () => interval = setInterval(() => this.next(), this.autoplayInterval);
        const stopAutoplay = () => clearInterval(interval);

        this.slider.container.addEventListener('mouseenter', stopAutoplay);
        this.slider.container.addEventListener('mouseleave', startAutoplay);
        startAutoplay();
    },

    initResponsive() {
        const updateSlider = () => this.updatePosition();
        window.addEventListener('load', updateSlider);
        window.addEventListener('resize', updateSlider);
    }
};

const MobileMenu = {
    init() {
        const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        
        if (!menuToggle || !navLinks) return;

        this.addEventListeners(menuToggle, navLinks);
    },

    addEventListeners(menuToggle, navLinks) {
        // Toggle menu
        menuToggle.addEventListener('click', () => {
            this.toggleMenu(menuToggle, navLinks);
        });

        // Close menu when clicking links
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu(menuToggle, navLinks);
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && 
                !menuToggle.contains(e.target) && 
                navLinks.classList.contains('active')) {
                this.closeMenu(menuToggle, navLinks);
            }
        });
    },

    toggleMenu(menuToggle, navLinks) {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    },

    closeMenu(menuToggle, navLinks) {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
};