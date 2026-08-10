(function () {
    function getThemeColors() {
        var isDark = localStorage.getItem('dark-mode') !== 'false';
        var theme = localStorage.getItem('theme') || 'primary';
        if (!isDark) return { bg: '#e8e5dc', accent: '#d08770' };
        if (theme === 'obsidian') return { bg: '#121212', accent: '#7d5cf2' };
        return { bg: '#141311', accent: '#e6b450' };
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

    var root = document.createElement('div');
    root.id = 'bg-fx-root';
    root.style.position = 'fixed';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100vw';
    root.style.height = '100vh';
    root.style.zIndex = '-1';
    root.style.overflow = 'hidden';
    root.style.pointerEvents = 'none';

    var solidLayer = document.createElement('div');
    solidLayer.id = 'bg-fx-solid';
    solidLayer.style.position = 'absolute';
    solidLayer.style.inset = '0';
    root.appendChild(solidLayer);

    var canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    root.appendChild(canvas);

    document.body.insertBefore(root, document.body.firstChild);
    document.body.classList.add('has-bg-canvas');

    var ctx = canvas.getContext('2d');
    var width = 0, height = 0, dpr = 1;
    var mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    var running = true;
    var mode = localStorage.getItem('bg-effect') || 'particles';

    var particles = [];
    var PARTICLE_COUNT = 75;
    var LINK_DIST = 150;

    var GRID_SIZE = 46;
    var gridOffset = 0;

    var stars = [];
    var STAR_COUNT = 150;

    function applyTint() {
        var colors = getThemeColors();
        solidLayer.style.background = colors.bg;
    }

    function applyMode() {
        canvas.style.display = mode === 'none' ? 'none' : 'block';
    }

    function initParticles() {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35
            });
        }
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

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initParticles();
        initStars();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) {
        targetMouseX = e.clientX;
        targetMouseY = e.clientY;
    });
    window.addEventListener('storage', function (e) {
        if (e.key === 'bg-effect') { mode = e.newValue || 'particles'; applyMode(); }
        if (e.key === 'theme' || e.key === 'dark-mode') applyTint();
    });

    window.setBgEffect = function (val) {
        mode = val;
        localStorage.setItem('bg-effect', val);
        applyMode();
    };
    window.refreshBgTheme = applyTint;

    function drawParticles(hue) {
        mouseX += (targetMouseX - mouseX) * 0.08;
        mouseY += (targetMouseY - mouseY) * 0.08;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var dxm = p.x - mouseX, dym = p.y - mouseY;
            var dm = Math.sqrt(dxm * dxm + dym * dym);
            if (dm < 140 && dm > 0.01) {
                var force = (140 - dm) / 140 * 0.03;
                p.vx += (dxm / dm) * force;
                p.vy += (dym / dm) * force;
            }
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
            p.x = Math.max(0, Math.min(width, p.x));
            p.y = Math.max(0, Math.min(height, p.y));
        }

        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var a = particles[i], b = particles[j];
                var dx = a.x - b.x, dy = a.y - b.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < LINK_DIST) {
                    var alpha = (1 - d / LINK_DIST) * 0.35;
                    ctx.strokeStyle = 'hsla(' + hue + ', 20%, 65%, ' + alpha + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
            var dxm2 = particles[i].x - mouseX, dym2 = particles[i].y - mouseY;
            var dm2 = Math.sqrt(dxm2 * dxm2 + dym2 * dym2);
            if (dm2 < 180) {
                var alpha2 = (1 - dm2 / 180) * 0.5;
                ctx.strokeStyle = 'hsla(' + hue + ', 25%, 70%, ' + alpha2 + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouseX, mouseY);
                ctx.stroke();
            }
        }

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + hue + ', 20%, 78%, 0.85)';
            ctx.fill();
        }
    }

    function drawGrid(hue) {
        mouseX += (targetMouseX - mouseX) * 0.08;
        mouseY += (targetMouseY - mouseY) * 0.08;

        gridOffset += 0.25;
        if (gridOffset > GRID_SIZE) gridOffset -= GRID_SIZE;

        var glowR = 170;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'hsla(' + hue + ', 18%, 55%, 0.14)';
        ctx.beginPath();
        for (var x = -GRID_SIZE + gridOffset; x < width + GRID_SIZE; x += GRID_SIZE) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (var y = -GRID_SIZE + gridOffset; y < height + GRID_SIZE; y += GRID_SIZE) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'hsla(' + hue + ', 28%, 68%, 0.45)';
        ctx.beginPath();
        for (var x = -GRID_SIZE + gridOffset; x < width + GRID_SIZE; x += GRID_SIZE) {
            if (Math.abs(x - mouseX) < glowR) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
        }
        for (var y = -GRID_SIZE + gridOffset; y < height + GRID_SIZE; y += GRID_SIZE) {
            if (Math.abs(y - mouseY) < glowR) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
        }
        ctx.stroke();

        var glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, glowR);
        glow.addColorStop(0, 'hsla(' + hue + ', 30%, 65%, 0.16)');
        glow.addColorStop(1, 'hsla(' + hue + ', 30%, 65%, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(mouseX - glowR, mouseY - glowR, glowR * 2, glowR * 2);
    }

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

    function tick() {
        if (!running) return;

        if (mode !== 'none') {
            ctx.clearRect(0, 0, width, height);
            var colors = getThemeColors();
            var hsl = hexToHsl(colors.accent);
            var hue = Math.round(hsl.h);
            var t = Date.now() * 0.001;

            if (mode === 'particles') drawParticles(hue);
            else if (mode === 'matrix') drawGrid(hue);
            else if (mode === 'stars') drawStars(hue, t);
        }

        requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) requestAnimationFrame(tick);
    });

    applyTint();
    applyMode();
    resize();
    requestAnimationFrame(tick);
})();