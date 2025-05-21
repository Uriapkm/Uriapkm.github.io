'use strict';

const App = {
    init() {
        ContactForm.init();
        Gallery.init();
        MobileMenu.init();
    }
};

const ContactForm = {
    form: null,
    messages: null,

    init() {
        this.form = document.getElementById('contactFormGlobal');
        this.messages = document.getElementById('form-messages');
        
        if (!this.form || !this.messages) return;
        this.bindEvents();
    },

    bindEvents() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    },

    async handleSubmit() {
        if (!this.validate()) {
            this.showMessage('Por favor, completa todos los campos obligatorios.', 'error');
            return;
        }

        try {
            const response = await this.submit();
            if (response.ok) {
                this.showMessage('Mensaje enviado correctamente. ¡Gracias!');
                this.form.reset();
            }
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    },

    validate() {
        return ['name', 'email', 'message', 'client_type'].every(field => 
            this.form.querySelector(`#${field}`).value.trim() !== ''
        );
    },

    async submit() {
        const response = await fetch(this.form.action, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(this.form)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.errors?.map(e => e.message).join(', ') || 'Error en el envío.');
        }

        return response;
    },

    showMessage(text, type = 'success') {
        this.messages.textContent = text;
        this.messages.style.color = type === 'error' ? '#dc3545' : '#28a745';
    }
};

const Gallery = {
    config: {
        autoplayInterval: 3000,
        selectors: {
            container: '.gallery-slider',
            items: '.gallery-item',
            prevBtn: '.prev-btn',
            nextBtn: '.next-btn'
        }
    },

    state: {
        currentIndex: 0,
        container: null,
        items: null,
        prevBtn: null,
        nextBtn: null,
        autoplayTimer: null
    },

    init() {
        this.initElements();
        if (!this.validateElements()) return;
        
        this.bindEvents();
        this.startAutoplay();
    },

    initElements() {
        const { selectors } = this.config;
        this.state = {
            ...this.state,
            container: document.querySelector(selectors.container),
            items: document.querySelectorAll(selectors.items),
            prevBtn: document.querySelector(selectors.prevBtn),
            nextBtn: document.querySelector(selectors.nextBtn)
        };
    },

    validateElements() {
        const { container, items, prevBtn, nextBtn } = this.state;
        return container && items.length && prevBtn && nextBtn;
    },

    bindEvents() {
        const { prevBtn, nextBtn, container } = this.state;
        
        prevBtn.addEventListener('click', () => this.slide('prev'));
        nextBtn.addEventListener('click', () => this.slide('next'));
        container.addEventListener('mouseenter', () => this.stopAutoplay());
        container.addEventListener('mouseleave', () => this.startAutoplay());
        
        window.addEventListener('resize', () => this.updatePosition());
    },

    slide(direction) {
        const { items } = this.state;
        this.state.currentIndex = direction === 'next' 
            ? (this.state.currentIndex + 1) % items.length
            : (this.state.currentIndex - 1 + items.length) % items.length;
        
        this.updatePosition();
    },

    updatePosition() {
        const { container, currentIndex, items } = this.state;
        const itemWidth = items[0].offsetWidth;
        container.style.transform = `translateX(${-currentIndex * itemWidth}px)`;
    },

    startAutoplay() {
        this.stopAutoplay();
        this.state.autoplayTimer = setInterval(() => 
            this.slide('next'), this.config.autoplayInterval
        );
    },

    stopAutoplay() {
        if (this.state.autoplayTimer) {
            clearInterval(this.state.autoplayTimer);
            this.state.autoplayTimer = null;
        }
    }
};

const MobileMenu = {
    elements: {
        hamburger: null,
        navLinks: null,
        menuItems: null
    },

    init() {
        this.elements = {
            hamburger: document.querySelector('.hamburger'),
            navLinks: document.querySelector('.nav-links'),
            menuItems: document.querySelectorAll('.nav-links a')
        };

        if (!this.elements.hamburger || !this.elements.navLinks) return;
        this.bindEvents();
    },

    bindEvents() {
        const { hamburger, navLinks, menuItems } = this.elements;

        hamburger.addEventListener('click', () => this.toggleMenu());
        
        menuItems.forEach(item => {
            item.addEventListener('click', () => this.closeMenu());
        });

        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && 
                !hamburger.contains(e.target) && 
                navLinks.classList.contains('active')) {
                this.closeMenu();
            }
        });
    },

    toggleMenu() {
        const { hamburger, navLinks } = this.elements;
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    },

    closeMenu() {
        const { hamburger, navLinks } = this.elements;
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());