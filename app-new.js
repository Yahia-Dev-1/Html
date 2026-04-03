// Update eye positions continuously
    function updateEyes() {
        const pupils = document.querySelectorAll('.pupil');
        
        // Update all pupils
        pupils.forEach(pupil => {
            pupil.style.transform = `translate(calc(-50% + ${mouseX}px), calc(-50% + ${mouseY}px))`;
        });
        
        animationFrame = requestAnimationFrame(updateEyes);
    }
