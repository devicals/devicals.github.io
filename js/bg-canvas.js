(function () {
    function getAccentHex() {
        var isDark = localStorage.getItem('dark-mode') !== 'false';
        var theme = localStorage.getItem('theme') || 'primary';
        if (!isDark) return '#d08770';
        if (theme === 'obsidian') return '#7d5cf2';
        return '#e6b450';
    }

    function hexToHsl(hex) {
        hex = hex.replace('#', '');
        var r = parseInt(hex.substring(0, 2), 16) / 255;
        var g = parseInt(hex.substring(2, 4), 16) / 255;
        var b = parseInt(hex.substring(4, 6), 16) / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
        }
        return { h: h, s: s * 100, l: l * 100 };
    }

    var canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);
    document.body.classList.add('has-bg-canvas');

    var ctx = canvas.getContext('2d');
    var width = 0, height = 0, dpr = 1;
    var mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    var stars = [];
    var STAR_COUNT = 150;
    var running = true;
    var mode = localStorage.getItem('bg-effect') || 'blackhole';

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initStars();
    }

    function initStars() {
        stars = [];
        for (var i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 1.3 + 0.3,
                depth: Math.random() * 0.85 + 0.15,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 1.4 + 0.4
            });
        }
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) {
        targetMouseX = e.clientX;
        targetMouseY = e.clientY;
    });
    window.addEventListener('storage', function (e) {
        if (e.key === 'bg-effect') mode = e.newValue || 'blackhole';
    });

    window.setBgEffect = function (val) {
        mode = val;
        localStorage.setItem('bg-effect', val);
    };

    function drawStars(hue, t) {
        mouseX += (targetMouseX - mouseX) * 0.04;
        mouseY += (targetMouseY - mouseY) * 0.04;
        var cx = width / 2, cy = height / 2;

        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var parX = (mouseX - cx) * 0.025 * s.depth;
            var parY = (mouseY - cy) * 0.025 * s.depth;
            var twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
            ctx.beginPath();
            ctx.arc(s.x + parX, s.y + parY, s.r, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + hue + ', 15%, ' + (72 + twinkle * 22) + '%, ' + (0.2 + twinkle * 0.55) + ')';
            ctx.fill();
        }
    }

    function drawBlackHole(hue, t) {
        var cx = width;
        var cy = height * 0.42;
        var horizonR = Math.min(width, height) * 0.20;
        var diskR = horizonR * 3.4;

        ctx.save();

        var glow = ctx.createRadialGradient(cx, cy, horizonR * 0.6, cx, cy, diskR * 1.35);
        glow.addColorStop(0, 'hsla(' + hue + ', 35%, 55%, 0.32)');
        glow.addColorStop(0.45, 'hsla(' + hue + ', 25%, 32%, 0.12)');
        glow.addColorStop(1, 'hsla(' + hue + ', 15%, 10%, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, diskR * 1.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'lighter';
        var rings = 30;
        for (var i = 0; i < rings; i++) {
            var pct = i / rings;
            var r = horizonR * 1.12 + pct * (diskR - horizonR);
            var wobble = Math.sin(t * 0.6 + pct * 9) * horizonR * 0.04;
            var lightness = 18 + (1 - pct) * 42;
            var alpha = (1 - pct) * 0.45;
            ctx.beginPath();
            ctx.ellipse(cx, cy, r + wobble, r * 0.32, t * 0.15 + pct * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'hsla(' + hue + ', 28%, ' + lightness + '%, ' + alpha + ')';
            ctx.lineWidth = Math.max(1, horizonR * 0.045);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        ctx.beginPath();
        ctx.arc(cx, cy, horizonR, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.shadowColor = 'hsla(' + hue + ', 35%, 50%, 0.55)';
        ctx.shadowBlur = horizonR * 0.5;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    function tick() {
        if (!running) return;
        ctx.clearRect(0, 0, width, height);

        if (mode !== 'none') {
            var hex = getAccentHex();
            var hsl = hexToHsl(hex);
            var hue = Math.round(hsl.h);
            var t = Date.now() * 0.001;

            drawStars(hue, t);
            if (mode === 'blackhole') drawBlackHole(hue, t);
        }

        requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) requestAnimationFrame(tick);
    });

    resize();
    requestAnimationFrame(tick);
})();