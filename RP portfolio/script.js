document.addEventListener('DOMContentLoaded', () => {
    const projectItems = document.querySelectorAll('.project-item-youtube-like');

    projectItems.forEach(item => {
        const video = item.querySelector('.preview-video');

        item.addEventListener('mouseenter', () => {
            if (video) {
                video.play().catch(error => {
                    console.warn("Error al intentar reproducir el video:", error);
                });
            }
        });

        item.addEventListener('mouseleave', () => {
            if (video) {
                video.pause();
                video.currentTime = 0; // Reinicia el video al principio
            }
        });
    });
});