const SUPABASE_URL = "https://wtasesmqwpnbwzdynnas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ay0PuIePjZwrEgP5XpD5iQ_W5wC-5g9";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentAnnouncementIndex = 0;
let announcementInterval;
let pendingPage = null;
let titleIdx = 0;
const rawTitle = "painful existence, silent suffering ";
let isAdmin = false;
let currentAnnouncements = [];
window.highestZ = 100;

document.addEventListener('DOMContentLoaded', async () => {
    makeDraggable('nav-window', 'nav-drag');
    makeDraggable('announcement-window', 'ann-drag');
    makeDraggable('settings-window', 'set-drag');
    makeDraggable('lock-window', 'lock-drag');
    
    await initializeApp();
    startTitleAnimation();
});

function makeDraggable(winId, handleId) {
    const win = document.getElementById(winId);
    const handle = document.getElementById(handleId);
    if (!win || !handle) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SPAN') return;
        e.preventDefault();
        win.style.zIndex = ++window.highestZ;
        if (e.type === 'touchstart') {
            pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY;
        } else {
            pos3 = e.clientX; pos4 = e.clientY;
        }
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        let clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        let clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        pos1 = pos3 - clientX; pos2 = pos4 - clientY;
        pos3 = clientX; pos4 = clientY;
        win.style.top = (win.offsetTop - pos2) + "px";
        win.style.left = (win.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
        document.ontouchend = null; document.ontouchmove = null;
    }
    
    win.addEventListener('mousedown', () => win.style.zIndex = ++window.highestZ);
    win.addEventListener('touchstart', () => win.style.zIndex = ++window.highestZ, {passive: true});
}

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
        }
    }, 5000);
}

async function initAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    handleUserSession(session);
    supabaseClient.auth.onAuthStateChange((_event, session) => handleUserSession(session));
}

function handleUserSession(session) {
    const portal = document.getElementById('settings-admin-portal');
    if (!portal) return;

    if (session && session.user && session.user.email.toLowerCase() === '3rr0r.d3v@gmail.com') {
        isAdmin = true;
        document.body.classList.add('is-admin');
        renderAdminPortal(session.user.email);
    } else {
        isAdmin = false;
        document.body.classList.remove('is-admin');
        renderLoginPortal();
    }
    loadCustomPages();

    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'auth-sync', session }, '*');
    }
}

function renderLoginPortal() {
    const portal = document.getElementById('settings-admin-portal');
    portal.innerHTML = `
        <label style="color:hsl(var(--muted-foreground)); font-size:10px;">ADMIN LOGIN</label>
        <input type="text" id="admin-email-field" class="ascii-input" style="width:100%; margin:4px 0;" value="3rr0r.d3v@gmail.com" readonly>
        <input type="password" id="admin-password-field" class="ascii-input" style="width:100%; margin-bottom:8px;" placeholder="Password">
        <button class="ascii-btn" style="color:hsl(var(--accent));" onclick="submitAdminLogin()">[ Login ]</button>
    `;
}

async function submitAdminLogin() {
    const email = document.getElementById('admin-email-field').value;
    const password = document.getElementById('admin-password-field').value;
    if (!password) return;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Login Failed: " + error.message);
}

