if (window.self === window.top) {
    const path = window.location.pathname;
    const pageName = path.split('/').pop().replace('.html', '');
    window.location.href = '/#page=' + pageName + window.location.hash + window.location.search;
}