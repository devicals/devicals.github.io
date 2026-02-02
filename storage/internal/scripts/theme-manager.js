const themes = {
    original: {
        background: "246 13% 30%",
        foreground: "0 0% 98%",
        card: "246 13% 25%",
        cardForeground: "0 0% 98%",
        popover: "246 13% 30%",
        popoverForeground: "0 0% 98%",
        primary: "0 0% 98%",
        primaryForeground: "246 13% 30%",
        secondary: "246 13% 20%",
        secondaryForeground: "0 0% 98%",
        muted: "246 13% 20%",
        mutedForeground: "240 5% 64.9%",
        accent: "342 82% 73%",
        accentForeground: "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        destructiveForeground: "0 0% 98%",
        border: "246 13% 40%",
        input: "246 13% 20%",
        ring: "342 82% 73%"
    },
    "vitesse-dark": {
        background: "225 6% 7%",
        foreground: "0 0% 85%",
        card: "0 0% 9%",
        cardForeground: "0 0% 9%",
        popover: "225 6% 7%",
        popoverForeground: "0 0% 85%",
        primary: "160 52% 45%",
        primaryForeground: "225 6% 7%",
        secondary: "0 0% 7%",
        secondaryForeground: "0 0% 85%",
        muted: "225 6% 15%",
        mutedForeground: "225 5% 55%",
        accent: "160 52% 45%",
        accentForeground: "0 0% 98%",
        destructive: "0 62% 30%",
        destructiveForeground: "0 0% 98%",
        border: "225 6% 20%",
        input: "225 6% 12%",
        ring: "160 52% 45%"
    },
    evergreens: {
        background: "120 15% 20%",
        foreground: "60 30% 96%",
        card: "120 15% 15%",
        cardForeground: "60 30% 96%",
        popover: "120 15% 20%",
        popoverForeground: "60 30% 96%",
        primary: "90 40% 50%",
        primaryForeground: "120 15% 10%",
        secondary: "120 10% 10%",
        secondaryForeground: "60 30% 96%",
        muted: "120 10% 15%",
        mutedForeground: "60 10% 80%",
        accent: "60 80% 60%",
        accentForeground: "120 15% 10%",
        destructive: "0 62.8% 30.6%",
        destructiveForeground: "60 30% 96%",
        border: "120 15% 30%",
        input: "120 10% 10%",
        ring: "90 40% 50%"
    },
    gruvbox: {
        background: "40 8% 20%",
        foreground: "40 4% 90%",
        card: "40 8% 16%",
        cardForeground: "40 4% 90%",
        popover: "40 8% 20%",
        popoverForeground: "40 4% 90%",
        primary: "40 70% 60%",
        primaryForeground: "40 8% 10%",
        secondary: "18 30% 40%",
        secondaryForeground: "40 4% 90%",
        muted: "40 8% 15%",
        mutedForeground: "40 4% 70%",
        accent: "18 80% 50%",
        accentForeground: "40 4% 90%",
        destructive: "0 50% 40%",
        destructiveForeground: "40 4% 90%",
        border: "40 8% 30%",
        input: "40 8% 15%",
        ring: "40 70% 60%"
    },
    "ice-world": {
        background: "60 10% 98%",
        foreground: "240 10% 20%",
        card: "0 0% 100%",
        cardForeground: "240 10% 20%",
        popover: "60 10% 98%",
        popoverForeground: "240 10% 20%",
        primary: "240 10% 20%",
        primaryForeground: "0 0% 100%",
        secondary: "240 5% 90%",
        secondaryForeground: "240 10% 20%",
        muted: "240 5% 95%",
        mutedForeground: "240 5% 50%",
        accent: "210 80% 60%",
        accentForeground: "0 0% 100%",
        destructive: "0 70% 50%",
        destructiveForeground: "0 0% 100%",
        border: "240 5% 85%",
        input: "240 5% 90%",
        ring: "210 80% 60%"
    },
    "purple-orange": {
        background: "270 20% 15%",
        foreground: "0 0% 98%",
        card: "270 20% 12%",
        cardForeground: "0 0% 98%",
        popover: "270 20% 15%",
        popoverForeground: "0 0% 98%",
        primary: "270 70% 60%",
        primaryForeground: "0 0% 98%",
        secondary: "270 20% 10%",
        secondaryForeground: "0 0% 98%",
        muted: "270 20% 10%",
        mutedForeground: "270 10% 70%",
        accent: "30 90% 60%",
        accentForeground: "0 0% 98%",
        destructive: "0 70% 40%",
        destructiveForeground: "0 0% 98%",
        border: "270 20% 25%",
        input: "270 20% 10%",
        ring: "270 70% 60%"
    },
    "orange-purple": {
        background: "30 15% 15%",
        foreground: "0 0% 98%",
        card: "30 15% 12%",
        cardForeground: "0 0% 98%",
        popover: "30 15% 15%",
        popoverForeground: "0 0% 98%",
        primary: "30 90% 60%",
        primaryForeground: "30 15% 10%",
        secondary: "30 15% 10%",
        secondaryForeground: "0 0% 98%",
        muted: "30 15% 10%",
        mutedForeground: "30 10% 70%",
        accent: "270 70% 60%",
        accentForeground: "0 0% 98%",
        destructive: "0 70% 40%",
        destructiveForeground: "0 0% 98%",
        border: "30 15% 25%",
        input: "30 15% 10%",
        ring: "30 90% 60%"
    },
    "pink-dream": {
        background: "330 30% 92%",
        foreground: "330 20% 20%",
        card: "330 30% 98%",
        cardForeground: "330 20% 20%",
        popover: "330 30% 92%",
        popoverForeground: "330 20% 20%",
        primary: "330 80% 60%",
        primaryForeground: "0 0% 100%",
        secondary: "330 30% 88%",
        secondaryForeground: "330 20% 20%",
        muted: "330 30% 85%",
        mutedForeground: "330 20% 40%",
        accent: "270 60% 60%",
        accentForeground: "0 0% 100%",
        destructive: "0 70% 50%",
        destructiveForeground: "0 0% 100%",
        border: "330 30% 80%",
        input: "330 30% 88%",
        ring: "330 80% 60%"
    },
    cyberpunk: {
        background: "220 80% 8%",
        foreground: "0 0% 98%",
        card: "220 80% 5%",
        cardForeground: "0 0% 98%",
        popover: "220 80% 8%",
        popoverForeground: "0 0% 98%",
        primary: "160 100% 50%",
        primaryForeground: "220 80% 5%",
        secondary: "220 80% 3%",
        secondaryForeground: "0 0% 98%",
        muted: "220 80% 3%",
        mutedForeground: "220 10% 70%",
        accent: "320 100% 60%",
        accentForeground: "0 0% 98%",
        destructive: "0 100% 50%",
        destructiveForeground: "0 0% 98%",
        border: "220 80% 15%",
        input: "220 80% 3%",
        ring: "160 100% 50%"
    },
    desert: {
        background: "35 25% 90%",
        foreground: "35 30% 15%",
        card: "35 25% 97%",
        cardForeground: "35 30% 15%",
        popover: "35 25% 90%",
        popoverForeground: "35 30% 15%",
        primary: "35 90% 50%",
        primaryForeground: "35 30% 15%",
        secondary: "35 25% 85%",
        secondaryForeground: "35 30% 15%",
        muted: "35 25% 85%",
        mutedForeground: "35 20% 40%",
        accent: "20 80% 40%",
        accentForeground: "35 25% 97%",
        destructive: "0 70% 50%",
        destructiveForeground: "35 25% 97%",
        border: "35 25% 75%",
        input: "35 25% 85%",
        ring: "35 90% 50%"
    }
};

