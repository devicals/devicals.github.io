(function () {
    var isTouchDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isFinePointer = !isTouchDevice &&
        window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(pointer: coarse)').matches;
    if (isFinePointer) {
        document.documentElement.classList.add('has-custom-cursor');
    }

    var lastTarget = null;
    var lastHovering = false;
    function isInteractiveTarget(target) {
        if (target === lastTarget) return lastHovering;
        lastTarget = target;
        if (!target || !target.closest) {
            lastHovering = false;
            return false;
        }
        lastHovering = !!target.closest('a, button, input, select, textarea, label, .nav-item, .action-btn, .folder-toc-row, .icon-btn, .latest-blog-window, .tilt-wrapper, [onclick]');
        return lastHovering;
    }

    if (window.self !== window.top) {
        try {
            if (window.parent && window.parent.__bgCanvasBridge) {
                document.body.classList.add('has-bg-canvas');
                var frame = window.frameElement;
                var cachedRect = { left: 0, top: 0 };
                var lastRectCheck = -1000;
                function getFrameRect() {
                    if (!frame) return cachedRect;
                    var now = performance.now();
                    if (now - lastRectCheck > 100) {
                        cachedRect = frame.getBoundingClientRect();
                        lastRectCheck = now;
                    }
                    return cachedRect;
                }
                window.addEventListener('resize', function () {
                    lastRectCheck = -1000;
                }, { passive: true });
                window.addEventListener('touchstart', function () {
                    lastTarget = null;
                    if (window.parent.__bgCanvasBridge.touch) {
                        window.parent.__bgCanvasBridge.touch();
                    } else {
                        window.parent.__bgCanvasBridge.leave();
                    }
                }, { passive: true });
                window.addEventListener('mousemove', function (e) {
                    var rect = getFrameRect();
                    window.parent.__bgCanvasBridge.move(rect.left + e.clientX, rect.top + e.clientY, isInteractiveTarget(e.target));
                }, { passive: true });
                window.addEventListener('mousedown', function () {
                    window.parent.__bgCanvasBridge.down();
                }, { passive: true });
                window.addEventListener('mouseup', function () {
                    window.parent.__bgCanvasBridge.up();
                }, { passive: true });
                document.addEventListener('mouseenter', function (e) {
                    lastRectCheck = -1000;
                    var rect = getFrameRect();
                    window.parent.__bgCanvasBridge.move(rect.left + e.clientX, rect.top + e.clientY, isInteractiveTarget(e.target));
                }, { passive: true });
                document.addEventListener('mouseleave', function () {
                    lastTarget = null;
                    window.parent.__bgCanvasBridge.leave();
                }, { passive: true });
                window.setBgEffect = function (val) {
                    window.parent.setBgEffect(val);
                };
                window.refreshBgTheme = function () {
                    window.parent.refreshBgTheme();
                };

                document.addEventListener('click', function (e) {
                    if (e.defaultPrevented) return;
                    var link = e.target.closest('a');
                    if (!link) return;
                    var href = link.getAttribute('href');
                    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
                    if (link.hasAttribute('download')) return;
                    if (link.target && link.target !== '_self') return;
                    try {
                        var urlObj = new URL(link.href, window.location.href);
                        if (urlObj.origin === window.location.origin) {
                            e.preventDefault();
                            window.top.location.href = urlObj.href;
                        }
                    } catch (err) {}
                });

                return;
            }
        } catch (err) {}
    }

    function resolveActiveBgTheme() {
        var attr = document.documentElement.getAttribute('data-theme');
        if (attr) return attr;
        var isDark = localStorage.getItem('dark-mode') !== 'false';
        var base = localStorage.getItem('theme') || 'primary';
        if (localStorage.getItem('seasonal-pride-themes') !== 'false') {
            var now = new Date();
            var m = now.getMonth() + 1;
            var d = now.getDate();
            if (m === 6) base = 'pride';
            else if (m === 11 && d >= 13 && d <= 19) base = 'trans';
        }
        if (!isDark) {
            if (base === 'pride') return 'pride-light';
            if (base === 'trans') return 'trans-light';
            return 'light';
        }
        return base;
    }

    function getThemePalettes() {
        var theme = resolveActiveBgTheme();
        if (theme === 'light') {
            return {
                bg: '#dcd6c7',
                oxy: '#4a7487',
                oxyBright: '#2f5e73',
                rust: '#9c523b',
                amber: '#b87235',
                hot: '#5e2c18',
                dark: '#b8af9c',
                starWarm: '#7a4522',
                starCool: '#2f586b',
                starWhite: '#363026',
                isLight: 1.0,
                spectrumMode: 0.0
            };
        }
        if (theme === 'pride-light') {
            return {
                bg: '#f0ecf5',
                oxy: '#3b82b6',
                oxyBright: '#197a49',
                rust: '#c92a2a',
                amber: '#d98200',
                hot: '#7928a1',
                dark: '#cfc7de',
                starWarm: '#c92a2a',
                starCool: '#1a5fb4',
                starWhite: '#4c1d95',
                isLight: 1.0,
                spectrumMode: 1.0
            };
        }
        if (theme === 'trans-light') {
            return {
                bg: '#e6f1fa',
                oxy: '#3a9fd1',
                oxyBright: '#1989bf',
                rust: '#c96787',
                amber: '#e089a3',
                hot: '#ffffff',
                dark: '#bdd3e8',
                starWarm: '#c95679',
                starCool: '#1989bf',
                starWhite: '#4f6780',
                isLight: 1.0,
                spectrumMode: 2.0
            };
        }
        if (theme === 'pride') {
            return {
                bg: '#08070d',
                oxy: '#3b82f6',
                oxyBright: '#52d681',
                rust: '#ff595e',
                amber: '#ffca3a',
                hot: '#f8f4ff',
                dark: '#040308',
                starWarm: '#ff924c',
                starCool: '#4ea8de',
                starWhite: '#ffca3a',
                isLight: 0.0,
                spectrumMode: 1.0
            };
        }
        if (theme === 'trans') {
            return {
                bg: '#060a10',
                oxy: '#2c82b0',
                oxyBright: '#5bcefa',
                rust: '#9e526b',
                amber: '#f5a9b8',
                hot: '#ffffff',
                dark: '#030508',
                starWarm: '#f5a9b8',
                starCool: '#5bcefa',
                starWhite: '#ffffff',
                isLight: 0.0,
                spectrumMode: 2.0
            };
        }
        if (theme === 'obsidian') {
            return {
                bg: '#05060b',
                oxy: '#2b5e7a',
                oxyBright: '#6bc2de',
                rust: '#7a2f56',
                amber: '#7b62d9',
                hot: '#e5ddff',
                dark: '#030307',
                starWarm: '#e0a9d4',
                starCool: '#9fd8ff',
                starWhite: '#eceaff',
                isLight: 0.0,
                spectrumMode: 0.0
            };
        }
        if (theme === 'phosphor') {
            return {
                bg: '#040907',
                oxy: '#225e59',
                oxyBright: '#61cfa8',
                rust: '#6e5f2b',
                amber: '#54b872',
                hot: '#dcffe6',
                dark: '#020503',
                starWarm: '#d6e39d',
                starCool: '#9ef2e2',
                starWhite: '#dff5e6',
                isLight: 0.0,
                spectrumMode: 0.0
            };
        }
        if (theme === 'redshift') {
            return {
                bg: '#080507',
                oxy: '#294c5e',
                oxyBright: '#6ca4bd',
                rust: '#802730',
                amber: '#c76840',
                hot: '#ffe1cf',
                dark: '#040203',
                starWarm: '#ffb399',
                starCool: '#9bc9e0',
                starWhite: '#f5e4e4',
                isLight: 0.0,
                spectrumMode: 0.0
            };
        }
        return {
            bg: '#06080d',
            oxy: '#25566b',
            oxyBright: '#6fc2db',
            rust: '#7d3426',
            amber: '#c48335',
            hot: '#ffebc2',
            dark: '#040305',
            starWarm: '#ffd296',
            starCool: '#a8dcff',
            starWhite: '#f4eee2',
            isLight: 0.0,
            spectrumMode: 0.0
        };
    }

    function hexToVec3(hex) {
        var clean = hex.replace('#', '');
        return [
            parseInt(clean.substring(0, 2), 16) / 255,
            parseInt(clean.substring(2, 4), 16) / 255,
            parseInt(clean.substring(4, 6), 16) / 255
        ];
    }

    function fract(v) {
        return v - Math.floor(v);
    }

    function hash12JS(px, py) {
        var x = fract(px * 0.1031);
        var y = fract(py * 0.1031);
        var z = x;
        var d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
        x += d;
        y += d;
        z += d;
        return fract((x + y) * z);
    }

    function hash22JS(px, py) {
        var x = fract(px * 0.1031);
        var y = fract(py * 0.1030);
        var z = fract(px * 0.0973);
        var d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
        x += d;
        y += d;
        z += d;
        return [fract((x + y) * z), fract((x + z) * y)];
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

    var cursorEl = null;
    if (isFinePointer) {
        cursorEl = document.createElement('div');
        cursorEl.className = 'custom-cursor';
        cursorEl.innerHTML =
            '<div class="custom-cursor-ring">' +
                '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.25">' +
                    '<path d="M14 2 A12 12 0 0 1 25 10"></path>' +
                    '<path d="M26 14 A12 12 0 0 1 18 25"></path>' +
                    '<path d="M14 26 A12 12 0 0 1 3 18"></path>' +
                    '<path d="M2 14 A12 12 0 0 1 10 3"></path>' +
                '</svg>' +
            '</div>' +
            '<div class="custom-cursor-dot"></div>';
        document.body.appendChild(cursorEl);
    }

    var gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
    });
    var nebProgram = null;
    var compProgram = null;
    var starProgram = null;
    var nebUniforms = {};
    var compUniforms = {};
    var starUniforms = {};
    var nebFBO = null;
    var nebTex = null;
    var noiseTex = null;
    var triBuf = null;
    var starBuf = null;
    var starVertCount = 0;
    var nebW = 2, nebH = 2;

    var vertSrc = [
        'attribute vec2 a_pos;',
        'void main() {',
        '    gl_Position = vec4(a_pos, 0.0, 1.0);',
        '}'
    ].join('\n');

    var nebFragSrc = [
        'precision highp float;',
        'uniform sampler2D u_noiseTex;',
        'uniform vec3 u_uvTransform;',
        'uniform vec2 u_mouse;',
        'uniform float u_time;',
        'uniform float u_isLight;',
        'uniform float u_spectrumMode;',
        'uniform vec3 u_bg;',
        'uniform vec3 u_oxy;',
        'uniform vec3 u_oxyBright;',
        'uniform vec3 u_rust;',
        'uniform vec3 u_amber;',
        'uniform vec3 u_hot;',
        'uniform vec3 u_dark;',
        'const mat2 FBM_ROT = mat2(1.64, 1.23, -1.23, 1.64);',
        'const mat2 RIDGED_ROT = mat2(1.7384, -1.2084, 1.2084, 1.7384);',
        'const vec2 UNPACK16 = vec2(256.0 / 257.0, 1.0 / 257.0);',
        'vec3 prideSpectrum(float x) {',
        '    float s = fract(x) * 6.0;',
        '    vec3 c0 = vec3(0.95, 0.24, 0.30);',
        '    vec3 c1 = vec3(0.98, 0.56, 0.22);',
        '    vec3 c2 = vec3(0.98, 0.80, 0.22);',
        '    vec3 c3 = vec3(0.26, 0.82, 0.48);',
        '    vec3 c4 = vec3(0.26, 0.58, 0.96);',
        '    vec3 c5 = vec3(0.70, 0.36, 0.96);',
        '    if (s < 1.0) return mix(c0, c1, s);',
        '    if (s < 2.0) return mix(c1, c2, s - 1.0);',
        '    if (s < 3.0) return mix(c2, c3, s - 2.0);',
        '    if (s < 4.0) return mix(c3, c4, s - 3.0);',
        '    if (s < 5.0) return mix(c4, c5, s - 4.0);',
        '    return mix(c5, c0, s - 5.0);',
        '}',
        'vec3 transSpectrum(float x) {',
        '    float s = fract(x) * 5.0;',
        '    vec3 b = vec3(0.357, 0.808, 0.980);',
        '    vec3 p = vec3(0.961, 0.663, 0.722);',
        '    vec3 w = vec3(1.000, 1.000, 1.000);',
        '    if (s < 1.0) return mix(b, p, s);',
        '    if (s < 2.0) return mix(p, w, s - 1.0);',
        '    if (s < 3.0) return mix(w, p, s - 2.0);',
        '    if (s < 4.0) return mix(p, b, s - 3.0);',
        '    return b;',
        '}',
        'float noise(vec2 p) {',
        '    vec2 i = floor(p);',
        '    vec2 f = p - i;',
        '    vec2 u = f * f * (3.0 - 2.0 * f);',
        '    vec4 s = texture2D(u_noiseTex, (i + u + 0.5) * 0.00390625);',
        '    return dot(s.rg, UNPACK16);',
        '}',
        'vec2 noise2(vec2 p) {',
        '    vec2 i = floor(p);',
        '    vec2 f = p - i;',
        '    vec2 u = f * f * (3.0 - 2.0 * f);',
        '    vec4 s = texture2D(u_noiseTex, (i + u + 0.5) * 0.00390625);',
        '    return vec2(dot(s.rg, UNPACK16), dot(s.ba, UNPACK16));',
        '}',
        'float fbm2(vec2 p) {',
        '    float v = 0.60 * noise(p);',
        '    p = FBM_ROT * p + vec2(13.1, 7.7);',
        '    v += 0.35 * noise(p);',
        '    return v;',
        '}',
        'vec2 fbm2_2(vec2 p) {',
        '    vec2 v = 0.60 * noise2(p);',
        '    p = FBM_ROT * p + vec2(13.1, 7.7);',
        '    v += 0.35 * noise2(p);',
        '    return v;',
        '}',
        'float fbm3(vec2 p) {',
        '    float v = 0.54 * noise(p);',
        '    p = FBM_ROT * p + vec2(13.1, 7.7);',
        '    v += 0.2592 * noise(p);',
        '    p = FBM_ROT * p + vec2(13.1, 7.7);',
        '    v += 0.124416 * noise(p);',
        '    return v;',
        '}',
        'vec2 fbm3_2(vec2 p) {',
        '    vec2 v = 0.54 * noise2(p);',
        '    p = FBM_ROT * p + vec2(13.1, 7.7);',
        '    v += 0.2592 * noise2(p);',
        '    p = FBM_ROT * p + vec2(13.1, 7.7);',
        '    v += 0.124416 * noise2(p);',
        '    return v;',
        '}',
        'float ridged3(vec2 p) {',
        '    float n = 1.0 - abs(noise(p) * 2.0 - 1.0);',
        '    float v = 0.54 * (n * n);',
        '    p = RIDGED_ROT * p + vec2(5.4, 11.2);',
        '    n = 1.0 - abs(noise(p) * 2.0 - 1.0);',
        '    v += 0.2592 * (n * n);',
        '    p = RIDGED_ROT * p + vec2(5.4, 11.2);',
        '    n = 1.0 - abs(noise(p) * 2.0 - 1.0);',
        '    v += 0.124416 * (n * n);',
        '    return v;',
        '}',
        'float sdTaper(vec2 p, vec2 a, vec2 b, float ra, float rb) {',
        '    vec2 pa = p - a, ba = b - a;',
        '    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);',
        '    return length(pa - ba * h) - mix(ra, rb, h);',
        '}',
        'float smin(float a, float b, float k) {',
        '    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);',
        '    return mix(b, a, h) - k * h * (1.0 - h);',
        '}',
        'float pillarsBaseSDF(vec2 p) {',
        '    float d1 = sdTaper(p, vec2(0.56, -1.05), vec2(0.36, 0.10), 0.13, 0.036);',
        '    float anvil1 = sdTaper(p, vec2(0.31, 0.07), vec2(0.41, 0.13), 0.044, 0.034);',
        '    float shelf1 = sdTaper(p, vec2(0.42, -0.14), vec2(0.28, -0.05), 0.028, 0.010);',
        '    d1 = smin(d1, anvil1, 0.032);',
        '    d1 = smin(d1, shelf1, 0.024);',
        '    float d2a = sdTaper(p, vec2(0.68, -1.05), vec2(0.55, -0.25), 0.10, 0.036);',
        '    float d2b = sdTaper(p, vec2(0.55, -0.25), vec2(0.48, -0.03), 0.036, 0.028);',
        '    float d2 = smin(d2a, d2b, 0.03);',
        '    float cap2 = sdTaper(p, vec2(0.45, -0.04), vec2(0.51, 0.01), 0.032, 0.024);',
        '    d2 = smin(d2, cap2, 0.026);',
        '    float d3 = sdTaper(p, vec2(0.80, -1.05), vec2(0.66, -0.22), 0.115, 0.040);',
        '    float ledge3 = sdTaper(p, vec2(0.65, -0.30), vec2(0.74, -0.18), 0.042, 0.018);',
        '    d3 = smin(d3, ledge3, 0.028);',
        '    float baseCloud = sdTaper(p, vec2(0.38, -0.86), vec2(0.86, -0.82), 0.28, 0.26);',
        '    float d = smin(d1, d2, 0.055);',
        '    d = smin(d, d3, 0.055);',
        '    d = smin(d, baseCloud, 0.11);',
        '    float bok1 = length(p - vec2(0.30, 0.19)) - 0.008;',
        '    float bok2 = length(p - vec2(0.45, 0.06)) - 0.007;',
        '    d = min(d, min(bok1, bok2));',
        '    return d;',
        '}',
        'void main() {',
        '    vec2 uv = gl_FragCoord.xy * u_uvTransform.z - u_uvTransform.xy;',
        '    float t = u_time * 0.025;',
        '    vec2 m = u_mouse;',
        '    vec2 pFar = (uv - m * 0.03) * 1.25;',
        '    vec2 qFar = fbm3_2(pFar + vec2(1.4, 2.8));',
        '    float farGas = fbm3(pFar + 1.35 * qFar + vec2(t * 0.2, -t * 0.15));',
        '    float farBandCoord = pFar.y + pFar.x * 0.35 + (qFar.x - 0.5) * 0.6;',
        '    float farBand = exp(-(farBandCoord * farBandCoord) * 0.9);',
        '    vec3 sky = u_bg;',
        '    vec3 farCol = mix(u_oxy, u_rust, smoothstep(0.28, 0.74, qFar.y));',
        '    float specPhase = (uv.x * 0.35 - uv.y * 0.26) + qFar.x * 0.45 + t * 0.04;',
        '    if (u_spectrumMode > 0.5 && u_spectrumMode < 1.5) {',
        '        farCol = mix(farCol, prideSpectrum(specPhase) * 0.72, 0.85);',
        '    } else if (u_spectrumMode > 1.5) {',
        '        farCol = mix(farCol, transSpectrum(specPhase) * 0.78, 0.80);',
        '    }',
        '    if (u_isLight > 0.5) {',
        '        sky = mix(sky, farCol, smoothstep(0.25, 0.85, farGas) * 0.20 * (0.4 + 0.6 * farBand));',
        '    } else {',
        '        sky += farCol * smoothstep(0.20, 0.85, farGas) * (0.22 + 0.34 * farBand);',
        '    }',
        '    vec2 gUv = (uv - m * 0.025) - vec2(-0.48, 0.22);',
        '    if (dot(gUv, gUv) < 0.028) {',
        '        vec2 gr = vec2(gUv.x * 0.838 + gUv.y * 0.545, -gUv.x * 0.545 + gUv.y * 0.838);',
        '        gr.y *= 2.55;',
        '        float gRad = length(gr);',
        '        float radialMask = smoothstep(0.16, 0.03, gRad);',
        '        if (radialMask > 0.0) {',
        '            float gAng = atan(gr.y, gr.x);',
        '            float spiral = cos(gAng * 2.0 - log(gRad + 0.010) * 5.4 + qFar.x * 0.8);',
        '            float arms = smoothstep(-0.08, 0.92, spiral) * exp(-gRad * 15.0) * smoothstep(0.010, 0.042, gRad) * radialMask;',
        '            float disk = exp(-gRad * 20.0) * 0.32 * radialMask;',
        '            float core = exp(-gRad * gRad * 3400.0) * radialMask;',
        '            float dustLane = smoothstep(0.35, 0.95, -spiral) * exp(-gRad * 16.0) * smoothstep(0.015, 0.05, gRad) * radialMask;',
        '            vec3 galCol = mix(u_oxyBright, u_amber, smoothstep(0.07, 0.012, gRad)) * (arms * 0.45 + disk * 0.35);',
        '            if (u_spectrumMode > 0.5 && u_spectrumMode < 1.5) {',
        '                galCol = prideSpectrum(gAng / 6.28318 + gRad * 4.0) * (arms * 0.48 + disk * 0.35);',
        '            }',
        '            galCol += u_hot * core * 0.52;',
        '            if (u_isLight > 0.5) {',
        '                float ga = clamp(arms * 0.22 + disk * 0.14 + core * 0.28, 0.0, 0.34);',
        '                sky = mix(sky, mix(u_oxyBright, u_hot, core), ga);',
        '            } else {',
        '                sky = mix(sky, u_dark, dustLane * 0.28);',
        '                sky += galCol * (1.0 - dustLane * 0.30);',
        '            }',
        '        }',
        '    }',
        '    vec2 pMid = (uv - m * 0.085) * 1.55 + vec2(t * 0.12, -t * 0.06);',
        '    vec2 qMid = fbm3_2(pMid * 1.15 + vec2(0.0, t * 0.22));',
        '    vec2 rMid = pMid + 1.15 * qMid;',
        '    float baseMid = fbm3(rMid * 1.55);',
        '    float rigMid = ridged3(rMid * 2.35 + vec2(t * 0.15, -t * 0.1));',
        '    float bandCoord = pMid.y + pMid.x * 0.42 + sin(pMid.x * 1.6) * 0.18 + (qMid.x - 0.5) * 0.55;',
        '    float bandMask = 0.28 + 0.72 * exp(-bandCoord * bandCoord * 1.65);',
        '    float dMid = smoothstep(0.22, 0.82, baseMid * 0.62 + rigMid * 0.42) * bandMask;',
        '    float rim = 0.0;',
        '    if (dMid > 0.0) {',
        '        vec2 rLit = rMid + vec2(-0.024, -0.028);',
        '        float baseLit = fbm3(rLit * 1.55);',
        '        float rigLit = ridged3(rLit * 2.35 + vec2(t * 0.15, -t * 0.1));',
        '        float dLit = smoothstep(0.22, 0.82, baseLit * 0.62 + rigLit * 0.42) * bandMask;',
        '        rim = clamp((dMid - dLit) * 4.8, 0.0, 1.0);',
        '    }',
        '    float darkCore = smoothstep(0.38, 0.84, dMid);',
        '    float midColorMix = qMid.x;',
        '    vec3 dustHue = mix(u_oxy, u_rust, smoothstep(0.25, 0.75, midColorMix));',
        '    dustHue = mix(dustHue, u_amber, smoothstep(0.45, 0.82, dMid));',
        '    vec3 rimHue = mix(u_amber, u_oxyBright, smoothstep(0.25, 0.75, midColorMix));',
        '    rimHue = mix(rimHue, u_hot, smoothstep(0.45, 0.95, rim));',
        '    if (u_spectrumMode > 0.5 && u_spectrumMode < 1.5) {',
        '        float midSpec = specPhase + qMid.x * 0.45;',
        '        dustHue = mix(dustHue, prideSpectrum(midSpec), 0.86);',
        '        rimHue = mix(rimHue, prideSpectrum(midSpec + 0.18), 0.78);',
        '        rimHue = mix(rimHue, u_hot, smoothstep(0.55, 0.98, rim) * 0.55);',
        '    } else if (u_spectrumMode > 1.5) {',
        '        float midTrans = specPhase + qMid.x * 0.35;',
        '        dustHue = mix(dustHue, transSpectrum(midTrans), 0.82);',
        '        rimHue = mix(rimHue, transSpectrum(midTrans + 0.25), 0.75);',
        '        rimHue = mix(rimHue, u_hot, smoothstep(0.45, 0.95, rim) * 0.65);',
        '    }',
        '    if (u_isLight > 0.5) {',
        '        sky = mix(sky, dustHue, dMid * 0.24);',
        '        sky = mix(sky, rimHue, rim * 0.16);',
        '    } else {',
        '        sky = mix(sky, dustHue * 0.72, smoothstep(0.08, 0.55, dMid) * 0.65);',
        '        sky = mix(sky, u_dark, darkCore * 0.72);',
        '        sky += rimHue * rim * (0.38 + 0.35 * dMid);',
        '    }',
        '    vec2 obVec = (uv - m * 0.095) - vec2(0.18, 0.27);',
        '    float obDistSq = dot(obVec, obVec);',
        '    if (obDistSq < 0.14) {',
        '        float obFade = smoothstep(0.14, 0.03, obDistSq);',
        '        float obGlow = exp(-obDistSq * 30.0) * obFade;',
        '        if (u_isLight > 0.5) {',
        '            sky = mix(sky, u_oxyBright, obGlow * 0.10);',
        '        } else {',
        '            sky += mix(u_oxyBright, u_hot, 0.20) * obGlow * 0.18;',
        '        }',
        '    }',
        '    float dustOcc = 0.0;',
        '    vec2 pp = uv - m * 0.11;',
        '    if (pp.x > -0.10 && pp.x < 1.35 && pp.y < 0.45 && pillarsBaseSDF(pp) < 0.175) {',
        '        float fadeMask = smoothstep(-0.10, 0.05, pp.x) * smoothstep(0.45, 0.28, pp.y);',
        '        vec2 pSwirl = pp;',
        '        pSwirl.x += sin(pp.y * 6.5 + 0.8) * 0.016;',
        '        vec2 warp = fbm2_2(pSwirl * 4.5 + vec2(t * 0.06, -t * 0.04));',
        '        float crag = fbm2(pSwirl * 11.0 + warp * 2.6) * 0.068 + noise(pSwirl * 26.0 - warp * 2.0) * 0.028 + noise(pSwirl * 54.0 + warp * 1.4) * 0.011 - 0.042;',
        '        vec2 pw = pSwirl + (warp - 0.5) * 0.058;',
        '        float d0 = pillarsBaseSDF(pw) - crag;',
        '        if (d0 < 0.05) {',
        '            vec2 lightDir = vec2(-0.62, 0.78);',
        '            float dL = pillarsBaseSDF(pw + lightDir * 0.010) - crag;',
        '            float pillarBody = smoothstep(0.005, -0.004, d0) * fadeMask;',
        '            float pillarCore = smoothstep(-0.005, -0.042, d0) * fadeMask;',
        '            float litFace = clamp((dL - d0) * 90.0, 0.0, 1.0);',
        '            float rimBand = smoothstep(0.008, 0.0, abs(d0)) * (0.14 + 0.86 * litFace) * fadeMask;',
        '            float tipZone = smoothstep(-0.26, 0.12, pp.y);',
        '            vec2 extraTex = noise2(pSwirl * vec2(24.0, 8.0) + vec2(warp.x * 1.5, -t * 0.35));',
        '            float evapStream = smoothstep(0.05, -0.004, d0) * (1.0 - pillarBody) * tipZone * extraTex.x * fadeMask;',
        '            float innerFold = smoothstep(0.28, 0.80, extraTex.y);',
        '            vec3 pDustCol = mix(u_rust * 0.36, u_amber * 0.46, litFace * 0.45 * tipZone) * (0.50 + 0.50 * innerFold);',
        '            vec3 pRimCol = mix(u_amber, u_oxyBright, 0.48 * tipZone);',
        '            pRimCol = mix(pRimCol, u_hot, smoothstep(0.35, 0.92, rimBand) * (0.40 + 0.60 * tipZone));',
        '            vec3 pEvapCol = mix(u_oxyBright, u_amber, 0.20);',
        '            if (u_spectrumMode > 0.5 && u_spectrumMode < 1.5) {',
        '                float pilSpec = pp.y * 1.15 + pp.x * 0.45 + 0.25;',
        '                pDustCol = prideSpectrum(pilSpec) * (0.24 + 0.24 * innerFold);',
        '                pRimCol = mix(prideSpectrum(pilSpec + 0.12), u_hot, smoothstep(0.45, 0.95, rimBand) * 0.5);',
        '                pEvapCol = prideSpectrum(pilSpec + 0.22);',
        '            } else if (u_spectrumMode > 1.5) {',
        '                float pilTrans = pp.y * 1.2 + pp.x * 0.5;',
        '                pDustCol = transSpectrum(pilTrans) * (0.24 + 0.24 * innerFold);',
        '                pRimCol = mix(transSpectrum(pilTrans + 0.18), u_hot, smoothstep(0.45, 0.95, rimBand) * 0.6);',
        '                pEvapCol = transSpectrum(pilTrans + 0.30);',
        '            }',
        '            if (u_isLight > 0.5) {',
        '                sky = mix(sky, mix(u_rust, u_dark, 0.64), pillarBody * 0.34);',
        '                sky = mix(sky, u_dark, pillarCore * 0.42);',
        '                sky = mix(sky, pEvapCol, evapStream * 0.22);',
        '                sky = mix(sky, u_hot, rimBand * 0.34);',
        '            } else {',
        '                sky = mix(sky, pDustCol, pillarBody * 0.84);',
        '                sky = mix(sky, u_dark, pillarCore * 0.88);',
        '                sky += pEvapCol * evapStream * 0.22;',
        '                sky += pRimCol * rimBand * (0.44 + 0.40 * tipZone);',
        '            }',
        '            dustOcc = clamp(pillarBody * 0.58 + pillarCore * 0.42, 0.0, 1.0);',
        '        }',
        '    }',
        '    vec2 pNear = (uv - m * 0.15) * 2.1 + vec2(-t * 0.22, t * 0.12);',
        '    float nearWisp = ridged3(pNear + vec2(qMid.y * 0.8, qFar.x * 0.8));',
        '    float nearBandCoord = pNear.y * 0.45 + pNear.x * 0.22;',
        '    float nearMask = smoothstep(0.48, 0.92, nearWisp) * exp(-(nearBandCoord * nearBandCoord) * 1.1);',
        '    vec3 wispHue = mix(u_oxyBright, u_amber, qFar.y);',
        '    if (u_spectrumMode > 0.5 && u_spectrumMode < 1.5) {',
        '        wispHue = prideSpectrum(specPhase + qFar.y * 0.5 + 0.35);',
        '    } else if (u_spectrumMode > 1.5) {',
        '        wispHue = transSpectrum(specPhase + qFar.y * 0.45);',
        '    }',
        '    if (u_isLight > 0.5) {',
        '        sky = mix(sky, wispHue, nearMask * 0.14);',
        '    } else {',
        '        sky += wispHue * nearMask * 0.16;',
        '    }',
        '    gl_FragColor = vec4(sky, dustOcc);',
        '}'
    ].join('\n');

    var compFragSrc = [
        'precision mediump float;',
        'uniform sampler2D u_nebula;',
        'uniform vec2 u_invRes;',
        'void main() {',
        '    gl_FragColor = vec4(texture2D(u_nebula, gl_FragCoord.xy * u_invRes).rgb, 1.0);',
        '}'
    ].join('\n');

    var starVertSrc = [
        'attribute vec2 a_corner;',
        'attribute vec2 a_center;',
        'attribute vec4 a_info;',
        'attribute vec4 a_extra;',
        'attribute vec4 a_style;',
        'uniform vec2 u_mouse;',
        'uniform vec3 u_uvTransform;',
        'uniform vec2 u_ndcScale;',
        'uniform float u_time;',
        'uniform float u_spectrumMode;',
        'uniform vec3 u_starWarm;',
        'uniform vec3 u_starCool;',
        'uniform vec3 u_starWhite;',
        'varying vec2 v_d;',
        'varying vec3 v_col;',
        'varying vec4 v_frag;',
        'varying vec4 v_optics;',
        'vec3 prideStarCol(float x) {',
        '    float s = fract(x) * 6.0;',
        '    if (s < 1.0) return vec3(1.00, 0.45, 0.48);',
        '    if (s < 2.0) return vec3(1.00, 0.68, 0.38);',
        '    if (s < 3.0) return vec3(1.00, 0.88, 0.42);',
        '    if (s < 4.0) return vec3(0.45, 0.92, 0.65);',
        '    if (s < 5.0) return vec3(0.46, 0.76, 1.00);',
        '    return vec3(0.80, 0.56, 1.00);',
        '}',
        'void main() {',
        '    vec2 centerUv = a_center + u_mouse * a_info.x;',
        '    vec2 uvPos = centerUv + a_corner * a_extra.x;',
        '    vec2 ndc = (uvPos + u_uvTransform.xy) * u_ndcScale - 1.0;',
        '    gl_Position = vec4(ndc, 0.0, 1.0);',
        '    v_d = a_corner * a_extra.y;',
        '    float ct = a_style.x;',
        '    v_col = ct > 1.5 ? u_starWhite : (ct > 0.5 ? u_starCool : u_starWarm);',
        '    if (u_spectrumMode > 0.5 && u_spectrumMode < 1.5) {',
        '        v_col = prideStarCol(a_info.z * 0.137);',
        '    }',
        '    float baseShim = a_style.z > 0.5 ? 0.92 : 0.90;',
        '    float ampShim = a_style.z > 0.5 ? 0.08 : 0.10;',
        '    float shim = (baseShim + ampShim * sin(u_time * a_info.w + a_info.z)) * a_extra.z;',
        '    vec2 ppStar = centerUv - u_mouse * 0.11;',
        '    float occ = (ppStar.x > -0.10 - a_extra.x && ppStar.x < 1.35 + a_extra.x && ppStar.y < 0.45 + a_extra.x) ? a_extra.w : 0.0;',
        '    v_frag = vec4(a_info.y, shim, occ, a_style.y);',
        '    v_optics = a_style.z > 0.5 ? vec4(140.0, 0.14, 460.0, 68.0) : vec4(26.0, 0.28, 160.0, 18.0);',
        '}'
    ].join('\n');

    var starFragSrc = [
        'precision mediump float;',
        'uniform sampler2D u_nebula;',
        'uniform vec2 u_invRes;',
        'uniform float u_isLight;',
        'uniform vec3 u_starWhite;',
        'varying vec2 v_d;',
        'varying vec3 v_col;',
        'varying vec4 v_frag;',
        'varying vec4 v_optics;',
        'void main() {',
        '    float dist = length(v_d);',
        '    float size = v_frag.x;',
        '    float core = smoothstep(size, size * 0.15, dist);',
        '    float halo = exp(-dist * v_optics.x) * v_optics.y;',
        '    float b = core + halo;',
        '    if (v_frag.w > 0.0) {',
        '        vec2 ad = abs(v_d);',
        '        if (min(ad.x, ad.y) < 0.08) {',
        '            float sp = exp(-ad.y * v_optics.z - ad.x * v_optics.w) + exp(-ad.x * v_optics.z - ad.y * v_optics.w);',
        '            b += sp * v_frag.w;',
        '        }',
        '    }',
        '    b *= v_frag.y;',
        '    if (b < 0.003) discard;',
        '    if (v_frag.z > 0.0) {',
        '        float dustOcc = texture2D(u_nebula, gl_FragCoord.xy * u_invRes).a;',
        '        b *= 1.0 - dustOcc * v_frag.z;',
        '    }',
        '    if (u_isLight > 0.5) {',
        '        gl_FragColor = vec4(v_col, min(b * 0.55, 0.7));',
        '    } else {',
        '        gl_FragColor = vec4(v_col * b, 1.0);',
        '    }',
        '}'
    ].join('\n');

    function compileShader(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    function linkProgram(vSrc, fSrc, attribs) {
        var vs = compileShader(gl.VERTEX_SHADER, vSrc);
        var fs = compileShader(gl.FRAGMENT_SHADER, fSrc);
        if (!vs || !fs) {
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
            return null;
        }
        var p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        for (var i = 0; i < attribs.length; i++) {
            gl.bindAttribLocation(p, i, attribs[i]);
        }
        gl.linkProgram(p);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            gl.deleteProgram(p);
            return null;
        }
        return p;
    }

    function buildNoiseTexture() {
        var size = 256;
        var data = new Uint8Array(size * size * 4);
        var idx = 0;
        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                var v1 = hash12JS(x, y);
                var v2 = hash12JS(x + 37.7, y + 91.3);
                var q1 = Math.floor(v1 * 65535.0 + 0.5);
                var q2 = Math.floor(v2 * 65535.0 + 0.5);
                data[idx++] = (q1 >> 8) & 255;
                data[idx++] = q1 & 255;
                data[idx++] = (q2 >> 8) & 255;
                data[idx++] = q2 & 255;
            }
        }
        noiseTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, noiseTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.activeTexture(gl.TEXTURE0);
    }

    function buildStarBuffer() {
        var verts = [];
        var corners = [
            [-1, -1], [1, -1], [-1, 1],
            [-1, 1], [1, -1], [1, 1]
        ];
        function pushStar(cx, cy, parallax, size, phase, shimmerFreq, uvRadius, cellRadius, brightness, occWeight, colType, flareAmp, isHero) {
            for (var c = 0; c < 6; c++) {
                verts.push(
                    corners[c][0], corners[c][1],
                    cx, cy,
                    parallax, size, phase, shimmerFreq,
                    uvRadius, cellRadius, brightness, occWeight,
                    colType, flareAmp, isHero, 0.0
                );
            }
        }
        var layers = [
            { scale: 17.0, density: 0.26, flare: 1.05, parallax: 0.025, sx: 0.13, sy: 0.41, bright: 0.52, occ: 0.92 },
            { scale: 10.5, density: 0.22, flare: 0.94, parallax: 0.075, sx: 0.67, sy: 0.19, bright: 0.80, occ: 0.92 },
            { scale: 6.2, density: 0.14, flare: 0.82, parallax: 0.140, sx: 0.31, sy: 0.83, bright: 1.05, occ: 0.0 }
        ];
        for (var l = 0; l < layers.length; l++) {
            var ly = layers[l];
            var minX = Math.floor((-1.5 + ly.sx) * ly.scale);
            var maxX = Math.ceil((1.5 + ly.sx) * ly.scale);
            var minY = Math.floor((-1.5 + ly.sy) * ly.scale);
            var maxY = Math.ceil((1.5 + ly.sy) * ly.scale);
            for (var iy = minY; iy <= maxY; iy++) {
                for (var ix = minX; ix <= maxX; ix++) {
                    var rnd = hash22JS(ix, iy);
                    if (rnd[0] > ly.density) continue;
                    var seed = hash12JS(ix + 17.3, iy + 9.1);
                    var size = 0.014 + (0.042 - 0.014) * seed * seed;
                    var hasFlare = seed > ly.flare;
                    var cellRad = hasFlare ? 0.44 : 0.24;
                    var cx = (ix + 0.5 + (rnd[0] - 0.5) * 0.72) / ly.scale - ly.sx;
                    var cy = (iy + 0.5 + (rnd[1] - 0.5) * 0.72) / ly.scale - ly.sy;
                    var colType = seed > 0.72 ? 1.0 : (seed < 0.28 ? 0.0 : 2.0);
                    pushStar(
                        cx, cy, ly.parallax, size, seed * 40.0, 0.4 + seed * 0.8,
                        cellRad / ly.scale, cellRad, ly.bright, ly.occ,
                        colType, hasFlare ? 0.55 : 0.0, 0.0
                    );
                }
            }
        }
        var heroes = [
            [0.185, 0.265, 0.095, 0.0028, 1.2, 0.90, 1.0],
            [0.152, 0.302, 0.095, 0.0022, 4.7, 0.78, 2.0],
            [0.218, 0.312, 0.095, 0.0020, 8.3, 0.70, 1.0],
            [0.358, 0.118, 0.110, 0.0018, 2.5, 0.65, 0.0],
            [0.478, -0.025, 0.110, 0.0017, 6.1, 0.55, 0.0]
        ];
        for (var h = 0; h < heroes.length; h++) {
            var hr = heroes[h];
            pushStar(hr[0], hr[1], hr[2], hr[3], hr[4], 0.9, 0.09, 0.09, hr[5], 0.0, hr[6], 0.35, 1.0);
        }
        starVertCount = verts.length / 16;
        starBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    }

    function initWebGL() {
        if (!gl) return false;
        nebProgram = linkProgram(vertSrc, nebFragSrc, ['a_pos']);
        compProgram = linkProgram(vertSrc, compFragSrc, ['a_pos']);
        starProgram = linkProgram(starVertSrc, starFragSrc, ['a_corner', 'a_center', 'a_info', 'a_extra', 'a_style']);
        if (!nebProgram || !compProgram || !starProgram) return false;

        triBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 3, -1, -1, 3
        ]), gl.STATIC_DRAW);

        var nNames = [
            'u_noiseTex', 'u_uvTransform', 'u_mouse', 'u_time', 'u_isLight', 'u_spectrumMode',
            'u_bg', 'u_oxy', 'u_oxyBright', 'u_rust',
            'u_amber', 'u_hot', 'u_dark'
        ];
        for (var i = 0; i < nNames.length; i++) {
            nebUniforms[nNames[i]] = gl.getUniformLocation(nebProgram, nNames[i]);
        }

        compUniforms.u_nebula = gl.getUniformLocation(compProgram, 'u_nebula');
        compUniforms.u_invRes = gl.getUniformLocation(compProgram, 'u_invRes');

        var sNames = [
            'u_nebula', 'u_invRes', 'u_mouse', 'u_uvTransform', 'u_ndcScale',
            'u_time', 'u_spectrumMode', 'u_isLight', 'u_starWarm', 'u_starCool', 'u_starWhite'
        ];
        for (var j = 0; j < sNames.length; j++) {
            starUniforms[sNames[j]] = gl.getUniformLocation(starProgram, sNames[j]);
        }

        buildNoiseTexture();
        buildStarBuffer();

        nebTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, nebTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        nebFBO = gl.createFramebuffer();

        gl.useProgram(nebProgram);
        gl.uniform1i(nebUniforms.u_noiseTex, 1);

        gl.useProgram(compProgram);
        gl.uniform1i(compUniforms.u_nebula, 0);

        gl.useProgram(starProgram);
        gl.uniform1i(starUniforms.u_nebula, 0);

        return true;
    }

    var glReady = initWebGL();
    var width = 0, height = 0;
    var invMinDim = 1;
    var mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    var hasPointer = false;
    var running = !document.hidden;
    var mode = localStorage.getItem('bg-effect') === 'none' ? 'none' : 'particles';
    var startTime = performance.now();
    var rafId = 0;
    var nebDirty = true;
    var lastNebTime = -1;
    var lastNebMx = 0;
    var lastNebMy = 0;
    var lastDrawTime = -1;
    var lastInteractionTime = -1000;
    var isLightMode = false;

    var cursorX = 0;
    var cursorY = 0;
    var cursorVisible = false;
    var cursorHover = false;
    var cursorDown = false;
    var cursorDirty = false;
    var lastTouchTime = 0;

    function handleTouchStart() {
        lastTouchTime = performance.now();
        if (cursorEl) {
            if (cursorVisible) {
                cursorEl.classList.remove('is-visible');
                cursorVisible = false;
            }
            if (cursorDown) {
                cursorEl.classList.remove('is-down');
                cursorDown = false;
            }
        }
    }

    function scheduleTick() {
        if (running && !rafId) {
            rafId = requestAnimationFrame(tick);
        }
    }

    window.__bgCanvasBridge = {
        touch: handleTouchStart,
        move: function (x, y, hovering) {
            lastInteractionTime = performance.now();
            if (!hasPointer) {
                mouseX = x;
                mouseY = y;
                hasPointer = true;
            }
            targetMouseX = x;
            targetMouseY = y;
            if (cursorEl && performance.now() - lastTouchTime > 600) {
                if (cursorX !== x || cursorY !== y) {
                    cursorX = x;
                    cursorY = y;
                    cursorDirty = true;
                }
                if (!cursorVisible) {
                    cursorEl.classList.add('is-visible');
                    cursorVisible = true;
                    cursorDirty = true;
                }
                if (hovering !== cursorHover) {
                    if (hovering) cursorEl.classList.add('is-hover');
                    else cursorEl.classList.remove('is-hover');
                    cursorHover = hovering;
                }
            }
            if (cursorDirty) scheduleTick();
        },
        down: function () {
            if (cursorEl && !cursorDown && performance.now() - lastTouchTime > 600) {
                cursorEl.classList.add('is-down');
                cursorDown = true;
            }
        },
        up: function () {
            if (cursorEl && cursorDown) {
                cursorEl.classList.remove('is-down');
                cursorDown = false;
            }
        },
        leave: function () {
            lastTarget = null;
            if (cursorEl) {
                if (cursorVisible) {
                    cursorEl.classList.remove('is-visible');
                    cursorVisible = false;
                }
                if (cursorDown) {
                    cursorEl.classList.remove('is-down');
                    cursorDown = false;
                }
            }
        }
    };

    function applyTint() {
        var pal = getThemePalettes();
        solidLayer.style.background = pal.bg;
        isLightMode = pal.isLight > 0.5;
        if (glReady && gl && nebProgram && starProgram) {
            gl.useProgram(nebProgram);
            gl.uniform1f(nebUniforms.u_isLight, pal.isLight);
            gl.uniform1f(nebUniforms.u_spectrumMode, pal.spectrumMode);
            gl.uniform3fv(nebUniforms.u_bg, hexToVec3(pal.bg));
            gl.uniform3fv(nebUniforms.u_oxy, hexToVec3(pal.oxy));
            gl.uniform3fv(nebUniforms.u_oxyBright, hexToVec3(pal.oxyBright));
            gl.uniform3fv(nebUniforms.u_rust, hexToVec3(pal.rust));
            gl.uniform3fv(nebUniforms.u_amber, hexToVec3(pal.amber));
            gl.uniform3fv(nebUniforms.u_hot, hexToVec3(pal.hot));
            gl.uniform3fv(nebUniforms.u_dark, hexToVec3(pal.dark));

            gl.useProgram(starProgram);
            gl.uniform1f(starUniforms.u_isLight, pal.isLight);
            gl.uniform1f(starUniforms.u_spectrumMode, pal.spectrumMode);
            gl.uniform3fv(starUniforms.u_starWarm, hexToVec3(pal.starWarm));
            gl.uniform3fv(starUniforms.u_starCool, hexToVec3(pal.starCool));
            gl.uniform3fv(starUniforms.u_starWhite, hexToVec3(pal.starWhite));
            nebDirty = true;
        }
    }

    function applyMode() {
        var active = mode !== 'none' && glReady;
        canvas.style.display = active ? 'block' : 'none';
        if (active) {
            nebDirty = true;
            scheduleTick();
        }
    }

    function resize() {
        var nw = Math.max(1, window.innerWidth);
        var nh = Math.max(1, window.innerHeight);
        if (nw === width && nh === height) return;
        width = nw;
        height = nh;
        canvas.width = width;
        canvas.height = height;
        var nebScale = Math.min(0.40, 800 / width, 450 / height);
        nebW = Math.max(64, Math.floor(width * nebScale));
        nebH = Math.max(64, Math.floor(height * nebScale));
        var minDim = Math.max(1, Math.min(width, height));
        invMinDim = 1 / minDim;

        if (glReady && gl && nebTex && nebFBO) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, nebTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nebW, nebH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, nebFBO);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nebTex, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            var nebInvMin = 1 / Math.max(1, Math.min(nebW, nebH));
            gl.useProgram(nebProgram);
            gl.uniform3f(nebUniforms.u_uvTransform, 0.5 * nebW * nebInvMin, 0.5 * nebH * nebInvMin, nebInvMin);

            gl.useProgram(compProgram);
            gl.uniform2f(compUniforms.u_invRes, 1 / width, 1 / height);

            gl.useProgram(starProgram);
            gl.uniform2f(starUniforms.u_invRes, 1 / width, 1 / height);
            gl.uniform3f(starUniforms.u_uvTransform, 0.5 * width * invMinDim, 0.5 * height * invMinDim, invMinDim);
            gl.uniform2f(starUniforms.u_ndcScale, (2 * minDim) / width, (2 * minDim) / height);

            nebDirty = true;
        }
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('mousemove', function (e) {
        window.__bgCanvasBridge.move(e.clientX, e.clientY, isInteractiveTarget(e.target));
    }, { passive: true });
    window.addEventListener('mousedown', function () {
        window.__bgCanvasBridge.down();
    }, { passive: true });
    window.addEventListener('mouseup', function () {
        window.__bgCanvasBridge.up();
    }, { passive: true });
    document.addEventListener('mouseenter', function (e) {
        window.__bgCanvasBridge.move(e.clientX, e.clientY, isInteractiveTarget(e.target));
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
        window.__bgCanvasBridge.leave();
    }, { passive: true });
    window.addEventListener('storage', function (e) {
        if (e.key === 'bg-effect') {
            mode = e.newValue === 'none' ? 'none' : 'particles';
            applyMode();
        }
        if (e.key === 'theme' || e.key === 'dark-mode' || e.key === 'seasonal-pride-themes') applyTint();
    });

    window.setBgEffect = function (val) {
        mode = val === 'none' ? 'none' : 'particles';
        localStorage.setItem('bg-effect', mode);
        applyMode();
    };
    window.refreshBgTheme = applyTint;

    function tick(now) {
        rafId = 0;
        if (!running) return;

        if (cursorDirty && cursorEl) {
            cursorEl.style.transform = 'translate3d(' + cursorX + 'px,' + cursorY + 'px,0)';
            cursorDirty = false;
        }

        if (mode !== 'none' && glReady && gl && nebProgram && compProgram && starProgram) {
            if (hasPointer) {
                var dx = targetMouseX - mouseX;
                var dy = targetMouseY - mouseY;
                mouseX = Math.abs(dx) < 0.05 ? targetMouseX : mouseX + dx * 0.08;
                mouseY = Math.abs(dy) < 0.05 ? targetMouseY : mouseY + dy * 0.08;
            } else {
                mouseX = width * 0.5;
                mouseY = height * 0.5;
            }

            var ts = now || performance.now();
            var isIdle = (ts - lastInteractionTime) > 600;
            if (!nebDirty && isIdle && (ts - lastDrawTime) < 32) {
                scheduleTick();
                return;
            }
            lastDrawTime = ts;

            var mx = (mouseX - width * 0.5) * invMinDim;
            var my = -(mouseY - height * 0.5) * invMinDim;
            var elapsed = (ts - startTime) * 0.001;
            var dtNeb = elapsed - lastNebTime;
            var mouseMoved = Math.abs(mx - lastNebMx) > 0.0004 || Math.abs(my - lastNebMy) > 0.0004;

            gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            if (nebDirty || (mouseMoved && dtNeb >= 0.024) || dtNeb >= 0.120) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, nebFBO);
                gl.viewport(0, 0, nebW, nebH);
                gl.useProgram(nebProgram);
                gl.uniform2f(nebUniforms.u_mouse, mx, my);
                gl.uniform1f(nebUniforms.u_time, elapsed);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                nebDirty = false;
                lastNebTime = elapsed;
                lastNebMx = mx;
                lastNebMy = my;
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, width, height);
            gl.useProgram(compProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, nebTex);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            gl.useProgram(starProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.enableVertexAttribArray(2);
            gl.enableVertexAttribArray(3);
            gl.enableVertexAttribArray(4);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 64, 0);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 64, 8);
            gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 64, 16);
            gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 64, 32);
            gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 64, 48);
            gl.uniform2f(starUniforms.u_mouse, mx, my);
            gl.uniform1f(starUniforms.u_time, elapsed);
            gl.enable(gl.BLEND);
            if (isLightMode) {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            } else {
                gl.blendFunc(gl.ONE, gl.ONE);
            }
            gl.drawArrays(gl.TRIANGLES, 0, starVertCount);
            gl.disable(gl.BLEND);
            gl.disableVertexAttribArray(1);
            gl.disableVertexAttribArray(2);
            gl.disableVertexAttribArray(3);
            gl.disableVertexAttribArray(4);

            scheduleTick();
        }
    }

    document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) {
            if ((mode !== 'none' && glReady) || cursorDirty) scheduleTick();
        } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
    });

    resize();
    applyTint();
    applyMode();
})();