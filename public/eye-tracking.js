// Update eye positions continuously
document.addEventListener('DOMContentLoaded', () => {
    const eyes = document.querySelectorAll(".eye");
    const passwordInput = document.getElementById('password');
    const characters = document.querySelectorAll('.character');

    console.log('Eye tracking initialized:', eyes.length, 'eyes found');

    const handleMove = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        eyes.forEach((eye) => {
            const rect = eye.getBoundingClientRect();
            
            // حساب مركز العين
            const eyeCenterX = rect.left + rect.width / 2;
            const eyeCenterY = rect.top + rect.height / 2;
            
            // حساب الزاوية بين الماوس/اللمس ومركز العين
            const angle = Math.atan2(clientY - eyeCenterY, clientX - eyeCenterX);
            
            // حساب أقصى مسافة للحركة (نصف قطر العين)
            const maxDistance = rect.width / 3;
            
            // حساب الإزاحة بناءً على الزاوية والمسافة القصوى
            const distance = Math.min(maxDistance, Math.sqrt(Math.pow(clientX - eyeCenterX, 2) + Math.pow(clientY - eyeCenterY, 2)) / 8);
            
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            // تطبيق الحركة باستخدام CSS variables
            eye.style.setProperty("--x", `${x}px`);
            eye.style.setProperty("--y", `${y}px`);
        });
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchstart", handleMove, { passive: true });

    // Password focus - close eyes
    passwordInput?.addEventListener('focus', () => {
        console.log('Password focused - closing eyes');
        characters.forEach(char => {
            char.classList.add('password-focused');
        });
    });

    passwordInput?.addEventListener('blur', () => {
        console.log('Password blurred - opening eyes');
        characters.forEach(char => {
            char.classList.remove('password-focused');
        });
    });
});
