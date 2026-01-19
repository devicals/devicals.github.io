if (window.self === window.top) {
    const path = window.location.pathname;
    const pageName = path.split('/').pop().replace('.html', '');
    const currentHash = window.location.hash.replace('#', '');
    const currentSearch = window.location.search.replace('?', '');
    let newHash = `page=${pageName}`;
    if (currentHash) newHash += `&${currentHash}`;
    if (currentSearch) newHash += `&${currentSearch}`;
    window.location.href = './#' + newHash;
}