let currentColorMode = 'hex';

function applyTheme(themeName, themeData = null) {
    const theme = themeData || themes[themeName] || themes.original;
    const root = document.documentElement;
    
    Object.keys(theme).forEach(key => {
        const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(cssVar, theme[key]);
    });
    
    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
        try {
            const iframeRoot = iframe.contentWindow.document.documentElement;
            Object.keys(theme).forEach(key => {
                const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                iframeRoot.style.setProperty(cssVar, theme[key]);
            });
        } catch (e) {}
    }
}

function changeTheme(themeName) {
    const customEditor = document.getElementById('custom-theme-editor');
    
    if (themeName === 'custom') {
        const savedCustom = localStorage.getItem('custom-theme-data');
        if (!savedCustom) {
            const currentColors = getCurrentTheme();
            localStorage.setItem('custom-theme-data', JSON.stringify(currentColors));
            applyTheme('custom', currentColors);
        } else {
            applyTheme('custom', JSON.parse(savedCustom));
        }
        customEditor.style.display = 'block';
        loadCustomThemeEditor();
    } else {
        customEditor.style.display = 'none';
        applyTheme(themeName);
        localStorage.setItem('selected-theme', themeName);
    }
}

function loadCustomThemeEditor() {
    const themeColors = document.getElementById('theme-colors');
    const currentThemeValues = getCurrentTheme();
    
    themeColors.innerHTML = '';
    
    Object.keys(themes.original).forEach(key => {
        const colorInput = document.createElement('div');
        colorInput.className = 'color-input';
        
        const label = document.createElement('label');
        label.textContent = key.replace(/([A-Z])/g, ' $1').trim();
        
        const input = document.createElement('input');
        input.type = 'text';
        
        const activeColor = currentThemeValues[key];
        input.value = currentColorMode === 'hex' 
            ? hslToHex(activeColor) 
            : activeColor;
            
        input.dataset.key = key;
        input.addEventListener('input', updateCustomTheme);
        
        colorInput.appendChild(label);
        colorInput.appendChild(input);
        themeColors.appendChild(colorInput);
    });

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '10px';
    buttonGroup.style.marginTop = '10px';

    const shareBtn = document.createElement('button');
    shareBtn.textContent = 'Share Theme';
    shareBtn.className = 'customize-btn';
    shareBtn.style.flex = '1';
    shareBtn.onclick = shareTheme;
    
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Import Theme';
    importBtn.className = 'customize-btn';
    importBtn.style.flex = '1';
    importBtn.onclick = importTheme;
    
    buttonGroup.appendChild(shareBtn);
    buttonGroup.appendChild(importBtn);
    themeColors.appendChild(buttonGroup);
}

