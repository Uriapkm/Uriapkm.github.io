document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme on page load
    initTheme();

    // Add click handlers to theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const themeName = btn.dataset.theme;
            setTheme(themeName);
        });
    });
});

function setTheme(themeName) {
    // Remove existing theme classes
    document.documentElement.classList.remove('prepper', 'normie');
    // Add new theme class
    document.documentElement.classList.add(themeName);
    // Save preference
    localStorage.setItem('theme', themeName);
    
    // Update button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'prepper';
    setTheme(savedTheme);
}