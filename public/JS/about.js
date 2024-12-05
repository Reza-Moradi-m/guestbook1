// Dynamic Starry Sky Effect
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("starry-sky");
    const ctx = canvas.getContext("2d");

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();

    // Adjust canvas size on window resize
    window.addEventListener("resize", resizeCanvas);

    const stars = [];
    const starCount = 300; // Number of stars

    // Initialize stars
    function initializeStars() {
        stars.length = 0;
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2,
                alpha: Math.random(),
                speed: Math.random() * 0.01,
            });
        }
    }
    initializeStars();

    // Draw stars
    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        stars.forEach((star) => {
            star.alpha += star.speed;
            if (star.alpha > 1 || star.alpha < 0) star.speed *= -1;

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        });
    }

    // Animation loop
    function animate() {
        drawStars();
        requestAnimationFrame(animate);
    }
    animate();
});
