document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const statusElement = document.getElementById('status');
    
    // Set canvas dimensions
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let audioContext;
    let analyser;
    let dataArray;
    let source;
    let avgVolume = 0;
    let sensitivity = 2; // Sensitivity multiplier
    
    // Initialize audio context and start visualization
    async function init() {
        try {
            // Request permissions and create audio context
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256; // Smaller FFT for simpler visualization
            analyser.smoothingTimeConstant = 0.8; // Smoother transitions
            
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Create source from microphone
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            // Start visualization
            statusElement.textContent = "Listening to microphone...";
            draw();
            
            // Hide status after a few seconds
            setTimeout(() => {
                statusElement.style.opacity = "0";
                setTimeout(() => statusElement.style.display = "none", 500);
            }, 3000);
            
        } catch (err) {
            console.error('Error accessing microphone:', err);
            statusElement.textContent = 'Error: ' + err.message + '. Please allow microphone access and refresh.';
            statusElement.style.color = "#ff5555";
        }
    }
    
    // Calculate average volume
    function getAverageVolume(array) {
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            sum += array[i];
        }
        return (sum / array.length) * sensitivity;
    }
    
    // Main drawing function
    function draw() {
        requestAnimationFrame(draw);
        
        if (!analyser) return;
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume with smoothing
        const newAvgVolume = Math.min(255, getAverageVolume(dataArray));
        avgVolume = avgVolume * 0.7 + newAvgVolume * 0.3; // Smooth transition
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the simple line visualization
        drawAudioLine(avgVolume);
    }
    
    // Draw a simple horizontal line that reacts to audio
    function drawAudioLine(volume) {
        const centerY = canvas.height / 2;
        const lineWidth = Math.max(1, 2 + (volume / 255) * 6); // Line thickness based on volume
        const lineLength = canvas.width * 0.7; // 70% of screen width
        
        // Calculate start and end points to center the line
        const startX = (canvas.width - lineLength) / 2;
        const endX = startX + lineLength;
        
        // Wave amplitude based on volume
        const amplitude = (volume / 255) * 60; // Max 30px wave height
        
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = '#FFFFFF'; // Simple white line
        
        // Draw wave line
        ctx.beginPath();
        
        // If no significant audio, draw a straight line with minimal movement
        if (volume < 10) {
            // Add very slight movement even when silent
            const minWave = Math.sin(Date.now() / 1000) * 2;
            ctx.moveTo(startX, centerY + minWave);
            ctx.lineTo(endX, centerY + minWave);
        } else {
            // Draw a wavy line when there's audio
            const segments = 150;
            const segmentLength = lineLength / segments;
            
            for (let i = 0; i <= segments; i++) {
                const x = startX + (i * segmentLength);
                // Create a wave effect that moves with time and reacts to volume
                const waveOffset = Math.sin(i / 5 + Date.now() / 200) * amplitude;
                const y = centerY + waveOffset;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        
        ctx.stroke();
    }
    
    // Start automatically
    init();
});