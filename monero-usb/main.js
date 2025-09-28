// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('nav');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
        
        // Animate hamburger menu
        const spans = mobileMenuBtn.querySelectorAll('span');
        spans.forEach((span, index) => {
            if (nav.classList.contains('active')) {
                if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                if (index === 1) span.style.opacity = '0';
                if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                span.style.transform = 'none';
                span.style.opacity = '1';
            }
        });
    });
}

// Copy code to clipboard
function copyCode(elementId) {
    const codeElement = document.getElementById(elementId);
    const textToCopy = codeElement.innerText;
    
    // Create temporary textarea for copying
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    try {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
        
        // Show success feedback
        showNotification('Code copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy code', 'error');
    } finally {
        document.body.removeChild(textarea);
    }
}

// Download individual file
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification(`${filename} downloaded successfully!`, 'success');
}

// Download all files as ZIP
function downloadAllFiles() {
    const zip = new JSZip();
    
    // Add all the script files to the zip
    const files = [
        {
            name: 'setup.bat',
            content: document.getElementById('setup-code').innerText
        },
        {
            name: 'ConfigTarea.ps1',
            content: document.getElementById('config-code').innerText
        },
        {
            name: 'IniciarMineria.ps1',
            content: document.getElementById('miner-code').innerText
        },
        {
            name: 'wallet.txt',
            content: document.getElementById('wallet-code').innerText
        }
    ];
    
    // Add files to zip
    files.forEach(file => {
        zip.file(file.name, file.content);
    });
    
    // Add README file
    const readmeContent = `# Silent Monero Miner Package

## Installation Instructions

1. Copy all files to a USB drive
2. Run setup.bat as Administrator on target Windows PC
3. The system will automatically install and configure the mining software
4. Mining will start when the computer is idle

## Files Included

- setup.bat - Main installer script
- ConfigTarea.ps1 - PowerShell configuration script
- IniciarMineria.ps1 - Main mining script with idle detection
- wallet.txt - Monero wallet address (edit this with your own address)

## Important Notes

- This software should only be used on systems you own or have explicit permission to mine on
- The miner automatically detects user activity and pauses mining when the computer is in use
- CPU usage is limited to prevent system slowdowns
- All mining profits go to the wallet address specified in wallet.txt

## Legal Disclaimer

Use this software responsibly and in compliance with all applicable laws and regulations. The authors are not responsible for any misuse of this software.
`;
    
    zip.file('README.md', readmeContent);
    
    // Generate and download the zip file
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'monero-miner-package.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Complete package downloaded successfully!', 'success');
    }).catch(function(error) {
        console.error('Error creating zip:', error);
        showNotification('Failed to create package', 'error');
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    const contentStyle = `
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ff6600'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
    `;
    
    notification.querySelector('.notification-content').style.cssText = contentStyle;
    
    const closeBtnStyle = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        transition: opacity 0.2s;
    `;
    
    notification.querySelector('.notification-close').style.cssText = closeBtnStyle;
    
    // Add animation styles
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .notification-close:hover {
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(13, 13, 13, 0.98)';
    } else {
        navbar.style.background = 'rgba(13, 13, 13, 0.95)';
    }
});

// Auto-resize code blocks
function resizeCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.code-content');
    codeBlocks.forEach(block => {
        const lines = block.innerText.split('\n').length;
        const minHeight = Math.min(lines * 20, 400); // Max 400px height
        block.style.minHeight = `${minHeight}px`;
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    resizeCodeBlocks();
    
    // Add loading animation to buttons
    const buttons = document.querySelectorAll('button, .hero-btn, .download-all-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
                setTimeout(() => {
                    this.classList.remove('loading');
                }, 2000);
            }
        });
    });
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.step, .code-block, .faq-item');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Handle window resize
window.addEventListener('resize', () => {
    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768) {
        const nav = document.querySelector('nav');
        nav.classList.remove('active');
        
        const spans = document.querySelectorAll('.mobile-menu-btn span');
        spans.forEach(span => {
            span.style.transform = 'none';
            span.style.opacity = '1';
        });
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close mobile menu
    if (e.key === 'Escape') {
        const nav = document.querySelector('nav');
        if (nav.classList.contains('active')) {
            nav.classList.remove('active');
            
            const spans = document.querySelectorAll('.mobile-menu-btn span');
            spans.forEach(span => {
                span.style.transform = 'none';
                span.style.opacity = '1';
            });
        }
    }
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimized scroll handler
const optimizedScrollHandler = debounce(() => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(13, 13, 13, 0.98)';
    } else {
        navbar.style.background = 'rgba(13, 13, 13, 0.95)';
    }
}, 10);

window.addEventListener('scroll', optimizedScrollHandler);