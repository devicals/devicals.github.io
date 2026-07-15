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
let currentEditCategory = null;
let currentEditIdx = null;
window.highestZ = 100;
const homeWindows = ['win-bio', 'win-skills', 'win-socials', 'win-blog'];

document.addEventListener('DOMContentLoaded', async () => {
    ['announcement-window', 'settings-window', 'lock-window', 'notif-pane'].forEach(id => {
        const win = document.getElementById(id);
        if (win) {
            win.addEventListener('mousedown', () => { win.style.zIndex = ++window.highestZ; }, true);
            win.addEventListener('touchstart', () => { win.style.zIndex = ++window.highestZ; }, {passive: true, capture: true});
            makeResizable(win);

            const savedPos = localStorage.getItem('win_pos_' + id);
            if (savedPos) {
                const pos = JSON.parse(savedPos);
                win.style.top = pos.top;
                win.style.left = pos.left;
                win.style.bottom = 'auto';
                win.style.right = 'auto';
            }
            const savedSize = localStorage.getItem('win_size_' + id);
            if (savedSize) {
                const size = JSON.parse(savedSize);
                win.style.width = size.width;
                win.style.height = size.height;
            }
        }
    });

    makeDraggable('announcement-window', 'ann-drag');
    makeDraggable('settings-window', 'set-drag');
    makeDraggable('lock-window', 'lock-drag');
    makeDraggable('notif-pane', 'notif-drag');
    
    await initializeApp();
    startTitleAnimation();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') {
        window.toggleNav();
    }
});

document.addEventListener('mousedown', (e) => {
    const nav = document.getElementById('nav-window');
    const startBtn = document.getElementById('start-button');
    if (nav && nav.classList.contains('nav-open')) {
        if (!nav.contains(e.target) && !startBtn.contains(e.target)) {
            window.toggleNav();
        }
    }
    
    const notifPane = document.getElementById('notif-pane');
    const notifBtn = document.getElementById('notif-btn');
    if (notifPane && notifPane.style.display === 'flex') {
        if (!notifPane.contains(e.target) && !notifBtn.contains(e.target)) {
            window.toggleNotifications();
        }
    }
});

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

