let currentAnnouncementIndex = 0;
let announcementInterval;
let sidebarCollapsed = false;
let pendingPage = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    await loadAnnouncements();
    await loadCustomPages();
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    
    const savedTheme = localStorage.getItem('selected-theme') || 'vitesse-dark';
    document.getElementById('theme-select').value = savedTheme;
    
    sessionStorage.removeItem('announcement-closed');
    const announcementClosed = sessionStorage.getItem('announcement-closed');
    if (announcementClosed) {
        document.getElementById('announcement-banner').classList.add('hidden');
        document.getElementById('main-content').classList.add('no-banner');
    }

    setInterval(async () => {
        const expire = sessionStorage.getItem('sidebar_expire');
        if (expire && Date.now() > parseInt(expire)) {
            sessionStorage.removeItem('sidebar_expire');
            await loadCustomPages();
            
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const currentPageId = params.get('page');

            if (currentPageId && currentPageId !== 'home') {
                const data = await loadYAML('/storage/data/custom.yaml');
                if (data && data.customPages) {
                    let shouldKick = false;
                    for (const key in data.customPages) {
                        const page = data.customPages[key].sub.find(p => String(p.id) === String(currentPageId));
                        if (page && (page.hidden || page.locked)) {
                            shouldKick = true;
                            break;
                        }
                    }
                    if (shouldKick) {
                        window.location.hash = '#page=home';
                        loadPage('home');
                    }
                }
            }
        }
    }, 5000);
}

async function loadYAML(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        return jsyaml.load(text);
    } catch (error) {
        console.error(`Error loading YAML file: ${path}`, error);
        return null;
    }
}