function setColorMode(mode) {
    currentColorMode = mode;
    document.querySelectorAll('.color-mode-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    loadCustomThemeEditor();
}

function updateCustomTheme(e) {
    const key = e.target.dataset.key;
    let value = e.target.value;
    
    if (currentColorMode === 'hex') {
        if (/^#[0-9A-F]{6}$/i.test(value)) {
            value = hexToHsl(value);
        } else {
            return;
        }
    }
    
    const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    document.documentElement.style.setProperty(cssVar, value);
    
    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.document.documentElement.style.setProperty(cssVar, value);
        } catch (err) {}
    }
    
    const updatedTheme = getCurrentTheme();
    localStorage.setItem('custom-theme-data', JSON.stringify(updatedTheme));
    localStorage.setItem('selected-theme', 'custom');
}

function getCurrentTheme() {
    const root = document.documentElement;
    const theme = {};
    Object.keys(themes.original).forEach(key => {
        const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        theme[key] = getComputedStyle(root).getPropertyValue(cssVar).trim();
    });
    return theme;
}

function shareTheme() {
    const theme = getCurrentTheme();
    const encoded = btoa(JSON.stringify(theme));
    navigator.clipboard.writeText(encoded).then(() => {
        alert('Theme code copied to clipboard!');
    });
}

function importTheme() {
    const code = prompt('Paste theme code:');
    if (!code) return;
    try {
        const theme = JSON.parse(atob(code));
        localStorage.setItem('custom-theme-data', JSON.stringify(theme));
        applyTheme('custom', theme);
        loadCustomThemeEditor();
        alert('Theme imported successfully!');
    } catch (e) {
        alert('Invalid theme code!');
    }
}

function hslToHex(hsl) {
    if (!hsl) return "#000000";
    const parts = hsl.split(' ');
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, (h / 360) + 1/3);
    const g = hue2rgb(p, q, h / 360);
    const b = hue2rgb(p, q, (h / 360) - 1/3);
    
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function generateGiscusThemeCSS(theme) {
    const parse = (hsl) => hsl.split(' ');
    const bg = parse(theme.background);
    const fg = parse(theme.foreground);
    const accent = parse(theme.accent);
    const border = parse(theme.border);
    const css = `main{--color-fg-default:${fg[0]} ${fg[1]} ${fg[2]};--color-canvas-default:${bg[0]} ${bg[1]} ${bg[2]};--color-border-default:${border[0]} ${border[1]} ${border[2]};--color-accent-fg:${accent[0]} ${accent[1]} ${accent[2]};--color-btn-primary-bg:${accent[0]} ${accent[1]} ${accent[2]};}*{font-family:'JetBrains Mono',monospace!important;}main{background-color:transparent!important;}.gsc-comment-box,.gsc-comment,.gsc-reply-box,.gsc-reactions,button,input,textarea{border-radius:0!important;}`;
    return `data:text/css;base64,${btoa(css)}`;
}

const savedTheme = localStorage.getItem('selected-theme') || 'vitesse-dark';
if (savedTheme === 'custom') {
    const savedCustom = localStorage.getItem('custom-theme-data');
    if (savedCustom) applyTheme('custom', JSON.parse(savedCustom));
    else applyTheme('vitesse-dark');
} else {
    applyTheme(savedTheme);
}

window.addEventListener('message', (e) => {
    if (e.data === 'iframe-loaded') {
        const current = localStorage.getItem('selected-theme') || 'vitesse-dark';
        if (current === 'custom') {
            const data = localStorage.getItem('custom-theme-data');
            if (data) applyTheme('custom', JSON.parse(data));
        } else {
            applyTheme(current);
        }
    }
});