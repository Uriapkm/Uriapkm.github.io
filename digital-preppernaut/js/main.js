// Mobile menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('open');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('open');
            }
        });
    }
});

// Add this function to handle prompt toggling
function togglePrompt(promptId) {
    const promptElement = document.getElementById(promptId);
    if (promptElement.style.display === 'none') {
        promptElement.style.display = 'block';
    } else {
        promptElement.style.display = 'none';
    }
}

// Theme switching functionality
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
}

// Check for saved theme preference or default to 'prepper'
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'prepper';
    setTheme(savedTheme);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
