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
let homeData = null;
window.highestZ = 100;
const homeWindows = ['win-bio', 'win-skills', 'win-socials', 'win-blog'];

document.addEventListener('DOMContentLoaded', async () => {
    ['nav-window', 'announcement-window', 'settings-window', 'lock-window'].forEach(id => {
        const savedPos = localStorage.getItem('win_pos_' + id);
        if (savedPos) {
            const win = document.getElementById(id);
            if (win) {
                const pos = JSON.parse(savedPos);
                win.style.top = pos.top;
                win.style.left = pos.left;
                win.style.bottom = 'auto';
                win.style.right = 'auto';
            }
        }
    });

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
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
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
        win.style.bottom = 'auto';
        win.style.right = 'auto';
        localStorage.setItem('win_pos_' + winId, JSON.stringify({top: win.style.top, left: win.style.left}));
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
    await initAuth();
    await loadAnnouncements();
    await loadCustomPages();
    await initHomeDatabase();
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    
    const savedTheme = localStorage.getItem('selected-theme') || 'default';
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
    if (homeData) renderHomePage();

    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'auth-sync', session }, '*');
    }
}

function renderLoginPortal() {
    const portal = document.getElementById('settings-admin-portal');
    portal.innerHTML = `
        <input type="text" id="admin-email-field" class="ascii-input" style="margin:4px 0;" value="3rr0r.d3v@gmail.com" readonly>
        <input type="password" id="admin-password-field" class="ascii-input" style="margin-bottom:8px;" placeholder="Password">
        <button class="btn-primary" style="width:100%;" onclick="submitAdminLogin()">Login</button>
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
        
        <div style="border-top:1px dashed hsl(var(--foreground)/0.3); padding-top:15px; margin-bottom:15px;">
            <label style="color:hsl(var(--muted-foreground)); font-size:10px;">DEV OPTIONS</label>
            <div style="display: flex; gap: 10px; margin-top: 8px;">
                <button id="show-hidden-btn" class="ascii-btn" onclick="requestReveal()">[ Show Hidden ]</button>
                <button id="hide-hidden-btn" class="ascii-btn" onclick="requestHide()">[ Hide Hidden ]</button>
            </div>
        </div>

        <div style="border-top:1px dashed hsl(var(--foreground)/0.3); padding-top:15px;">
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
    if(sessionStorage.getItem('announcement-closed') !== 'true') {
        win.style.display = 'flex';
        setTimeout(() => {
            if (win.style.display !== 'none') {
                closeAnnouncement();
            }
        }, 10000);
    }
    
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

async function initHomeDatabase() {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'home').single();
    if (data && data.data) {
        homeData = data.data;
        renderHomePage();
    }
    supabaseClient.channel('home-realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_content', filter: 'key=eq.home' }, (payload) => {
            if (payload.new && payload.new.data) { homeData = payload.new.data; renderHomePage(); }
        }).subscribe();
}

async function syncHomeToSupabase() {
    if (!isAdmin) return;
    const { error } = await supabaseClient.from('site_content').update({ data: homeData }).eq('key', 'home');
    if (error) alert("Error saving: " + error.message);
}

window.closeWindow = function(id) {
    if (id === 'announcement-window') closeAnnouncement();
    else if (id === 'settings-window') closePreferences();
    else if (id === 'lock-window') closeLockModal();
    else document.getElementById(id).style.display = 'none';
}

function createWindow(id, title, rightContent, contentHTML, bounds, adminControls = '') {
    let win = document.getElementById(id);
    const isNew = !win;
    if (isNew) {
        win = document.createElement('div');
        win.id = id;
        win.className = 'ascii-window';
        
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const page = params.get('page') || 'home';
        if (page !== 'home') win.style.display = 'none';
        
        document.getElementById('desktop').appendChild(win);
    }

    const savedPos = localStorage.getItem('win_pos_' + id);
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        win.style.top = pos.top;
        win.style.left = pos.left;
        win.style.bottom = 'auto';
        win.style.right = 'auto';
        if (bounds.width) win.style.width = bounds.width;
    } else {
        if (bounds.left !== undefined) { win.style.left = bounds.left; win.style.right = 'auto'; }
        if (bounds.right !== undefined) { win.style.right = bounds.right; win.style.left = 'auto'; }
        if (bounds.top !== undefined) { win.style.top = bounds.top; win.style.bottom = 'auto'; }
        if (bounds.bottom !== undefined) { win.style.bottom = bounds.bottom; win.style.top = 'auto'; }
        if (bounds.width) win.style.width = bounds.width;
    }
    
    win.innerHTML = `
        <div class="ascii-header-row">
            <div class="ascii-header-line" style="width: 15px;"></div>
            <div id="${id}-drag" class="ascii-title">${title}</div>
            ${adminControls ? `<div class="ascii-admin-controls">${adminControls}</div>` : ''}
            <div class="ascii-header-line" style="flex: 1;"></div>
            ${rightContent ? `<div class="ascii-right-content">${rightContent}</div>` : ''}
            <div class="ascii-header-line" style="width: 10px;"></div>
        </div>
        <div class="ascii-content" style="padding: 15px; flex: 1; overflow-y: auto;">
            ${contentHTML}
        </div>
    `;
    
    if (isNew && window.innerWidth > 768) makeDraggable(id, `${id}-drag`);
    return win;
}

async function renderHomePage() {
    if (!homeData) return;

    let bioHTML = `<div style="line-height:1.8;">${marked.parse(homeData.bio || '')}</div>`;
    createWindow('win-bio', 'about me', '', bioHTML, {left: '320px', top: '20px', width: '450px'}, 
        `<span class="admin-edit-only" onclick="openBioModal()">[✎]</span>`);

    let skillsHTML = `<div class="add-row">
        <input type="text" id="skill-n" class="ascii-input" placeholder="Skill Name" style="flex:1;">
        <input type="text" id="skill-l" class="ascii-input" placeholder="URL (opt)" style="flex:1;">
        <button class="ascii-btn" onclick="addSkill()" style="color:hsl(var(--accent));">[+]</button>
    </div><div id="skills-list"></div>`;
    createWindow('win-skills', 'skills', '', skillsHTML, {right: '20px', bottom: '20px', width: '380px'});
    renderGridItems(homeData.skills, 'skills-list', 'skills', (item) => item.skill, (item) => item.link);

    let socialsHTML = `<div class="add-row">
        <input type="text" id="social-n" class="ascii-input" placeholder="Social Name" style="flex:1;">
        <input type="text" id="social-l" class="ascii-input" placeholder="Profile URL" style="flex:1;">
        <button class="ascii-btn" onclick="addSocial()" style="color:hsl(var(--accent));">[+]</button>
    </div>
    <div id="discord-live" class="text-line" style="color:hsl(var(--foreground)); font-weight:bold;">Loading Discord...</div>
    <div id="socials-list" style="margin-top:10px;"></div>`;
    createWindow('win-socials', 'socials', '', socialsHTML, {right: '420px', bottom: '20px', width: '300px'});
    renderGridItems(homeData.socials, 'socials-list', 'socials', (item) => item.name, (item) => item.link);
    refreshDiscordUI();

    loadLatestBlogPreview();
}

function renderGridItems(arr, containerId, category, textMapper, linkMapper) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    arr.forEach((item, idx) => {
        const link = linkMapper(item);
        const row = document.createElement('div');
        row.className = 'text-line';
        row.innerHTML = `
            <span style="flex:1; cursor:${isAdmin ? 'grab' : 'auto'};">${link ? `<a href="${link}" target="_blank">${textMapper(item)}</a>` : textMapper(item)}</span>
            <div class="admin-actions">
                <button class="ascii-btn" onclick="editItem('${category}', ${idx}, event)">[✎]</button>
                <button class="ascii-btn del" onclick="deleteItem('${category}', ${idx}, event)">[x]</button>
            </div>
        `;
        
        if (isAdmin) {
            row.draggable = true;
            row.addEventListener('dragstart', (e) => { dragItemIdx = idx; dragCategory = category; e.dataTransfer.effectAllowed = 'move'; });
            row.addEventListener('dragover', (e) => e.preventDefault());
            row.addEventListener('drop', async (e) => {
                e.preventDefault(); if (dragCategory !== category) return;
                if (dragItemIdx === idx) return;
                const targetArr = homeData[category];
                const [reordered] = targetArr.splice(dragItemIdx, 1);
                targetArr.splice(idx, 0, reordered);
                await syncHomeToSupabase();
            });
        }
        grid.appendChild(row);
    });
}

window.openBioModal = () => { document.getElementById('bio-textarea-input').value = homeData.bio || ''; document.getElementById('bio-modal').classList.add('active'); };
window.closeBioModal = () => document.getElementById('bio-modal').classList.remove('active');
window.saveBio = async () => {
    const bioText = document.getElementById('bio-textarea-input').value.trim();
    if (!bioText) return;
    homeData.bio = bioText;
    closeBioModal();
    await syncHomeToSupabase();
};

window.addSkill = async () => {
    const n = document.getElementById('skill-n').value.trim();
    const l = document.getElementById('skill-l').value.trim() || null;
    if (!n) return; homeData.skills.push({ skill: n, link: l }); await syncHomeToSupabase();
};
window.addSocial = async () => {
    const n = document.getElementById('social-n').value.trim();
    const l = document.getElementById('social-l').value.trim();
    if (!n || !l) return; homeData.socials.push({ name: n, link: l }); await syncHomeToSupabase();
};

window.deleteItem = async (category, idx, e) => {
    e.stopPropagation(); e.preventDefault();
    if (!confirm(`Delete item?`)) return;
    homeData[category].splice(idx, 1);
    await syncHomeToSupabase();
};

window.editItem = async (category, idx, e) => {
    e.stopPropagation(); e.preventDefault();
    const item = homeData[category][idx];
    const currentName = category === 'skills' ? item.skill : item.name;
    const name = prompt("Edit Name:", currentName);
    if (name && name.trim() !== '') {
        const link = prompt("Edit Link:", item.link || '');
        if (category === 'skills') item.skill = name.trim(); else item.name = name.trim();
        item.link = link ? link.trim() : null;
        await syncHomeToSupabase();
    }
};

async function refreshDiscordUI() {
    try {
        const res = await fetch('https://api.lanyard.rest/v1/users/989414384679927838');
        const data = await res.json();
        const statusMap = { 'online': 'Online', 'dnd': 'DND', 'idle': 'Idle', 'offline': 'Offline' };
        const text = statusMap[data.data?.discord_status || 'offline'] || 'Offline';
        const el = document.getElementById('discord-live');
        if(el) el.innerHTML = `<a href="https://discord.com/users/989414384679927838" target="_blank">${text} on Discord</a>`;
    } catch(e) {}
}

async function loadLatestBlogPreview() {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
        if (data && data.data && data.data.length > 0) {
            const sortedBlogs = data.data.sort((a,b) => {
                const pa = a.date.split('/'); const pb = b.date.split('/');
                return new Date(pb[2],pb[1]-1,pb[0]) - new Date(pa[2],pa[1]-1,pa[0]);
            });
            const latest = sortedBlogs[0];
            const temp = document.createElement('div'); temp.innerHTML = marked.parse(latest.content);
            const ext = temp.innerHTML;
            
            const dateDisplay = latest.date.replace(/\//g, '-');
            
            createWindow('win-blog', 'latest blog', dateDisplay, `
                <div style="cursor: pointer; line-height: 1.6;" onclick="window.location.hash = 'page=blogs&id=${latest.id}'">
                    <div style="color:hsl(var(--accent)); font-weight:bold; margin-bottom:12px; font-size: 16px;">${latest.title}</div>
                    <div style="color:hsl(var(--foreground));">${ext}</div>
                </div>
            `, {right: '20px', top: '20px', width: '500px'});
        }
    } catch (e) {}
}

async function loadCustomPages() {
    const data = await loadYAML('/storage/data/custom.yaml');
    if (!data || !data.customPages) return;

    const container = document.getElementById('nav-tree-content');
    container.innerHTML = `
        <div class="nav-folder">Main/</div>
        <div class="nav-item">├─ <a href="#page=home">Home</a></div>
        <div class="nav-item">└─ <a href="#page=blogs">Blogs</a></div>
        <br>
        <div class="nav-folder">Content/</div>
        <div class="nav-item">├─ <a href="#page=projects">Projects</a></div>
        <div class="nav-item">└─ <a href="#page=downloads">Downloads</a></div>
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

            item.appendChild(document.createTextNode(prefix));
            item.appendChild(link);
            container.appendChild(item);
        });
        container.appendChild(document.createElement('br'));
    });

    container.innerHTML += `
        <div class="nav-folder">System/</div>
        <div class="nav-item">└─ <span class="fake-link" onclick="openPreferences()">Settings</span></div>
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

function resolvePath(relativePath, baseDir) {
    if (!relativePath) return '';
    let path = relativePath.startsWith('~/') ? '/storage/internal/pages/custom/' + relativePath.substring(2) : relativePath;
    if (!path.startsWith('/')) path = baseDir + path;
    
    const parts = path.split('/');
    const stack = [];
    for (const part of parts) {
        if (part === '..') { if (stack.length > 0) stack.pop(); }
        else if (part !== '.' && part !== '') { stack.push(part); }
    }
    return (path.startsWith('/') ? '/' : '') + stack.join('/');
}

async function loadPage(pageName, args = '') {
    const pageBase = '/storage/internal/pages/main/';
    const iframe = document.getElementById('content-frame');
    
    if (pageName === 'home') {
        iframe.style.display = 'none';
        homeWindows.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'flex';
        });
        history.replaceState(null, null, args ? `#page=${pageName}&${args}` : `#page=${pageName}`);
        return;
    } else {
        iframe.style.display = 'block';
        homeWindows.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }

    const customData = await loadYAML('/storage/data/custom.yaml');
    let targetUrl = '';

    if (customData && customData.customPages) {
        let customPage = null;
        for (const key in customData.customPages) {
            if (!customData.customPages[key].sub) continue;
            const found = customData.customPages[key].sub.find(p => String(p.id) === String(pageName));
            if (found) { customPage = found; break; }
        }
        
        if (customPage) {
            if (customPage.locked && sessionStorage.getItem('unlocked_' + pageName) !== 'true') {
                pendingPage = { id: pageName, args: args };
                document.getElementById('lock-window').style.display = 'flex';
                return;
            }

            const resolvedPath = resolvePath(customPage.path, '/storage/internal/pages/custom/');
            const typeInfo = typeof customPage.type === 'object' ? customPage.type : { type: customPage.type };
            let pageType = typeInfo.type || 'raw';
            if (pageType === 'refsection') pageType = 'section'; 

            if (pageType === 'section' || pageType === 'interests') targetUrl = `${pageBase}custom.html${args ? '#' + args : ''}`;
            else if (pageType === 'raw') targetUrl = `${pageBase}raw.html?file=${encodeURIComponent(resolvedPath)}`;
            else if (pageType.startsWith('gallery')) targetUrl = `${pageBase}gallery.html?file=${encodeURIComponent(resolvedPath)}&type=${pageType}${args ? '&' + args : ''}`;
            else if (pageType === 'md') targetUrl = `${pageBase}md-viewer.html?file=${encodeURIComponent(resolvedPath)}`;
            else if (pageType === 'html') targetUrl = resolvedPath;
        }
    }
    
    if (!targetUrl) {
        targetUrl = args ? `${pageBase}${pageName}.html#${args}` : `${pageBase}${pageName}.html`;
    }
    
    iframe.src = targetUrl;
    history.replaceState(null, null, args ? `#page=${pageName}&${args}` : `#page=${pageName}`);
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

window.openPreferences = () => {
    const win = document.getElementById('settings-window');
    win.style.display = 'flex';
    win.style.zIndex = ++window.highestZ;
};

window.closePreferences = () => {
    document.getElementById('settings-window').style.display = 'none';
};

window.resetWindowPositions = function() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('win_pos_')) {
            localStorage.removeItem(key);
        }
    });
    location.reload();
};