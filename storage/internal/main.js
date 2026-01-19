
let currentAnnouncementIndex = 0;
let announcementInterval;
let sidebarCollapsed = false;

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    await loadAnnouncements();
    await loadCustomPages();
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    
    const savedTheme = localStorage.getItem('selected-theme') || 'default';
    document.getElementById('theme-select').value = savedTheme;
    
    sessionStorage.removeItem('announcement-closed');
    const announcementClosed = sessionStorage.getItem('announcement-closed');
    if (announcementClosed) {
        document.getElementById('announcement-banner').classList.add('hidden');
        document.getElementById('main-content').classList.add('no-banner');
    }
}

async function loadYAML(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        return jsyaml.load(text);
    } catch (error) {
        console.error(`Error loading YAML file: ${path}`, error);
        return null;
    }
}

async function loadAnnouncements() {
    try {
        const data = await loadYAML('storage/data/announcements.yaml');
        
        console.log('Announcements loaded:', data);
        
        if (!data || !data.announcements) {
            console.log('No announcements data found');
            return;
        }
        
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

function displayAnnouncement(index, announcements) {
    const announcement = announcements[index];
    const content = document.querySelector('.announcement-content');
    content.innerHTML = marked.parse(announcement);
}

function closeAnnouncement() {
    document.getElementById('announcement-banner').classList.add('hidden');
    document.getElementById('main-content').classList.add('no-banner');
    sessionStorage.setItem('announcement-closed', 'true');
    
    if (announcementInterval) {
        clearInterval(announcementInterval);
    }
}

async function loadCustomPages() {
    try {
        const data = await loadYAML('storage/data/custom.yaml');
        console.log('Custom pages loaded:', data);
        
        if (!data || !data.customPages) {
            console.log('No custom pages data found');
            return;
        }
        
        const customPagesContainer = document.getElementById('custom-pages');
        
        data.customPages.forEach(page => {
            console.log('Processing custom page:', page);
            
            if (page.locked) {
                console.log('Skipping locked page:', page.id);
                return;
            }
            
            if (!page.name) {
                console.log('Skipping unnamed page:', page.id);
                return;
            }
            
            const link = document.createElement('a');
            link.href = `#page=${page.id}`;
            link.textContent = page.name;
            link.onclick = (e) => {
                e.preventDefault();
                loadPage(page.id);
            };
            
            customPagesContainer.appendChild(link);
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
    const args = params.toString();
    
    loadPage(page, args);
}

async function loadPage(pageName, args = '') {
    console.log('Loading page:', pageName, 'with args:', args);
    
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href) {
            const linkPage = href.replace('#page=', '');
            if (linkPage === pageName) {
                link.classList.add('active');
            }
        }
    });
    
    const customData = await loadYAML('storage/data/custom.yaml');
    if (customData && customData.customPages) {
        const customPage = customData.customPages.find(p => p.id === pageName);
        
        if (customPage) {
            console.log('Loading custom page:', customPage);
            
            let pageType = customPage.type.type;
            if (!pageType) {
                if (customPage.path.endsWith('.yaml') || customPage.path.endsWith('.yml')) {
                    pageType = 'section';
                } else if (customPage.path.endsWith('.md') || customPage.path.endsWith('.wiki')) {
                    pageType = 'md';
                } else if (customPage.path.endsWith('.html')) {
                    pageType = 'html';
                }
                else {
                    pageType = 'raw';
                }
            }
            
            const iframe = document.getElementById('content-frame');
            
            if (pageType === 'section') {
                const url = args ? `custom.html#${args}` : `custom.html`;
                iframe.src = url;
            } else if (pageType === 'md') {
                iframe.src = `md-viewer.html?file=${encodeURIComponent(customPage.path)}`;
            } else if (pageType === 'html') {
                iframe.src = customPage.path;
            }
            else if (pageType === 'raw') {
                iframe.src = `raw.html?file=${encodeURIComponent(customPage.path)}`;
            }
            
            const newHash = args ? `page=${pageName}&${args}` : `page=${pageName}`;
            history.replaceState(null, null, `#${newHash}`);

            iframe.onload = () => {
                const savedTheme = localStorage.getItem('selected-theme') || 'default';
                if (savedTheme === 'custom') {
                    const savedCustom = localStorage.getItem('custom-theme-data');
                    if (savedCustom) {
                        applyTheme('custom', JSON.parse(savedCustom));
                    }
                } else {
                    applyTheme(savedTheme);
                }
            };
            return;
        }
    }
    
    const iframe = document.getElementById('content-frame');
    const url = args ? `${pageName}.html#${args}` : `${pageName}.html`;
    iframe.src = url;
    
    const newHash = args ? `page=${pageName}&${args}` : `page=${pageName}`;
    history.replaceState(null, null, `#${newHash}`);
    
    iframe.onload = () => {
        const savedTheme = localStorage.getItem('selected-theme') || 'default';
        if (savedTheme === 'custom') {
            const savedCustom = localStorage.getItem('custom-theme-data');
            if (savedCustom) {
                applyTheme('custom', JSON.parse(savedCustom));
            }
        } else {
            applyTheme(savedTheme);
        }
    };
}

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('toggle-icon');
    
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    icon.textContent = sidebarCollapsed ? '»' : '☰';
}

function openPreferences() {
    document.getElementById('preferences-modal').classList.add('active');
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
    const modal = document.getElementById('preferences-modal');
    if (e.target === modal) {
        closePreferences();
    }
});

async function updateVisitorCount() {
    const namespace = "devicals-github-io";
    const key = "main-counter";
    const display = document.getElementById('visit-count'); // Might be null
    const hasVisited = localStorage.getItem('has_visited_before');
    
    const primaryUrl = `https://api.counterapi.dev/v1/${namespace}/${key}`;

    try {
        let response;
        if (!hasVisited) {
            // This increments the count
            response = await fetch(`${primaryUrl}/up`);
            localStorage.setItem('has_visited_before', 'true');
        } else {
            // This only gets the count if we are on the info page
            // Logic: only fetch the "get" API if the counter display actually exists on this page
            if (!display) return; 
            response = await fetch(`${primaryUrl}/`);
        }
        
        const data = await response.json();
        const count = data.count || data.value;

        // Only try to update the text if the ID "visit-count" exists on the current page
        if (display && count !== undefined) {
            display.textContent = count.toString().padStart(6, '0');
        }

    } catch (err) {
        console.warn("Counter API failed.");
        if (display) display.textContent = "??????";
    }
}

document.addEventListener('DOMContentLoaded', updateVisitorCount);