async function loadAnnouncements() {
    try {
        const data = await loadYAML('/storage/data/announcements.yaml');
        if (!data || !data.announcements) return;
        const announcements = data.announcements;
        if (announcements.length === 0) return;
        displayAnnouncement(0, announcements);
        if (announcements.length > 1) {
            announcementInterval = setInterval(() => {
                currentAnnouncementIndex = (currentAnnouncementIndex + 1) % announcements.length;
                displayAnnouncement(currentAnnouncementIndex, announcements);
            }, 3000);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

async function displayAnnouncement(index, announcements) {
    const announcement = announcements[index];
    const content = document.querySelector('.announcement-content');
    
    const renderer = new marked.Renderer();
    renderer.codespan = (code) => `<code style="background:rgba(0,0,0,0.2);padding:2px 4px;font-family:monospace;">${code}</code>`;
    
    content.innerHTML = marked.parse(announcement, { renderer });
}

function closeAnnouncement() {
    document.getElementById('announcement-banner').classList.add('hidden');
    document.getElementById('main-content').classList.add('no-banner');
    sessionStorage.setItem('announcement-closed', 'true');
    if (announcementInterval) clearInterval(announcementInterval);
}

async function loadCustomPages() {
    try {
        const data = await loadYAML('/storage/data/custom.yaml');
        if (!data || !data.customPages) return;

        const container = document.getElementById('custom-pages-container');
        container.innerHTML = '';
        
        const expire = sessionStorage.getItem('sidebar_expire');
        const isRevealed = expire && Date.now() < parseInt(expire);

        Object.entries(data.customPages).forEach(([key, category]) => {
            if (!category.sub) return;

            const visibleSub = category.sub.filter(p => isRevealed || (!p.hidden && !p.locked));
            if (visibleSub.length === 0) return;

            const section = document.createElement('div');
            section.className = 'nav-section';

            const header = document.createElement('h3');
            header.textContent = (category.display || key).toUpperCase();
            section.appendChild(header);

            category.sub.forEach(page => {
                if (!isRevealed && (page.hidden || page.locked || !page.name)) return;
                const link = document.createElement('a');
                link.href = `#page=${page.id}`;
                link.textContent = page.name;
                link.onclick = (e) => {
                    e.preventDefault();
                    loadPage(page.id);
                };
                section.appendChild(link);
            });
            container.appendChild(section);
        });
    } catch (error) {
        console.error('Error loading custom pages:', error);
    }
}

function handleHashNavigation() {
    const hash = window.location.hash.substring(1);
    if (!hash || hash === '') {
        loadPage('home');
        return;
    }
    const params = new URLSearchParams(hash);
    const page = params.get('page') || 'home';
    params.delete('page');
    loadPage(page, params.toString());
}

async function loadPage(pageName, args = '') {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href && href.includes(`page=${pageName}`)) link.classList.add('active');
    });
    
    const pageBase = '/storage/internal/pages/main/';
    const customData = await loadYAML('/storage/data/custom.yaml');
    if (customData && customData.customPages) {
        let customPage = null;
        for (const key in customData.customPages) {
            const found = customData.customPages[key].sub.find(p => String(p.id) === String(pageName));
            if (found) {
                customPage = found;
                break;
            }
        }
        
        if (customPage) {
            if (customPage.locked && sessionStorage.getItem('unlocked_' + pageName) !== 'true') {
                pendingPage = { id: pageName, args: args };
                document.getElementById('lock-modal').classList.add('active');
                return;
            }

            let pagePath = customPage.path;
            if (pagePath.startsWith('~/')) {
                pagePath = '/storage/internal/pages/custom/' + pagePath.substring(2);
                const pathParts = pagePath.split('/');
                const resolvedParts = [];
                for (const part of pathParts) {
                    if (part === '..') {
                        if (resolvedParts.length > 0) resolvedParts.pop();
                    } else if (part !== '.' && part !== '') {
                        resolvedParts.push(part);
                    }
                }
                pagePath = (pagePath.startsWith('/') ? '/' : '') + resolvedParts.join('/');
            }

            const typeInfo = typeof customPage.type === 'object' ? customPage.type : { type: customPage.type };
            const pageType = typeInfo.type || 'raw';
            const iframe = document.getElementById('content-frame');

            let targetUrl = '';
            const encodedPath = encodeURIComponent(pagePath);
            
            if (pageType === 'section') {
                targetUrl = `${pageBase}custom.html${args ? '#' + args : ''}`;
            } else if (pageType === 'raw') {
                targetUrl = `${pageBase}raw.html?file=${encodedPath}`;
            } else if (pageType.startsWith('gallery')) {
                targetUrl = `${pageBase}gallery.html?file=${encodedPath}&type=${pageType}${args ? '&' + args : ''}`;
            } else if (pageType === 'md') {
                targetUrl = `${pageBase}md-viewer.html?file=${encodedPath}`;
            } else if (pageType === 'html') {
                targetUrl = pagePath;
            }

            iframe.src = targetUrl;
            history.replaceState(null, null, args ? `#page=${pageName}&${args}` : `#page=${pageName}`);
            return;
        }
    }
    
    const iframe = document.getElementById('content-frame');
    const targetUrl = args ? `${pageBase}${pageName}.html#${args}` : `${pageBase}${pageName}.html`;
    
    const currentSrc = iframe.getAttribute('src');
    const isSamePage = currentSrc && currentSrc.split('#')[0].endsWith(targetUrl.split('#')[0].split('/').pop());

    iframe.src = targetUrl;
    
    if (isSamePage && iframe.contentWindow) {
        iframe.contentWindow.location.reload();
    }

    history.replaceState(null, null, `#page=${pageName}${args ? '&' + args : ''}`);
}

function requestReveal() {
    pendingPage = { id: 'reveal_sidebar' };
    closePreferences();
    document.getElementById('lock-modal').classList.add('active');
}

function requestHide() {
    sessionStorage.removeItem('sidebar_expire');
    
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('unlocked_')) {
            sessionStorage.removeItem(key);
        }
    });

    loadCustomPages();
    updatePreferenceButtons();
    
    const params = new URLSearchParams(window.location.hash.substring(1));
    const currentPageId = params.get('page');
    
    if (currentPageId) {
        loadYAML('/storage/data/custom.yaml').then(data => {
            if (data && data.customPages) {
                let isNowHidden = false;
                for (const key in data.customPages) {
                    const page = data.customPages[key].sub.find(p => String(p.id) === String(currentPageId));
                    if (page && (page.hidden || page.locked)) {
                        isNowHidden = true;
                        break;
                    }
                }
                if (isNowHidden) {
                    loadPage('home');
                }
            }
        });
    }

    closePreferences();
}

