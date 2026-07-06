const SUPABASE_URL = "https://wtasesmqwpnbwzdynnas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ay0PuIePjZwrEgP5XpD5iQ_W5wC-5g9";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentAnnouncementIndex = 0;
let announcementInterval;
let sidebarOpen = false;
let pendingPage = null;
let titleIdx = 0;
const rawTitle = "painful existence, silent suffering ";
let isAdmin = false;
let currentAnnouncements = [];

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    startTitleAnimation();
});

function startTitleAnimation() {
    const updateTitle = () => {
        const slice = rawTitle.substring(titleIdx) + rawTitle.substring(0, titleIdx);
        document.title = slice.substring(0, 14);
        titleIdx = (titleIdx + 1) % rawTitle.length;
    };
    let interval = setInterval(updateTitle, 200);
    document.addEventListener('visibilitychange', () => {
        clearInterval(interval);
        interval = setInterval(updateTitle, document.hidden ? 1000 : 200);
    });
}

function toggleSection(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
}

async function initializeApp() {
    initAuth();
    await loadAnnouncements();
    await loadCustomPages();
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    
    const savedTheme = localStorage.getItem('selected-theme') || 'vitesse-dark';
    const select = document.getElementById('theme-select');
    if (select) select.value = savedTheme;
    
    sessionStorage.removeItem('announcement-closed');

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

async function initAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    handleUserSession(session);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        handleUserSession(session);
    });
}

function handleUserSession(session) {
    if (session && session.user && session.user.email.toLowerCase() === '3rr0r.d3v@gmail.com') {
        isAdmin = true;
        document.body.classList.add('is-admin');
        const editBtn = document.getElementById('edit-ann-btn');
        if (editBtn) {
            editBtn.onclick = () => editAnnouncements();
        }
    } else {
        isAdmin = false;
        document.body.classList.remove('is-admin');
    }
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
        const { data, error } = await supabaseClient
            .from('site_content')
            .select('data')
            .eq('key', 'announcements')
            .single();

        if (data && data.data) {
            applyAnnouncements(data.data);
        }

        supabaseClient
            .channel('ann-realtime')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'site_content', filter: 'key=eq.announcements' },
                (payload) => {
                    if (payload.new && payload.new.data) {
                        applyAnnouncements(payload.new.data);
                    }
                }
            )
            .subscribe();
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

function applyAnnouncements(data) {
    currentAnnouncements = data;
    if (currentAnnouncements.length === 0) {
        closeAnnouncement();
        return;
    }
    document.getElementById('announcement-banner').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('no-banner');
    displayAnnouncement(0, currentAnnouncements);
    if (announcementInterval) clearInterval(announcementInterval);
    if (currentAnnouncements.length > 1) {
        announcementInterval = setInterval(() => {
            currentAnnouncementIndex = (currentAnnouncementIndex + 1) % currentAnnouncements.length;
            displayAnnouncement(currentAnnouncementIndex, currentAnnouncements);
        }, 3000);
    }
}

async function displayAnnouncement(index, announcements) {
    const announcement = announcements[index];
    const content = document.querySelector('.announcement-content');
    const renderer = new marked.Renderer();
    renderer.codespan = (code) => `<code style="background:rgba(0,0,0,0.2);padding:2px 4px;font-family:monospace;">${code}</code>`;
    content.innerHTML = marked.parse(announcement, { renderer });
}

function editAnnouncements() {
    if (!isAdmin) return;
    if (announcementInterval) clearInterval(announcementInterval);
    const textValue = currentAnnouncements.join('\n');
    const newText = prompt("Edit Announcements (one per line):", textValue);
    if (newText === null) {
        applyAnnouncements(currentAnnouncements);
        return;
    }
    const updated = newText.split('\n').map(x => x.trim()).filter(x => x.length > 0);
    saveAnnouncements(updated);
}

