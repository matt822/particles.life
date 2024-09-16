window.onload = function() {
    initialize();
};

function initialize() {

    let particleSizeMultiplier = 1; // Default value
    let currentText = 'particles';
    let isClockActive = false;
    let clockSettings = {
        format: '24', // '24' or '12'
        showSeconds: true
    };
    let previousTime = getCurrentTimeString(); // Initialize previousTime
    let characterPositions = [];
    let fontSize;
    let dpr; // Ensure dpr is declared in the outer scope
    let wakeLock = null;


    // Get the canvas and context
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    // Define particle density and maximum particles
    const PARTICLE_DENSITY = 150; // Particles per 10,000 square pixels
    const MAX_MOVING_PARTICLES = 2000;
    const PARTICLE_SIZE_SCALE = 1;

    // Particle class
    function Particle(x, y, color, type, size, characterIndex = null) {
        this.x = x;
        this.y = y;
        this.originX = x; // For static destination particles
        this.originY = y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.color = color;
        this.originalColor = color; // Store original color
        this.type = type; // 'moving' or 'letter'
        this.size = size;
        this.collisionCount = 0; // Tracking collisions
        this.opacity = 1; // Opacity for fade-out effect
        this.fadeOut = false; // Control when the particle fades out
        this.characterIndex = characterIndex; // To map particles to characters
    }

    var letterParticles = [];
    var movingParticles = [];
    var mouse = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
    };

    // Variables to hold current particle colors
    let staticParticleColors = [];
    let movingParticleColors = [];
    // Wake settings to keep iPhone alive
    async function requestWakeLock() {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock is active.');

            // Listen for visibility change events
            document.addEventListener('visibilitychange', handleVisibilityChange);
        } catch (err) {
            console.error(`Could not obtain wake lock: ${err.message}`);
        }
    }

    // Handle when the app becomes invisible
    function handleVisibilityChange() {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    }

    // Release the wake lock when it's no longer needed
    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock.release().then(() => {
                console.log('Wake lock is released.');
                wakeLock = null;
            });
        }
    }

    // Request the wake lock when the app starts
    requestWakeLock();

    // Optionally, you can call releaseWakeLock when the user navigates away or when the app is not active.
    window.addEventListener('beforeunload', releaseWakeLock);



    // Default to the first color palette
    const defaultPaletteIndex = 0;

    // Define color palettes
    const colorPalettes = [
        {
            name: 'Grove',
            backgroundColor: '#EBF5DF',
            staticParticleColors: ['#3B6B32', '#556B2F', '#2F4F4F'],  // Significantly darker greens and earthy tones
            movingParticleColors: ['#E57373', '#FFCDD2', '#8BC34A', '#C8E6C9']
        },
        {
            name: 'Pumpkin Spice',
            backgroundColor: '#3E2723',  // Dark brown, like coffee or cinnamon
            staticParticleColors: ['#FF7518', '#D35400', '#8E5A2D', '#E0A458'],  // Pumpkin orange, cinnamon brown, and spice tones
            movingParticleColors: ['#F39C12', '#FFB84D', '#FFDDC1', '#B77D52']  // Soft creams and light spices
        },        
        {
            name: 'Mars',
            backgroundColor: '#000000',
            staticParticleColors: ['#FF6F61', '#FF8C42', '#703e00d3', '#FFC857'],
            movingParticleColors: ['#0B0C10', '#1F2833', '#C5C6C7', '#45A29E']
        },
        {
            name: 'Tropical Fusion',
            backgroundColor: '#344E41',
            staticParticleColors: ['#A4C3B2', '#D9BF77', '#FE7F2D'],
            movingParticleColors: ['#E07A5F', '#F4F1DE', '#81B29A', '#F2CC8F']
        },
        {
            name: 'Deep Forest',
            backgroundColor: '#0A2E14',  // Very dark, deep forest green
            staticParticleColors: ['#E0E0E0', '#D8D8D8', '#CFCFCF', '#BFBFBF'],  // Various shades of off-white
            movingParticleColors: ['#1B4332', '#2D6A4F', '#4A4E69', '#3A403D', '#6B4226']  // Dark greens and browns for a natural, earthy feel
        },
        {
            name: 'Frozen Tundra',
            backgroundColor: '#1C3144',  // Arctic blue
            staticParticleColors: ['#FFFFFF', '#E5E5E5', '#CCCCCC'],  // Icy whites and grays
            movingParticleColors: ['#A0D9D9', '#5DADE2', '#85C1E9', '#3498DB']  // Cool ice-inspired blues
        },
        {
            name: 'Cyberpunk',
            backgroundColor: '#000000',  // Dark urban night
            staticParticleColors: ['#FF00FF', '#00FFFF', '#FF69B4', '#DA70D6'],  // Vibrant neon purples and pinks
            movingParticleColors: ['#FF6347', '#FF4500', '#FFD700', '#FF1493']  // Electric neon glow colors
        },        
    ];


    // Apply the default color palette
    applyColorPalette(defaultPaletteIndex);

    // Define a global fontSize


    // Function to update fontSize based on canvas size and multiplier
    function updateFontSize() {
        if (canvas.width > 0 && canvas.height > 0 && dpr > 0) {
            fontSize = Math.min(canvas.width / dpr, canvas.height / dpr) * 0.17; // Use a consistent scaling factor
        } else {
            console.warn('Canvas dimensions or dpr are invalid:', canvas.width, canvas.height, dpr);
            fontSize = 12; // Fallback font size
        }
    }


    // Get the sliders
    const particleSizeSlider = document.getElementById('particle-size-slider');
    // const particleDensitySlider = document.getElementById('particle-density-slider');

    // Event listener for particle size slider
    particleSizeSlider.addEventListener('input', function() {
        particleSizeMultiplier = parseFloat(this.value);
        updateFontSize(); // Update fontSize if necessary
        // Recreate particles with new size
        createLetterParticles(isClockActive ? getCurrentTimeString() : currentText);
        createMovingParticles();
    });

    // Function to scale particle size based on window dimensions
    function scaleParticleSize(width, height) {
        const baseSize = 1;
        const scalingFactor = Math.min(width, height) / 800;
        return Math.max(baseSize * scalingFactor * particleSizeMultiplier, 0.5);
    }    

    // Resize canvas and handle high DPI displays
    function resizeCanvas() {
        dpr = window.devicePixelRatio || 1; // Assign to the outer dpr variable
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);

        updateFontSize(); // Update fontSize based on new canvas size

        createLetterParticles(isClockActive ? getCurrentTimeString() : currentText);
        createMovingParticles();

        // Reset mouse position
        mouse.x = window.innerWidth / 2;
        mouse.y = window.innerHeight / 2;
    }


    // Debounce function to limit the rate at which a function can fire
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Attach the debounced resize event
    window.addEventListener('resize', debounce(resizeCanvas, 200));
    
    function getSpacing(fontSize) {
        return Math.max(2, Math.floor(fontSize / 35));
    }

    // Create particles that form letters or shapes
    function createLetterParticles(text) {
        letterParticles = [];
        characterPositions = []; // Reset character positions
        var displayText = text || 'MARS'; // Default text
    
        // Use the global fontSize
        ctx.font = 'bold ' + fontSize + 'px Arial';
    
        // Handle multiple lines by splitting text
        const lines = displayText.split('\n');
        const totalHeight = lines.length * fontSize * 1.2;
        const centerY = (canvas.height / dpr) / 2 - totalHeight / 2 + fontSize / 2;
    
        let characterIndex = 0; // Initialize character index
    
        lines.forEach((line, lineIndex) => {
            // Calculate the total width of the line
            let totalLineWidth = 0;
            const charWidths = [];
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const metrics = ctx.measureText(char);
                const charWidth = metrics.width;
                charWidths.push(charWidth);
                totalLineWidth += charWidth;
                if (i < line.length - 1) {
                    totalLineWidth += 5; // Fixed spacing, can be made dynamic if needed
                }
            }
    
            // Starting X position to center the line
            let startX = (canvas.width / dpr) / 2 - totalLineWidth / 2;
            const yOffset = centerY + lineIndex * fontSize * 1.2;
 
            for (let charIdx = 0; charIdx < line.length; charIdx++) {
                const char = line[charIdx];
                const charWidth = charWidths[charIdx];
                const xOffset = startX;
                // const yOffset = centerY + lineIndex * fontSize * 1.2;
    
                // Store the position for this characterIndex
                characterPositions[characterIndex] = { x: xOffset, y: yOffset };
    
                // Create an offscreen canvas for the specific character
                const charCanvas = document.createElement('canvas');
                const charCtx = charCanvas.getContext('2d');
                charCanvas.width = canvas.width / dpr;
                charCanvas.height = canvas.height / dpr;
    
                // Draw the character onto the offscreen canvas
                charCtx.clearRect(0, 0, charCanvas.width, charCanvas.height);
                charCtx.fillStyle = '#FFFFFF';
                charCtx.textAlign = 'left';
                charCtx.textBaseline = 'middle';
                charCtx.font = 'bold ' + fontSize + 'px Arial'; // Use global fontSize
                charCtx.fillText(char, xOffset, yOffset);
    
                // Ensure charCanvas has valid dimensions before getting image data
                if (charCanvas.width > 0 && charCanvas.height > 0) {
                    // Get image data for the specific character
                    const charImageData = charCtx.getImageData(0, 0, charCanvas.width, charCanvas.height);
                    const charData = charImageData.data;
    
                    // Dynamically calculate spacing based on fontSize
                    const spacing = getSpacing(fontSize); // Minimum spacing of 2
    
                    // Create particles where the character pixels are
                    for (let y = 0; y < charCanvas.height; y += spacing) { // Dynamic spacing
                        for (let x = 0; x < charCanvas.width; x += spacing) { // Dynamic spacing
                            const indexData = (y * charCanvas.width + x) * 4;
                            if (charData[indexData + 3] > 128) { // Alpha > 128
                                const color = getStaticParticleColor(); // Assign color per particle
                                const size = scaleParticleSize(canvas.width / dpr, canvas.height / dpr) * (1 + Math.random()) * PARTICLE_SIZE_SCALE;
                                letterParticles.push(new Particle(x, y, color, 'letter', size, characterIndex));
                            }
                        }
                    }
                } else {
                    console.error('Invalid charCanvas dimensions:', charCanvas.width, charCanvas.height);
                }
    
                // Increment startX for the next character
                startX += charWidth + 5; // Fixed spacing, can be made dynamic
                characterIndex++;
            }
        });
    
        previousTime = displayText; // Initialize previousTime
    }



    function getStaticParticleColor() {
        return staticParticleColors[Math.floor(Math.random() * staticParticleColors.length)];
    }

    function getMovingParticleColor(){
        return movingParticleColors[Math.floor(Math.random() * movingParticleColors.length)];
    }

    function createMovingParticles() {
        movingParticles = [];
        const dpr = window.devicePixelRatio || 1;
        const windowArea = (canvas.width / dpr) * (canvas.height / dpr);
        let particleCount = Math.floor((windowArea / 10000) * PARTICLE_DENSITY);
        particleCount = Math.min(particleCount, MAX_MOVING_PARTICLES);

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * (canvas.width / dpr);
            const y = Math.random() * (canvas.height / dpr);
            const color = getMovingParticleColor();
            const size = scaleParticleSize(canvas.width / dpr, canvas.height / dpr) * PARTICLE_SIZE_SCALE * 1.2;
            movingParticles.push(new Particle(x, y, color, 'moving', size));
        }
    }    

    // Initial canvas setup
    resizeCanvas();

    // Mousemove Event Listener
    canvas.addEventListener('mousemove', function(e){
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw letter particles
        for (let i = 0; i < letterParticles.length; i++) {
            const p = letterParticles[i];

            // Gravitational pull to original position
            const dx = p.originX - p.x;
            const dy = p.originY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = dist * 0.01;
            const angle = Math.atan2(dy, dx);

            // Apply acceleration
            p.ax = Math.cos(angle) * force;
            p.ay = Math.sin(angle) * force;

            // Update velocity with acceleration
            p.vx += p.ax;
            p.vy += p.ay;

            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;

            // Dampen velocity
            p.vx *= 0.9;
            p.vy *= 0.9;

            // Particle fading out
            if (p.fadeOut) {
                p.opacity -= 0.02;
                if (p.opacity <= 0) {
                    resetParticle(p);
                    continue;
                }
            }

            // Draw particle
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Update and draw moving particles
        for (let i = 0; i < movingParticles.length; i++) {
            const p = movingParticles[i];

            // Calculate distance to cursor
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Attract to cursor
            const attractRadius = 10000;
            const force = (attractRadius - dist) / attractRadius * 0.05;
            if (dist !== 0) {
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;

            // Damping
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Fade out when close to cursor
            const fadeRadius = 30;
            if (dist < fadeRadius) {
                p.fadeOut = true;
            }

            // Collision detection with letter particles
            for (let j = 0; j < letterParticles.length; j++) {
                const lp = letterParticles[j];
                const dx2 = lp.x - p.x;
                const dy2 = lp.y - p.y;
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                const minDist2 = p.size + lp.size;

                if (dist2 < minDist2) {
                    const angle = Math.atan2(dy2, dx2);
                    const overlap = minDist2 - dist2;

                    const fx = Math.cos(angle) * overlap * 0.2;
                    const fy = Math.sin(angle) * overlap * 0.2;

                    lp.vx += fx;
                    lp.vy += fy;

                    p.vx -= fx;
                    p.vy -= fy;

                    p.collisionCount = (p.collisionCount || 0) + 1;

                    if (p.collisionCount >= 3) {
                        p.fadeOut = true;
                        break;
                    }
                }
            }

            // Particle fading out
            if (p.fadeOut) {
                p.opacity -= 0.02;
                if (p.opacity <= 0) {
                    resetParticle(p);
                    continue;
                }
            }

            // Draw particle
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function resetParticle(p) {
        const dpr = window.devicePixelRatio || 1;
        if (p.type === 'moving') {
            p.x = Math.random() * (canvas.width / dpr);
            p.y = Math.random() * (canvas.height / dpr);
            p.opacity = 1;
            p.fadeOut = false;
            p.collisionCount = 0;
            p.color = getMovingParticleColor();
            p.vx = 0;
            p.vy = 0;
            p.size = scaleParticleSize(canvas.width / dpr, canvas.height / dpr);
        } else if (p.type === 'letter') {
            // Retain the original color assigned during creation
            p.x = p.originX;
            p.y = p.originY;
            p.vx = 0;
            p.vy = 0;
            p.opacity = 1;
            p.fadeOut = false;
            // p.color remains unchanged unless the palette changes
        }
    }
    

    animate();

    // Toolbar Event Listeners
    document.getElementById('text-option').addEventListener('click', openTextInputModal);
    document.getElementById('color-option').addEventListener('click', openColorSelectionModal);
    document.getElementById('clock-option').addEventListener('click', openClockSettingsModal);

    // Text Input Modal Logic
    function openTextInputModal() {
        const modal = document.getElementById('text-modal');
        modal.classList.add('show');
        modal.style.display = 'block';
        document.getElementById('user-text').focus();
    }

    document.getElementById('text-modal-close').addEventListener('click', function() {
        const modal = document.getElementById('text-modal');
        modal.classList.remove('show');
        modal.style.display = 'none';
    });

    document.getElementById('submit-text').addEventListener('click', function() {
        var userInput = document.getElementById('user-text').value.trim();
        if (userInput) {
            currentText = userInput;
            isClockActive = false; // Deactivate clock when user inputs text
            createLetterParticles(currentText);
            const modal = document.getElementById('text-modal');
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    });

    // Handle Enter key for submitting text
    document.getElementById('user-text').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('submit-text').click();
        }
    });

    // Color Selection Modal Logic
    function openColorSelectionModal() {
        const modal = document.getElementById('color-modal');
        const container = modal.querySelector('.palette-container');
        container.innerHTML = '';

        colorPalettes.forEach((palette, index) => {
            const paletteDiv = document.createElement('div');
            paletteDiv.classList.add('palette');
            paletteDiv.setAttribute('data-index', index);

            // Set background color to match the palette's backgroundColor
            paletteDiv.style.backgroundColor = palette.backgroundColor;

            // Display color swatches representing movingParticleColors
            palette.movingParticleColors.forEach(color => {
                const swatch = document.createElement('div');
                swatch.classList.add('color-swatch');
                swatch.style.backgroundColor = color;
                paletteDiv.appendChild(swatch);
            });

            // Palette Name with text color randomly selected from staticParticleColors
            const nameDiv = document.createElement('div');
            nameDiv.classList.add('palette-name');
            nameDiv.textContent = palette.name;
            // Randomly select a color from staticParticleColors for the text
            const textColor = palette.staticParticleColors[Math.floor(Math.random() * palette.staticParticleColors.length)];
            nameDiv.style.color = textColor;
            paletteDiv.appendChild(nameDiv);

            paletteDiv.addEventListener('click', function() {
                applyColorPalette(index);
                modal.classList.remove('show');
                modal.style.display = 'none';
            });

            container.appendChild(paletteDiv);
        });

        modal.classList.add('show');
        modal.style.display = 'block';
    }

    document.getElementById('color-modal-close').addEventListener('click', function() {
        const modal = document.getElementById('color-modal');
        modal.classList.remove('show');
        modal.style.display = 'none';
    });

    function applyColorPalette(index) {
        const palette = colorPalettes[index];

        // Update background color
        document.body.style.backgroundColor = palette.backgroundColor;

        // Update particle colors
        staticParticleColors = palette.staticParticleColors;
        movingParticleColors = palette.movingParticleColors;

        // Recreate particles with new colors
        createLetterParticles(isClockActive ? getCurrentTimeString() : currentText);
        createMovingParticles();
    }

    // Clock Settings Modal Logic
    function openClockSettingsModal() {
        const modal = document.getElementById('clock-modal');
        modal.classList.add('show');
        modal.style.display = 'block';

        // Populate current settings
        document.getElementById('time-format').value = clockSettings.format;
        document.getElementById('show-seconds').checked = clockSettings.showSeconds;
    }

    document.getElementById('clock-modal-close').addEventListener('click', function() {
        const modal = document.getElementById('clock-modal');
        modal.classList.remove('show');
        modal.style.display = 'none';
    });

    document.getElementById('clock-settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        clockSettings.format = document.getElementById('time-format').value;
        clockSettings.showSeconds = document.getElementById('show-seconds').checked;
        isClockActive = true;
        createLetterParticles(getCurrentTimeString());
        const modal = document.getElementById('clock-modal');
        modal.classList.remove('show');
        modal.style.display = 'none';
    });

    // Utility function to get current time as string
    function getCurrentTimeString() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        let period = '';

        if (clockSettings.format === '12') {
            period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
        }

        hours = String(hours).padStart(2, '0');
        minutes = String(minutes).padStart(2, '0');
        if (clockSettings.showSeconds) {
            seconds = String(seconds).padStart(2, '0');
        }

        let timeString = clockSettings.format === '24' ? `${hours}:${minutes}` : `${hours}:${minutes} ${period}`;
        if (clockSettings.showSeconds) {
            timeString = clockSettings.format === '24' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:${seconds} ${period}`;
        }

        return timeString;
    }

    // Update time every second or minute based on settings
    setInterval(() => {
        if (isClockActive) {
            const newTime = getCurrentTimeString();
            updateClockParticles(newTime);
        }
    }, clockSettings.showSeconds ? 1000 : 60000);

    // Function to update only changing digits in the clock
    function updateClockParticles(newTime) {
        const oldTime = previousTime;
        const oldChars = oldTime.split('');
        const newChars = newTime.split('');
    
        // Determine the maximum length between old and new time strings
        const maxLength = Math.max(oldChars.length, newChars.length);
    
        for (let index = 0; index < maxLength; index++) {
            const oldChar = oldChars[index] || '';
            const newChar = newChars[index] || '';
    
            if (newChar !== oldChar) {
                // Remove existing particles for this characterIndex
                letterParticles = letterParticles.filter(p => p.characterIndex !== index);
    
                // Create new particles for the updated character at the correct position
                if (newChar !== '') { // Only create particles if there's a character
                    const newCharacterParticles = createParticlesForCharacter(newChar, index);
                    letterParticles = letterParticles.concat(newCharacterParticles);
                }
            }
        }
    
        // Update previousTime after processing all changes
        previousTime = newTime;
    }
    


    // Helper function to create particles for a specific character
    function createParticlesForCharacter(char, characterIndex) {
        const tempParticles = [];
        const spacing = getSpacing(fontSize); // Dynamic spacing based on fontSize
    
        // Retrieve the stored position for this characterIndex
        const position = characterPositions[characterIndex];
        if (!position) {
            console.error(`No position found for characterIndex ${characterIndex}`);
            return tempParticles;
        }
    
        const xOffset = position.x;
        const yOffset = position.y;
    
        // Create an offscreen canvas for the specific character
        const charCanvas = document.createElement('canvas');
        const charCtx = charCanvas.getContext('2d');
        charCanvas.width = canvas.width / dpr;
        charCanvas.height = canvas.height / dpr;
    
        // Draw the character onto the offscreen canvas
        charCtx.clearRect(0, 0, charCanvas.width, charCanvas.height);
        charCtx.fillStyle = '#FFFFFF';
        charCtx.textAlign = 'left';
        charCtx.textBaseline = 'middle';
        charCtx.font = 'bold ' + fontSize + 'px Arial'; // Use global fontSize
        charCtx.fillText(char, xOffset, yOffset);
    
        // Ensure charCanvas has valid dimensions before getting image data
        if (charCanvas.width > 0 && charCanvas.height > 0) {
            // Get image data from the offscreen canvas
            const imageData = charCtx.getImageData(0, 0, charCanvas.width, charCanvas.height);
            const data = imageData.data;
    
            // Create particles where the character pixels are
            for (let y = 0; y < charCanvas.height; y += spacing) {
                for (let x = 0; x < charCanvas.width; x += spacing) {
                    const indexData = (y * charCanvas.width + x) * 4;
                    if (data[indexData + 3] > 128) { // Alpha > 128
                        const color = getStaticParticleColor(); // Assign color per particle
                        const size = scaleParticleSize(canvas.width / dpr, canvas.height / dpr) * (1 + Math.random()) * PARTICLE_SIZE_SCALE;
                        tempParticles.push(new Particle(x, y, color, 'letter', size, characterIndex));
                    }
                }
            }
        } else {
            console.error('Invalid charCanvas dimensions:', charCanvas.width, charCanvas.height);
        }
    
        return tempParticles;
    }
    


    // Commented out problematic console.log
    // console.log(`Character Index: ${characterIndex}, x: ${xOffset}, y: ${yOffset}`);



    // === New Feature Implementations ===

    // 1. Close modals when clicking outside of them
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        modal.style.display = 'block';
        modal.classList.add('prevent-close'); // Add class to prevent immediate closing
    
        // Remove the class after a short delay
        setTimeout(() => {
            modal.classList.remove('prevent-close');
        }, 100);
    }
    
    // Event listeners for opening modals
    document.getElementById('text-option').addEventListener('click', () => openModal('text-modal'));
    document.getElementById('color-option').addEventListener('click', () => openModal('color-modal'));
    document.getElementById('clock-option').addEventListener('click', () => openModal('clock-modal'));
    
    // Event listener for closing modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            if (!modal.classList.contains('prevent-close') && !modal.querySelector('.modal-content').contains(event.target)) {
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        });
    });
    
    // Prevent click events inside the modal content from propagating to the window
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
    
    // Prevent click events inside the modal content from propagating to the window
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });

    // 2. Incrementally adjust particle size using icons
    const smallParticleIcon = document.querySelector('.small-particle');
    const largeParticleIcon = document.querySelector('.large-particle');

    smallParticleIcon.addEventListener('click', function() {
        // Decrease particleSizeMultiplier by step, ensuring it doesn't go below 0.5
        const step = parseFloat(particleSizeSlider.step) || 0.1;
        particleSizeMultiplier = Math.max(parseFloat(particleSizeSlider.min), (particleSizeMultiplier - step).toFixed(2));
        particleSizeSlider.value = particleSizeMultiplier;
        updateFontSize();
        createLetterParticles(isClockActive ? getCurrentTimeString() : currentText);
        createMovingParticles();
    });

    largeParticleIcon.addEventListener('click', function() {
        // Increase particleSizeMultiplier by step, ensuring it doesn't exceed 2
        const step = parseFloat(particleSizeSlider.step) || 0.1;
        particleSizeMultiplier = Math.min(parseFloat(particleSizeSlider.max), (parseFloat(particleSizeMultiplier) + step).toFixed(2));
        particleSizeSlider.value = particleSizeMultiplier;
        updateFontSize();
        createLetterParticles(isClockActive ? getCurrentTimeString() : currentText);
        createMovingParticles();
    });

}