window.requestUnlock = function(pageId, fullHash) {
    pendingPage = { id: pageId, args: fullHash, isDeepLink: true };
    document.getElementById('lock-modal').classList.add('active');
}

function checkLock() {
    const input = document.getElementById('lock-input').value;
    if (input === "Canned Pineapple") {
        if (pendingPage && pendingPage.id === 'reveal_sidebar') {
            const expiryTime = Date.now() + 1800000;
            sessionStorage.setItem('sidebar_expire', expiryTime.toString());
            loadCustomPages();
            updatePreferenceButtons();
            closeLockModal();
        } else if (pendingPage && pendingPage.isDeepLink) {
            sessionStorage.setItem('unlocked_' + pendingPage.id, 'true');
            const iframe = document.getElementById('content-frame');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.location.reload();
            }
            closeLockModal();
        } else {
            sessionStorage.setItem('unlocked_' + pendingPage.id, 'true');
            const pageToLoad = pendingPage;
            closeLockModal();
            loadPage(pageToLoad.id, pageToLoad.args);
        }
    } else {
        alert("Incorrect.");
    }
}

function closeLockModal() {
    document.getElementById('lock-modal').classList.remove('active');
    document.getElementById('lock-input').value = '';
    pendingPage = null;
}

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('toggle-icon');
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    icon.textContent = sidebarCollapsed ? '»' : '☰';
}

function updatePreferenceButtons() {
    const expire = sessionStorage.getItem('sidebar_expire');
    const isRevealed = expire && Date.now() < parseInt(expire);
    const showBtn = document.getElementById('show-hidden-btn');
    const hideBtn = document.getElementById('hide-hidden-btn');

    if (!showBtn || !hideBtn) return;

    if (isRevealed) {
        showBtn.disabled = true;
        showBtn.style.opacity = "0.3";
        showBtn.style.cursor = "not-allowed";
        showBtn.style.background = "hsl(var(--secondary))";
        showBtn.style.border = "2px solid hsl(var(--border))";
        hideBtn.disabled = false;
        hideBtn.style.opacity = "1";
        hideBtn.style.cursor = "pointer";
        hideBtn.style.background = "hsl(var(--accent))";
        hideBtn.style.border = "none";
    } else {
        showBtn.disabled = false;
        showBtn.style.opacity = "1";
        showBtn.style.cursor = "pointer";
        showBtn.style.background = "hsl(var(--accent))";
        showBtn.style.border = "none";
        hideBtn.disabled = true;
        hideBtn.style.opacity = "0.3";
        hideBtn.style.cursor = "not-allowed";
        hideBtn.style.background = "hsl(var(--secondary))";
        hideBtn.style.border = "2px solid hsl(var(--border))";
    }
}

function openPreferences() {
    document.getElementById('preferences-modal').classList.add('active');
    updatePreferenceButtons();
}

function closePreferences() {
    document.getElementById('preferences-modal').classList.remove('active');
}

function toggleCustomEditor() {
    const editor = document.getElementById('custom-theme-editor');
    if (editor.style.display === 'none') {
        editor.style.display = 'block';
        loadCustomThemeEditor();
    } else {
        editor.style.display = 'none';
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closePreferences();
        closeLockModal();
    }
});

async function updateVisitorCount() {
    const namespace = "devicals-github-io";
    const key = "main-counter";
    const display = document.getElementById('visit-count');
    const hasVisited = localStorage.getItem('has_visited_before');
    const primaryUrl = `https://api.counterapi.dev/v1/${namespace}/${key}`;

    try {
        let response;
        if (!hasVisited) {
            response = await fetch(`${primaryUrl}/up`);
            localStorage.setItem('has_visited_before', 'true');
        } else {
            if (!display) return; 
            response = await fetch(`${primaryUrl}/`);
        }
        const data = await response.json();
        const count = data.count || data.value;
        if (display && count !== undefined) display.textContent = count.toString().padStart(6, '0');
    } catch (err) {
        if (display) display.textContent = "??????";
    }
}

document.addEventListener('DOMContentLoaded', updateVisitorCount);