async function saveAnnouncements(updatedList) {
    const { error } = await supabaseClient
        .from('site_content')
        .update({ data: updatedList })
        .eq('key', 'announcements');
    if (error) {
        alert("Error saving: " + error.message);
    }
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
            header.onclick = () => toggleSection(header);
            section.appendChild(header);

            category.sub.forEach((page, index) => {
                if (!isRevealed && (page.hidden || page.locked || !page.name)) return;
                const pageTypeData = typeof page.type === 'object' ? page.type : { type: page.type };
                const isRef = pageTypeData.type === 'refsection';
                const wrapper = document.createElement('div');
                wrapper.className = 'nav-item-wrapper';
                
                if (isRef) {
                    const connector = document.createElement('div');
                    connector.className = 'tree-connector';
                    const nextItem = category.sub[index + 1];
                    const nextIsRef = nextItem && 
                                     (typeof nextItem.type === 'object' ? nextItem.type.type : nextItem.type) === 'refsection' && 
                                     nextItem.type.refid === pageTypeData.refid;
                    if (!nextIsRef) wrapper.classList.add('last-ref');
                    wrapper.appendChild(connector);
                }

                const link = document.createElement('a');
                link.href = `#page=${page.id}`;
                link.textContent = page.display || page.name;
                if (isRef) link.classList.add('is-ref');
                
                link.onclick = (e) => {
                    e.preventDefault();
                    loadPage(page.id);
                    toggleSidebar();
                };

                wrapper.appendChild(link);
                section.appendChild(wrapper);
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

            let pagePath = customPage.path.startsWith('~/') ? '/storage/internal/pages/custom/' + customPage.path.substring(2) : customPage.path;
            const typeInfo = typeof customPage.type === 'object' ? customPage.type : { type: customPage.type };
            let pageType = typeInfo.type || 'raw';
            if (pageType === 'refsection') pageType = 'section'; 

            const iframe = document.getElementById('content-frame');
            let targetUrl = '';
            if (pageType === 'section' || pageType === 'interests') targetUrl = `${pageBase}custom.html${args ? '#' + args : ''}`;
            else if (pageType === 'raw') targetUrl = `${pageBase}raw.html?file=${encodeURIComponent(pagePath)}`;
            else if (pageType.startsWith('gallery')) targetUrl = `${pageBase}gallery.html?file=${encodeURIComponent(pagePath)}&type=${pageType}${args ? '&' + args : ''}`;
            else if (pageType === 'md') targetUrl = `${pageBase}md-viewer.html?file=${encodeURIComponent(pagePath)}`;
            else if (pageType === 'html') targetUrl = pagePath;

            iframe.src = targetUrl;
            history.replaceState(null, null, args ? `#page=${pageName}&${args}` : `#page=${pageName}`);
            return;
        }
    }
    
    const iframe = document.getElementById('content-frame');
    iframe.src = args ? `${pageBase}${pageName}.html#${args}` : `${pageBase}${pageName}.html`;
    history.replaceState(null, null, `#page=${pageName}${args ? '&' + args : ''}`);
}

function requestReveal() { pendingPage = { id: 'reveal_sidebar' }; closePreferences(); document.getElementById('lock-modal').classList.add('active'); }
function requestHide() { sessionStorage.removeItem('sidebar_expire'); loadCustomPages(); updatePreferenceButtons(); closePreferences(); }

function checkLock() {
    const input = document.getElementById('lock-input').value;
    if (input === "Canned Pineapple") {
        if (pendingPage && pendingPage.id === 'reveal_sidebar') {
            sessionStorage.setItem('sidebar_expire', (Date.now() + 1800000).toString());
            loadCustomPages();
            updatePreferenceButtons();
        } else {
            sessionStorage.setItem('unlocked_' + pendingPage.id, 'true');
            loadPage(pendingPage.id, pendingPage.args);
        }
        closeLockModal();
    } else alert("Incorrect.");
}

function closeLockModal() { document.getElementById('lock-modal').classList.remove('active'); document.getElementById('lock-input').value = ''; pendingPage = null; }

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
    document.getElementById('sidebar-overlay').classList.toggle('active', sidebarOpen);
    document.getElementById('toggle-icon').textContent = sidebarOpen ? '▼' : '▲';
}

function updatePreferenceButtons() {
    const expire = sessionStorage.getItem('sidebar_expire');
    const isRevealed = expire && Date.now() < parseInt(expire);
    const showBtn = document.getElementById('show-hidden-btn');
    const hideBtn = document.getElementById('hide-hidden-btn');
    if (!showBtn || !hideBtn) return;
    showBtn.disabled = isRevealed;
    hideBtn.disabled = !isRevealed;
}

function openPreferences() { document.getElementById('preferences-modal').classList.add('active'); updatePreferenceButtons(); }
function closePreferences() { document.getElementById('preferences-modal').classList.remove('active'); }
function toggleCustomEditor() { 
    const editor = document.getElementById('custom-theme-editor');
    editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) { closePreferences(); closeLockModal(); } });

async function updateVisitorCount() {
    const namespace = "devicals-github-io";
    const key = "main-counter";
    const display = document.getElementById('visit-count');
    const hasVisited = localStorage.getItem('has_visited_before');
    try {
        let response = await fetch(`https://api.counterapi.dev/v1/${namespace}/${key}${hasVisited ? '/' : '/up'}`);
        if (!hasVisited) localStorage.setItem('has_visited_before', 'true');
        const data = await response.json();
        const count = data.count || data.value;
        if (display && count !== undefined) display.textContent = count.toString().padStart(6, '0');
    } catch (err) { if (display) display.textContent = "??????"; }
}
document.addEventListener('DOMContentLoaded', updateVisitorCount);