function renderAdminPortal(email) {
    const portal = document.getElementById('settings-admin-portal');
    portal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span style="font-size:11px; color:hsl(var(--accent));">${email}</span>
            <button class="ascii-btn del" onclick="supabaseClient.auth.signOut()">[ Logout ]</button>
        </div>
        
        <div style="border-top:1px dashed hsl(var(--border)); padding-top:15px; margin-bottom:15px;">
            <label style="color:hsl(var(--muted-foreground)); font-size:10px;">DEV OPTIONS</label>
            <div style="display: flex; gap: 10px; margin-top: 8px;">
                <button id="show-hidden-btn" class="ascii-btn" onclick="requestReveal()">[ Show Hidden ]</button>
                <button id="hide-hidden-btn" class="ascii-btn" onclick="requestHide()">[ Hide Hidden ]</button>
            </div>
        </div>

        <div style="border-top:1px dashed hsl(var(--border)); padding-top:15px;">
            <label style="color:hsl(var(--muted-foreground)); font-size:10px;">ANNOUNCEMENTS</label>
            <div id="ann-manager-list" style="margin:8px 0; max-height:100px; overflow-y:auto; line-height:1.6;"></div>
            <div style="display:flex; gap:6px; align-items:center;">
                <input type="text" id="new-ann-input" class="ascii-input" placeholder="New announcement..." style="flex:1;">
                <button class="ascii-btn" onclick="addNewAnnouncement()" style="color:hsl(var(--accent));">[+]</button>
            </div>
        </div>
    `;
    renderManagerAnnouncements();
}

function renderManagerAnnouncements() {
    const listContainer = document.getElementById('ann-manager-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    currentAnnouncements.forEach((ann, idx) => {
        const item = document.createElement('div');
        item.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:12px;";
        item.innerHTML = `
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; margin-right:8px;">${ann}</span>
            <button class="ascii-btn del" onclick="deleteAnnouncement(${idx})">[x]</button>
        `;
        listContainer.appendChild(item);
    });
}

function addNewAnnouncement() {
    const input = document.getElementById('new-ann-input');
    const val = input.value.trim();
    if (!val) return;
    const newList = [...currentAnnouncements, val];
    saveAnnouncements(newList);
    input.value = '';
}

function deleteAnnouncement(idx) {
    const newList = currentAnnouncements.filter((_, i) => i !== idx);
    saveAnnouncements(newList);
}

async function loadYAML(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return jsyaml.load(await response.text());
    } catch (error) { return null; }
}

async function loadAnnouncements() {
    try {
        const { data, error } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data) applyAnnouncements(data.data);
        supabaseClient.channel('ann-realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_content', filter: 'key=eq.announcements' },
            (payload) => { if (payload.new && payload.new.data) applyAnnouncements(payload.new.data); }
        ).subscribe();
    } catch (e) {}
}

function applyAnnouncements(data) {
    currentAnnouncements = data;
    renderManagerAnnouncements();
    const win = document.getElementById('announcement-window');
    if (currentAnnouncements.length === 0) {
        win.style.display = 'none';
        return;
    }
    if(sessionStorage.getItem('announcement-closed') !== 'true') win.style.display = 'flex';
    
    displayAnnouncement(0, currentAnnouncements);
    if (announcementInterval) clearInterval(announcementInterval);
    if (currentAnnouncements.length > 1) {
        announcementInterval = setInterval(() => {
            currentAnnouncementIndex = (currentAnnouncementIndex + 1) % currentAnnouncements.length;
            displayAnnouncement(currentAnnouncementIndex, currentAnnouncements);
        }, 3000);
    }
}

function displayAnnouncement(index, announcements) {
    const content = document.getElementById('announcement-content');
    const renderer = new marked.Renderer();
    content.innerHTML = marked.parse(announcements[index], { renderer });
}

async function saveAnnouncements(updatedList) {
    await supabaseClient.from('site_content').update({ data: updatedList }).eq('key', 'announcements');
}

window.closeAnnouncement = function() {
    document.getElementById('announcement-window').style.display = 'none';
    sessionStorage.setItem('announcement-closed', 'true');
    if (announcementInterval) clearInterval(announcementInterval);
}

async function loadCustomPages() {
    const data = await loadYAML('/storage/data/custom.yaml');
    if (!data || !data.customPages) return;

    const container = document.getElementById('nav-tree-content');
    container.innerHTML = `
        <div class="nav-folder">Main/</div>
        <div class="nav-item">├─ <a href="#page=home" onclick="loadPage('home')">Home</a></div>
        <div class="nav-item">└─ <a href="#page=blogs" onclick="loadPage('blogs')">Blogs</a></div>
        <br>
        <div class="nav-folder">Content/</div>
        <div class="nav-item">├─ <a href="#page=projects" onclick="loadPage('projects')">Projects</a></div>
        <div class="nav-item">└─ <a href="#page=downloads" onclick="loadPage('downloads')">Downloads</a></div>
        <br>
    `;

    const expire = sessionStorage.getItem('sidebar_expire');
    const isRevealed = expire && Date.now() < parseInt(expire);

    Object.entries(data.customPages).forEach(([key, category]) => {
        if (!category.sub) return;
        const visibleSub = category.sub.filter(p => isRevealed || (!p.hidden && !p.locked));
        if (visibleSub.length === 0) return;

        const folder = document.createElement('div');
        folder.className = 'nav-folder';
        folder.textContent = (category.display || key) + '/';
        container.appendChild(folder);

        visibleSub.forEach((page, index) => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            const isLast = index === visibleSub.length - 1;
            const prefix = isLast ? '└─ ' : '├─ ';
            
            const link = document.createElement('a');
            link.href = `#page=${page.id}`;
            link.textContent = page.display || page.name;
            link.onclick = (e) => { e.preventDefault(); loadPage(page.id); };

            item.appendChild(document.createTextNode(prefix));
            item.appendChild(link);
            container.appendChild(item);
        });
        container.appendChild(document.createElement('br'));
    });

    container.innerHTML += `
        <div class="nav-folder">System/</div>
        <div class="nav-item">└─ <a href="#" onclick="openPreferences()">Settings</a></div>
    `;
}

function handleHashNavigation() {
    const hash = window.location.hash.substring(1);
    if (!hash || hash === '') { loadPage('home'); return; }
    const params = new URLSearchParams(hash);
    const page = params.get('page') || 'home';
    params.delete('page');
    loadPage(page, params.toString());
}

async function loadPage(pageName, args = '') {
    const pageBase = '/storage/internal/pages/main/';
    const customData = await loadYAML('/storage/data/custom.yaml');
    if (customData && customData.customPages) {
        let customPage = null;
        for (const key in customData.customPages) {
            const found = customData.customPages[key].sub.find(p => String(p.id) === String(pageName));
            if (found) { customPage = found; break; }
        }
        
        if (customPage) {
            if (customPage.locked && sessionStorage.getItem('unlocked_' + pageName) !== 'true') {
                pendingPage = { id: pageName, args: args };
                document.getElementById('lock-window').style.display = 'flex';
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

window.requestReveal = () => {
    sessionStorage.setItem('sidebar_expire', (Date.now() + 1800000).toString());
    loadCustomPages();
}

window.requestHide = () => {
    sessionStorage.removeItem('sidebar_expire');
    loadCustomPages();
}

window.checkLock = () => {
    const input = document.getElementById('lock-input').value;
    if (input === "Canned Pineapple") {
        if (pendingPage && pendingPage.id === 'reveal_sidebar') {
            sessionStorage.setItem('sidebar_expire', (Date.now() + 1800000).toString());
            loadCustomPages();
        } else {
            sessionStorage.setItem('unlocked_' + pendingPage.id, 'true');
            loadPage(pendingPage.id, pendingPage.args);
        }
        closeLockModal();
    } else alert("Incorrect.");
}

window.closeLockModal = () => { 
    document.getElementById('lock-window').style.display = 'none'; 
    document.getElementById('lock-input').value = ''; 
    pendingPage = null; 
}

window.openPreferences = () => document.getElementById('settings-window').style.display = 'flex';
window.closePreferences = () => document.getElementById('settings-window').style.display = 'none';