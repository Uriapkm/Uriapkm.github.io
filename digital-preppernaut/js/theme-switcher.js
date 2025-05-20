document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});

function setTheme(themeName) {
    document.documentElement.className = themeName;
    localStorage.setItem('theme', themeName);
    
    // Update button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(themeName)) {
            btn.classList.add('active');
        }
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'prepper';
    setTheme(savedTheme);
}