window.addEventListener('message', e => {
    if (e.data.type === 'ctrl-pressed') {
        window.toggleNav();
    } else if (e.data.type === 'iframe-click') {
        const nav = document.getElementById('nav-window');
        if (nav && nav.classList.contains('nav-open')) window.toggleNav();
        const notifPane = document.getElementById('notif-pane');
        if (notifPane && notifPane.style.display === 'flex') window.toggleNotifications();
        
        const iframes = document.querySelectorAll('.page-iframe');
        iframes.forEach(ifr => {
            if (ifr.contentWindow === e.source) {
                const win = ifr.closest('.ascii-window');
                if (win) {
                    win.style.zIndex = ++window.highestZ;
                }
            }
        });
    } else if (e.data.type === 'minimize-iframe') {
        const iframes = document.querySelectorAll('.page-iframe');
        let senderId = null;
        iframes.forEach(ifr => {
            if (ifr.contentWindow === e.source) {
                senderId = ifr.parentElement.parentElement.id;
            }
        });
        if (senderId) {
            minimizeWindow(senderId, e.data.title || senderId.replace('win-', ''));
        }
    } else if (e.data.type === 'open-editor') {
        const editorId = 'win-editor-' + e.data.editorType;
        const title = e.data.title || 'Editor';
        
        let contentHTML = '';
        if (e.data.editorType === 'blog') {
            contentHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                    <input type="text" id="editor-blog-title" class="ascii-input" placeholder="Title" value="${e.data.data?.title || ''}">
                    <textarea id="editor-blog-content" class="ascii-input" style="flex: 1; min-height: 250px; resize: vertical;" placeholder="Content (Markdown supported)">${e.data.data?.content || ''}</textarea>
                    <button class="btn-primary" onclick="submitEditorBlog('${e.data.id || ''}')">Save Post</button>
                </div>
            `;
        } else if (e.data.editorType === 'project') {
            contentHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                    <input type="text" id="editor-proj-name" class="ascii-input" placeholder="Project Name" value="${e.data.data?.name || ''}">
                    <textarea id="editor-proj-desc" class="ascii-input" style="flex: 1; min-height: 150px; resize: vertical;" placeholder="Description">${e.data.data?.description || ''}</textarea>
                    <input type="text" id="editor-proj-link" class="ascii-input" placeholder="Project URL" value="${e.data.data?.link || ''}">
                    <button class="btn-primary" onclick="submitEditorProject('${e.data.tab || ''}', ${e.data.index !== undefined ? e.data.index : -1})">Save Project</button>
                </div>
            `;
        } else if (e.data.editorType === 'download') {
            contentHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                    <input type="text" id="editor-dl-name" class="ascii-input" placeholder="Title/Name" value="${e.data.data?.name || ''}">
                    <textarea id="editor-dl-desc" class="ascii-input" style="flex: 1; min-height: 150px; resize: vertical;" placeholder="Description">${e.data.data?.description || ''}</textarea>
                    <input type="text" id="editor-dl-url" class="ascii-input" placeholder="Download URL" value="${e.data.data?.url || ''}">
                    <button class="btn-primary" onclick="submitEditorDownload(${e.data.id !== undefined ? e.data.id : -1})">Save Download</button>
                </div>
            `;
        }
        
        const bounds = { left: '150px', top: '100px', width: '500px', height: '480px' };
        createWindow(editorId, title, '', contentHTML, bounds);
    }
});

window.submitEditorBlog = async function(id) {
    const title = document.getElementById('editor-blog-title').value.trim();
    const content = document.getElementById('editor-blog-content').value.trim();
    if (!title || !content) return;

    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
    let blogs = data ? data.data : [];

    if (id) {
        const blog = blogs.find(b => String(b.id) === String(id));
        if (blog) {
            blog.title = title;
            blog.content = content;
        }
    } else {
        const nextId = blogs.length > 0 ? Math.max(...blogs.map(b => b.id)) + 1 : 1;
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        blogs.unshift({ id: nextId, date: dateStr, title, content });
    }

    await supabaseClient.from('site_content').update({ data: blogs }).eq('key', 'blogs');
    closeWindow('win-editor-blog');
};

window.submitEditorProject = async function(tab, index) {
    const name = document.getElementById('editor-proj-name').value.trim();
    const description = document.getElementById('editor-proj-desc').value.trim();
    const link = document.getElementById('editor-proj-link').value.trim();
    if (!name || !link) return;

    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let projData = data ? data.data : { tabs: {} };

    if (index !== -1) {
        const proj = projData.tabs[tab].projects[index];
        if (proj) {
            proj.name = name;
            proj.description = description;
            proj.link = link;
        }
    } else {
        if (!projData.tabs[tab].projects) projData.tabs[tab].projects = [];
        projData.tabs[tab].projects.push({ name, description, link });
    }

    await supabaseClient.from('site_content').update({ data: projData }).eq('key', 'projects');
    closeWindow('win-editor-project');
};

window.submitEditorDownload = async function(id) {
    const name = document.getElementById('editor-dl-name').value.trim();
    const description = document.getElementById('editor-dl-desc').value.trim();
    const url = document.getElementById('editor-dl-url').value.trim();
    if (!name || !url) return;

    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'downloads').single();
    let downloads = data ? data.data : [];

    if (id !== -1) {
        const dl = downloads.find(d => d.id === id);
        if (dl) {
            dl.name = name;
            dl.description = description;
            dl.url = url;
        }
    } else {
        const nextId = downloads.length > 0 ? Math.max(...downloads.map(d => d.id)) + 1 : 1;
        downloads.push({ id: nextId, name, description, url });
    }

    await supabaseClient.from('site_content').update({ data: downloads }).eq('key', 'downloads');
    closeWindow('win-editor-download');
};

window.toggleNav = function() {
    const nav = document.getElementById('nav-window');
    const btn = document.getElementById('start-button');
    if (nav.classList.contains('nav-open')) {
        nav.classList.remove('nav-open');
        btn.classList.remove('start-active');
    } else {
        nav.classList.add('nav-open');
        btn.classList.add('start-active');
        nav.style.zIndex = Math.max(10001, ++window.highestZ);
    }
};

window.toggleNotifications = function() {
    const pane = document.getElementById('notif-pane');
    const btn = document.getElementById('notif-btn');
    if (pane.style.display === 'none' || !pane.style.display) {
        pane.style.display = 'flex';
        pane.style.zIndex = Math.max(10001, ++window.highestZ);
        btn.classList.add('notif-active');
    } else {
        pane.style.display = 'none';
        btn.classList.remove('notif-active');
    }
};

window.minimizeWindow = function(id, title) {
    const win = document.getElementById(id);
    if (win) {
        win.style.display = 'none';
        addTaskbarItem(id, title);
    }
};

window.toggleMaximizeWindow = function(id) {
    const win = document.getElementById(id);
    if (!win) return;
    const btn = win.querySelector('.ascii-maximize-btn');
    const PAD = 8; // 5-10px padding when maximized

    if (win.dataset.maximized === 'true') {
        // Restore to previous position/size
        const prev = JSON.parse(win.dataset.prevBounds || '{}');
        win.style.top = prev.top || '';
        win.style.left = prev.left || '';
        win.style.right = prev.right || '';
        win.style.bottom = prev.bottom || '';
        win.style.width = prev.width || '';
        win.style.height = prev.height || '';
        win.dataset.maximized = 'false';
        if (btn) btn.textContent = '□';
    } else {
        // Save current position/size, then fill the desktop with padding
        win.dataset.prevBounds = JSON.stringify({
            top: win.style.top, left: win.style.left,
            right: win.style.right, bottom: win.style.bottom,
            width: win.style.width, height: win.style.height
        });
        win.style.top = PAD + 'px';
        win.style.left = PAD + 'px';
        win.style.right = PAD + 'px';
        win.style.bottom = PAD + 'px';
        win.style.width = 'auto';
        win.style.height = 'auto';
        win.dataset.maximized = 'true';
        if (btn) btn.textContent = '❐';
    }
    win.style.zIndex = ++window.highestZ;
};

function addTaskbarItem(id, title) {
    const container = document.getElementById('taskbar-items');
    if (document.getElementById('tb-item-' + id)) return;
    const btn = document.createElement('button');
    btn.id = 'tb-item-' + id;
    btn.className = 'taskbar-item-btn';
    btn.textContent = title;
    btn.onclick = () => {
        const win = document.getElementById(id);
        if (win) {
            win.style.display = 'flex';
            win.style.zIndex = ++window.highestZ;
        }
        btn.remove();
    };
    container.appendChild(btn);
}

function makeResizable(win) {
    const handles = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
    handles.forEach(dir => {
        const h = document.createElement('div');
        h.className = `resize-handle resize-${dir}`;
        h.style.cssText = getResizeHandleStyle(dir);
        win.appendChild(h);
        setupResizeDrag(win, h, dir);
    });
}

function getResizeHandleStyle(dir) {
    const size = '8px';
    const offset = '-4px';
    let style = `position: absolute; z-index: 10000; background: transparent;`;
    if (dir === 'n') style += `top: ${offset}; left: 15px; right: 15px; height: ${size}; cursor: n-resize;`;
    if (dir === 's') style += `bottom: ${offset}; left: 4px; right: 4px; height: ${size}; cursor: s-resize;`;
    if (dir === 'e') style += `right: ${offset}; top: 4px; bottom: 4px; width: ${size}; cursor: e-resize;`;
    if (dir === 'w') style += `left: ${offset}; top: 4px; bottom: 4px; width: ${size}; cursor: w-resize;`;
    if (dir === 'nw') style += `top: ${offset}; left: ${offset}; width: ${size}; height: ${size}; cursor: nw-resize;`;
    if (dir === 'ne') style += `top: ${offset}; right: ${offset}; width: ${size}; height: ${size}; cursor: ne-resize;`;
    if (dir === 'sw') style += `bottom: ${offset}; left: ${offset}; width: ${size}; height: ${size}; cursor: sw-resize;`;
    if (dir === 'se') style += `bottom: ${offset}; right: ${offset}; width: ${size}; height: ${size}; cursor: se-resize;`;
    return style;
}

function setupResizeDrag(win, h, dir) {
    h.onmousedown = (e) => {
        if (win.dataset.maximized === 'true') return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = win.offsetWidth;
        const startHeight = win.offsetHeight;
        const startLeft = win.offsetLeft;
        const startTop = win.offsetTop;
        
        document.querySelectorAll('.page-iframe').forEach(ifr => ifr.style.pointerEvents = 'none');

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            if (dir.includes('e')) {
                const maxW = window.innerWidth - win.offsetLeft;
                win.style.width = clamp(startWidth + dx, 200, maxW) + 'px';
            }
            if (dir.includes('w')) {
                const maxW = startWidth + startLeft;
                const newW = clamp(startWidth - dx, 200, maxW);
                const actualDx = startWidth - newW;
                win.style.width = newW + 'px';
                win.style.left = (startLeft + actualDx) + 'px';
            }
            if (dir.includes('s')) {
                const maxH = window.innerHeight - win.offsetTop - 50;
                win.style.height = clamp(startHeight + dy, 100, maxH) + 'px';
            }
            if (dir.includes('n')) {
                const maxH = startHeight + startTop;
                const newH = clamp(startHeight - dy, 100, maxH);
                const actualDy = startHeight - newH;
                win.style.height = newH + 'px';
                win.style.top = (startTop + actualDy) + 'px';
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.querySelectorAll('.page-iframe').forEach(ifr => ifr.style.pointerEvents = 'auto');
            
            localStorage.setItem('win_pos_' + win.id, JSON.stringify({
                top: win.style.top,
                left: win.style.left
            }));
            localStorage.setItem('win_size_' + win.id, JSON.stringify({
                width: win.style.width,
                height: win.style.height
            }));
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
}

function makeDraggable(winId, handleId) {
    const win = document.getElementById(winId);
    const handle = document.getElementById(handleId);
    if (!win || !handle) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (win.dataset.maximized === 'true') return;
        e.preventDefault();
        win.style.zIndex = ++window.highestZ;
        if (e.type === 'touchstart') {
            pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY;
        } else {
            pos3 = e.clientX; pos4 = e.clientY;
        }
        document.querySelectorAll('.page-iframe').forEach(ifr => ifr.style.pointerEvents = 'none');
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
        
        let newTop = win.offsetTop - pos2;
        let newLeft = win.offsetLeft - pos1;
        
        const maxLeft = window.innerWidth - win.offsetWidth;
        const maxTop = window.innerHeight - win.offsetHeight - 50;
        
        win.style.top = clamp(newTop, 0, maxTop) + "px";
        win.style.left = clamp(newLeft, 0, maxLeft) + "px";
        win.style.bottom = 'auto';
        win.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
        document.ontouchend = null; document.ontouchmove = null;
        document.querySelectorAll('.page-iframe').forEach(ifr => ifr.style.pointerEvents = 'auto');
        localStorage.setItem('win_pos_' + winId, JSON.stringify({top: win.style.top, left: win.style.left}));
    }
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
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        handleUserSession(session);
        const iframes = document.querySelectorAll('.page-iframe');
        iframes.forEach(ifr => {
            if (ifr.contentWindow) {
                ifr.contentWindow.postMessage({ type: 'auth-sync', session }, '*');
            }
        });
    });
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
            <div style="display:flex; flex-direction: column; gap:6px;">
                <textarea id="new-ann-input" class="ascii-input" placeholder="New announcement..." style="resize:vertical; min-height:40px; width: 100%;"></textarea>
                <button class="ascii-btn" onclick="addNewAnnouncement()" style="color:hsl(var(--accent)); align-self: flex-end;">[+ Add]</button>
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
            <span style="white-space:pre-wrap; word-break:break-word; flex:1; margin-right:8px;">${ann}</span>
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
    
    const notifList = document.getElementById('notif-list');
    if (notifList) {
        notifList.innerHTML = '';
        const renderer = new marked.Renderer();
        data.forEach(ann => {
            const item = document.createElement('div');
            item.style.padding = '10px';
            item.style.borderBottom = '1px dashed hsl(var(--border))';
            item.style.fontSize = '12px';
            item.style.lineHeight = '1.5';
            item.innerHTML = marked.parse(ann, { renderer, breaks: true, gfm: true });
            notifList.appendChild(item);
        });
        if (data.length === 0) {
            notifList.innerHTML = '<div style="color:hsl(var(--muted-foreground)); font-size: 12px; padding: 10px;">No new announcements.</div>';
        }
    }
    
    const win = document.getElementById('announcement-window');
    const bar = document.getElementById('ann-progress-bar');
    
    if (currentAnnouncements.length === 0) {
        win.style.display = 'none';
        return;
    }
    
    if(sessionStorage.getItem('announcement-closed') !== 'true') {
        win.classList.remove('fade-out');
        win.classList.add('fade-in');
        win.style.display = 'flex';
        
        bar.style.transition = 'none';
        bar.style.width = '100%';
        void bar.offsetWidth; 
        
        bar.style.transition = 'width 10s linear';
        bar.style.width = '0%';
        
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
    content.innerHTML = marked.parse(announcements[index], { renderer, breaks: true, gfm: true });
}

async function saveAnnouncements(updatedList) {
    await supabaseClient.from('site_content').update({ data: updatedList }).eq('key', 'announcements');
}

window.closeAnnouncement = function() {
    const win = document.getElementById('announcement-window');
    win.classList.remove('fade-in');
    win.classList.add('fade-out');
    sessionStorage.setItem('announcement-closed', 'true');
    if (announcementInterval) clearInterval(announcementInterval);
    
    setTimeout(() => {
        win.style.display = 'none';
        win.classList.remove('fade-out');
    }, 300);
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
    else {
        const win = document.getElementById(id);
        if (win) {
            win.style.display = 'none';
            const tbItem = document.getElementById('tb-item-' + id);
            if (tbItem) tbItem.remove();
        }
    }
}

function createWindow(id, title, rightContent, contentHTML, bounds, adminControls = '') {
    let win = document.getElementById(id);
    const isNew = !win;
    if (isNew) {
        win = document.createElement('div');
        win.id = id;
        win.className = 'ascii-window';
        document.getElementById('desktop').appendChild(win);
        
        win.addEventListener('mousedown', () => { win.style.zIndex = ++window.highestZ; }, true);
        win.addEventListener('touchstart', () => { win.style.zIndex = ++window.highestZ; }, {passive: true, capture: true});
    }

    const savedPos = localStorage.getItem('win_pos_' + id);
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        win.style.top = pos.top;
        win.style.left = pos.left;
        win.style.bottom = 'auto';
        win.style.right = 'auto';
        if (bounds.width) win.style.width = bounds.width;
        if (bounds.height) win.style.height = bounds.height;
    } else {
        if (bounds.left !== undefined) { win.style.left = bounds.left; win.style.right = 'auto'; }
        if (bounds.right !== undefined) { win.style.right = bounds.right; win.style.left = 'auto'; }
        if (bounds.top !== undefined) { win.style.top = bounds.top; win.style.bottom = 'auto'; }
        if (bounds.bottom !== undefined) { win.style.bottom = bounds.bottom; win.style.top = 'auto'; }
        if (bounds.width) win.style.width = bounds.width;
        if (bounds.height) win.style.height = bounds.height;
    }

    const savedSize = localStorage.getItem('win_size_' + id);
    if (savedSize) {
        const size = JSON.parse(savedSize);
        win.style.width = size.width;
        win.style.height = size.height;
    }
    
    const isMainWin = id.startsWith('win-') && !homeWindows.includes(id) && !id.includes('editor');
    const contentPadding = isMainWin ? '0' : '15px';
    
    win.innerHTML = `
        <div class="ascii-header-row">
            <div class="ascii-header-line" style="width: 15px;"></div>
            <div id="${id}-drag" class="ascii-title">${title}</div>
            ${adminControls ? `<div class="ascii-admin-controls">${adminControls}</div>` : ''}
            <div class="ascii-header-line" style="flex: 1;"></div>
            ${rightContent ? `<div class="ascii-right-content">${rightContent}</div>` : ''}
            <div style="display: flex; align-items: center; gap: 8px; margin-left: 10px;">
                <div class="ascii-minimize-btn" onclick="minimizeWindow('${id}', '${title}')" style="cursor:pointer; color: hsl(var(--accent)); font-weight: bold; padding-bottom: 5px;">_</div>
                <div class="ascii-maximize-btn" onclick="toggleMaximizeWindow('${id}')" style="cursor:pointer; color: hsl(var(--accent)); font-weight: bold;">${win.dataset.maximized === 'true' ? '❐' : '□'}</div>
                ${homeWindows.includes(id) ? '' : `<div class="ascii-close-btn" onclick="closeWindow('${id}')" style="cursor:pointer; color: hsl(var(--destructive)); font-weight: bold;">x</div>`}
            </div>
            <div class="ascii-header-line" style="width: 10px;"></div>
        </div>
        <div class="ascii-content" style="padding: ${contentPadding}; flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
            ${contentHTML}
        </div>
    `;
    
    if (isNew && window.innerWidth > 768) makeDraggable(id, `${id}-drag`);
    win.style.display = 'flex';
    win.style.zIndex = ++window.highestZ;
    
    win.querySelectorAll('.resize-handle').forEach(h => h.remove());
    makeResizable(win);
    
    return win;
}

async function renderHomePage() {
    if (!homeData) return;

    let bioHTML = `<div style="line-height:1.8;">${marked.parse(homeData.bio || '', { breaks: true, gfm: true })}</div>`;
    createWindow('win-bio', 'about me', '', bioHTML, {left: '20px', top: '20px', width: '450px'}, 
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

window.editItem = (category, idx, e) => {
    e.stopPropagation(); e.preventDefault();
    currentEditCategory = category;
    currentEditIdx = idx;
    const item = homeData[category][idx];
    document.getElementById('edit-item-title').textContent = category === 'skills' ? 'Edit Skill' : 'Edit Social';
    document.getElementById('edit-item-name').value = category === 'skills' ? item.skill : item.name;
    document.getElementById('edit-item-link').value = item.link || '';
    document.getElementById('edit-item-modal').classList.add('active');
};

window.closeEditItemModal = () => document.getElementById('edit-item-modal').classList.remove('active');

window.saveEditItem = async () => {
    const name = document.getElementById('edit-item-name').value.trim();
    if (!name) return;
    const link = document.getElementById('edit-item-link').value.trim();
    const item = homeData[currentEditCategory][currentEditIdx];
    if (currentEditCategory === 'skills') item.skill = name; else item.name = name;
    item.link = link || null;
    closeEditItemModal();
    await syncHomeToSupabase();
    renderHomePage();
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
            const parsedHTML = await marked.parse(latest.content, { breaks: true, gfm: true });
            
            const dateDisplay = latest.date.replace(/\//g, '-');
            
            createWindow('win-blog', 'latest blog', dateDisplay, `
                <div style="cursor: pointer; line-height: 1.6; height: 100%; display: flex; flex-direction: column;" onclick="window.loadPage('blogs', 'id=${latest.id}')">
                    <div style="color:hsl(var(--accent)); font-weight:bold; margin-bottom:12px; font-size: 16px;">${latest.title}</div>
                    <div style="color:hsl(var(--foreground)); flex-grow: 1; overflow: hidden; position: relative;">
                        <div style="mask-image: linear-gradient(to bottom, black 50%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%); height: 100%; white-space: pre-wrap;">
                            ${parsedHTML}
                        </div>
                    </div>
                </div>
            `, {right: '20px', top: '20px', width: '500px', height: '280px'});
        }
    } catch (e) {}
}

async function loadCustomPages() {
    const data = await loadYAML('/storage/data/custom.yaml');
    if (!data || !data.customPages) return;

    const container = document.getElementById('nav-tree-content');
    container.innerHTML = `
        <div class="nav-folder">Main/</div>
        <div class="nav-item">├─ <span class="fake-link" onclick="window.loadPage('home')">Home</span></div>
        <div class="nav-item">└─ <span class="fake-link" onclick="window.loadPage('blogs')">Blogs</span></div>
        <br>
        <div class="nav-folder">Content/</div>
        <div class="nav-item">├─ <span class="fake-link" onclick="window.loadPage('projects')">Projects</span></div>
        <div class="nav-item">└─ <span class="fake-link" onclick="window.loadPage('downloads')">Downloads</span></div>
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
            
            const link = document.createElement('span');
            link.className = 'fake-link';
            link.onclick = () => window.loadPage(page.id);
            link.textContent = page.display || page.name;

            item.appendChild(document.createTextNode(prefix));
            item.appendChild(link);
            container.appendChild(item);
        });
        container.appendChild(document.createElement('br'));
    });

    container.insertAdjacentHTML('beforeend', `
        <div class="nav-folder">System/</div>
        <div class="nav-item">└─ <span class="fake-link" onclick="openPreferences()">Settings</span></div>
    `);
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

