if (window.self === window.top) {
    const path = window.location.pathname;
    const pageName = path.split('/').pop().replace('.html', '');
    window.location.href = '/#page=' + pageName + window.location.hash + window.location.search;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
        window.parent.postMessage({ type: 'alt-pressed' }, '*');
    }
});

document.addEventListener('mousedown', () => {
    window.parent.postMessage({ type: 'iframe-click' }, '*');
}, true);