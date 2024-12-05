// Dynamic Starry Sky Effect
document.addEventListener("DOMContentLoaded", () => {
    // Create and append the canvas
    const canvas = document.createElement("canvas");
    canvas.id = "starry-sky";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    // Set canvas size to match the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Adjust canvas size on window resize
    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initializeStars(); // Reinitialize stars after resize
    });

    // Create an array to hold star properties
    let stars = [];
    const starCount = 200; // Number of stars

    // Initialize stars
    function initializeStars() {
        stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2,
                alpha: Math.random(),
                speed: Math.random() * 0.02,
            });
        }
    }

    // Draw stars
    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        stars.forEach((star) => {
            star.alpha += star.speed;
            if (star.alpha > 1 || star.alpha < 0) star.speed *= -1;

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; // White star with transparency
            ctx.fill();
        });
    }

    // Animation loop
    function animate() {
        drawStars();
        requestAnimationFrame(animate);
    }

    // Initialize and start animation
    initializeStars();
    animate();
});