window.loadPage = async function(pageName, args = '') {
    const nav = document.getElementById('nav-window');
    if (nav && nav.classList.contains('nav-open')) window.toggleNav();
    
    if (pageName === 'home') {
        homeWindows.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'flex';
                el.style.zIndex = ++window.highestZ;
            }
            const tbItem = document.getElementById('tb-item-' + id);
            if (tbItem) tbItem.remove();
        });
        return;
    }

    const winId = 'win-' + pageName;
    let existingWin = document.getElementById(winId);
    
    if (existingWin) {
        existingWin.style.display = 'flex';
        existingWin.style.zIndex = ++window.highestZ;
        const tbItem = document.getElementById('tb-item-' + winId);
        if (tbItem) tbItem.remove();
        return;
    }

    const customData = await loadYAML('/storage/data/custom.yaml');
    let targetUrl = '';
    const pageBase = '/storage/internal/pages/main/';
    let title = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    if (customData && customData.customPages) {
        let customPage = null;
        for (const key in customData.customPages) {
            if (!customData.customPages[key].sub) continue;
            const found = customData.customPages[key].sub.find(p => String(p.id) === String(pageName));
            if (found) { customPage = found; break; }
        }
        
        if (customPage) {
            title = customPage.display || customPage.name || title;
            if (customPage.locked && sessionStorage.getItem('unlocked_' + pageName) !== 'true') {
                pendingPage = { id: pageName, args: args };
                document.getElementById('lock-window').style.display = 'flex';
                return;
            }

            const resolvedPath = resolvePath(customPage.path, '/storage/internal/pages/custom/');
            const typeInfo = typeof customPage.type === 'object' ? customPage.type : { type: customPage.type };
            let pageType = typeInfo.type || 'raw';
            if (pageType === 'refsection') pageType = 'section'; 

            if (pageType === 'section' || pageType === 'interests') {
                targetUrl = `${pageBase}custom.html?file=${encodeURIComponent(resolvedPath)}&rootId=${pageName}`;
            } else if (pageType === 'raw') {
                targetUrl = `${pageBase}raw.html?file=${encodeURIComponent(resolvedPath)}&rootId=${pageName}`;
            } else if (pageType.startsWith('gallery')) {
                targetUrl = `${pageBase}gallery.html?file=${encodeURIComponent(resolvedPath)}&type=${pageType}&rootId=${pageName}`;
            } else if (pageType === 'md') {
                targetUrl = `${pageBase}md-viewer.html?file=${encodeURIComponent(resolvedPath)}&rootId=${pageName}`;
            } else if (pageType === 'html') {
                targetUrl = resolvedPath + (resolvedPath.includes('?') ? '&' : '?') + `rootId=${pageName}`;
            }
        }
    }
    
    if (!targetUrl) {
        targetUrl = args ? `${pageBase}${pageName}.html#${args}` : `${pageBase}${pageName}.html`;
    }
    
    const contentHTML = `<iframe class="page-iframe" src="${targetUrl}" style="width: 100%; height: 100%; border: none; background: transparent; display: block;"></iframe>`;
    const bounds = { left: '50px', top: '50px', width: '800px', height: '600px' };
    createWindow(winId, title, '', contentHTML, bounds);
};

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
            window.loadPage(pendingPage.id, pendingPage.args);
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
        if (key.startsWith('win_pos_') || key.startsWith('win_size_') || key.startsWith('proj_pos_') || key.startsWith('blog_pos_') || key.startsWith('dl_pos_')) {
            localStorage.removeItem(key);
        }
    });
    location.reload();
};