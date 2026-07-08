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
let flatPagesMap = {};
window.highestZ = 100;

document.addEventListener('DOMContentLoaded', async () => {
    makeDraggable('nav-window', 'nav-drag');
    makeDraggable('announcement-window', 'ann-drag');
    makeDraggable('settings-window', 'set-drag');
    makeDraggable('lock-window', 'lock-drag');
    
    await initializeApp();
    startTitleAnimation();
    setupTerminal();
});

function makeDraggable(winId, handleId) {
    const win = document.getElementById(winId);
    const handle = document.getElementById(handleId);
    if (!win || !handle) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;
    handle.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.classList.contains('ascii-close')) return;
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
    
    win.addEventListener('mousedown', () => { win.style.zIndex = ++window.highestZ; });
    win.addEventListener('touchstart', () => { win.style.zIndex = ++window.highestZ; }, {passive: true});
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
    
    const savedTheme = localStorage.getItem('selected-theme') || 'original';
    window.changeTheme(savedTheme);
    
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
    if (session && session.user && session.user.email.toLowerCase() === '3rr0r.d3v@gmail.com') {
        isAdmin = true;
        document.body.classList.add('is-admin');
    } else {
        isAdmin = false;
        document.body.classList.remove('is-admin');
    }
    loadCustomPages();
    updateTerminalPrefix();

    const iframe = document.getElementById('content-frame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'auth-sync', session }, '*');
    }
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
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data) applyAnnouncements(data.data);
        supabaseClient.channel('ann-realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_content', filter: 'key=eq.announcements' },
            (payload) => { if (payload.new && payload.new.data) applyAnnouncements(payload.new.data); }
        ).subscribe();
    } catch (e) {}
}

function applyAnnouncements(data) {
    currentAnnouncements = data || [];
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
        <div class="nav-item">├─ <span onclick="loadPage('home')">Home</span></div>
        <div class="nav-item">└─ <span onclick="loadPage('blogs')">Blogs</span></div>
        <br>
        <div class="nav-folder">Content/</div>
        <div class="nav-item">├─ <span onclick="loadPage('projects')">Projects</span></div>
        <div class="nav-item">└─ <span onclick="loadPage('downloads')">Downloads</span></div>
        <br>
    `;

    const expire = sessionStorage.getItem('sidebar_expire');
    const isRevealed = expire && Date.now() < parseInt(expire);

    flatPagesMap = {
        'home': { id: 'home', path: '/storage/internal/pages/main/home.html', type: 'html' },
        'blogs': { id: 'blogs', path: '/storage/internal/pages/main/blogs.html', type: 'html' },
        'projects': { id: 'projects', path: '/storage/internal/pages/main/projects.html', type: 'html' },
        'downloads': { id: 'downloads', path: '/storage/internal/pages/main/downloads.html', type: 'html' }
    };

    let localNodes = [];
    Object.entries(data.customPages).forEach(([key, category]) => {
        if (!category.sub) return;
        category.sub.forEach(page => {
            flatPagesMap[page.id] = page;
            page.children = [];
            page.categoryId = key;
            page.categoryDisplay = category.display || key;
            localNodes.push(page);
        });
    });

    let topLevelNodes = [];
    localNodes.forEach(child => {
        if (child.type && child.type.type === 'refsection' && child.type.refid) {
            const parent = localNodes.find(p => p.id === child.type.refid);
            if (parent) parent.children.push(child);
            else topLevelNodes.push(child);
        } else {
            topLevelNodes.push(child);
        }
    });

    let groupedSections = {};
    topLevelNodes.forEach(node => {
        if (!groupedSections[node.categoryId]) groupedSections[node.categoryId] = { display: node.categoryDisplay, items: [] };
        groupedSections[node.categoryId].items.push(node);
    });

    Object.values(groupedSections).forEach(section => {
        const visibleItems = section.items.filter(p => isRevealed || (!p.hidden && !p.locked));
        if (visibleItems.length === 0) return;

        const folder = document.createElement('div');
        folder.className = 'nav-folder';
        folder.textContent = section.display + '/';
        container.appendChild(folder);

        visibleItems.forEach((page, index) => {
            const isLast = index === visibleItems.length - 1;
            renderNavItem(page, isLast, container, isRevealed, false);
        });
        container.appendChild(document.createElement('br'));
    });

    container.innerHTML += `
        <div class="nav-folder">System/</div>
        <div class="nav-item">└─ <span onclick="openPreferences()">Settings</span></div>
    `;
}

function renderNavItem(node, isLast, parentContainer, isRevealed, isSub = false) {
    const item = document.createElement('div');
    item.className = 'nav-item';
    
    const prefix = isLast ? '└─ ' : '├─ ';
    
    const link = document.createElement('span');
    link.textContent = node.display || node.name;
    link.onclick = () => loadPage(node.id);

    item.appendChild(document.createTextNode(prefix));
    item.appendChild(link);
    parentContainer.appendChild(item);

    if (node.children && node.children.length > 0) {
        const visibleChildren = node.children.filter(c => isRevealed || (!c.hidden && !c.locked));
        if (visibleChildren.length > 0) {
            const subContainer = document.createElement('div');
            subContainer.className = 'nav-sub';
            if (!isLast && !isSub) {
                subContainer.style.borderLeft = '1px solid hsl(var(--border))';
            } else {
                subContainer.style.borderLeft = '1px solid transparent';
            }
            
            visibleChildren.forEach((child, cIdx) => {
                const cIsLast = cIdx === visibleChildren.length - 1;
                renderNavItem(child, cIsLast, subContainer, isRevealed, true);
            });
            parentContainer.appendChild(subContainer);
        }
    }
}

function handleHashNavigation() {
    const hash = window.location.hash.substring(1);
    if (!hash || hash === '') { loadPage('home'); return; }
    const params = new URLSearchParams(hash);
    const page = params.get('page') || 'home';
    params.delete('page');
    loadPage(page, params.toString());
}

window.loadPage = async function(pageName, args = '') {
    const pageBase = '/storage/internal/pages/main/';
    
    if (Object.keys(flatPagesMap).length === 0) {
        await loadCustomPages();
    }
    
    const customPage = flatPagesMap[pageName];
    
    if (customPage && !['home', 'blogs', 'projects', 'downloads'].includes(customPage.id)) {
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
        if (pageType === 'section') targetUrl = `${pageBase}custom.html?file=${encodeURIComponent(pagePath)}${args ? '#' + args : ''}`;
        else if (pageType === 'interests') targetUrl = `${pageBase}interests.html?file=${encodeURIComponent(pagePath)}${args ? '#' + args : ''}`;
        else if (pageType === 'raw') targetUrl = `${pageBase}raw.html?file=${encodeURIComponent(pagePath)}`;
        else if (pageType === 'gallery') targetUrl = `${pageBase}gallery.html?file=${encodeURIComponent(pagePath)}&type=${pageType}${args ? '&' + args : ''}`;
        else if (pageType === 'md') targetUrl = `${pageBase}md-viewer.html?file=${encodeURIComponent(pagePath)}`;
        else if (pageType === 'html') targetUrl = pagePath;

        iframe.src = targetUrl;
        window.location.hash = `#page=${pageName}${args ? '&' + args : ''}`;
        return;
    }
    
    const iframe = document.getElementById('content-frame');
    iframe.src = args ? `${pageBase}${pageName}.html#${args}` : `${pageBase}${pageName}.html`;
    window.location.hash = `#page=${pageName}${args ? '&' + args : ''}`;
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
    if (win.style.display === 'none' || !win.style.display) {
        win.style.display = 'flex';
        win.style.zIndex = ++window.highestZ;
        setTimeout(() => document.getElementById('term-in').focus(), 50);
    } else {
        win.style.display = 'none';
    }
};

window.closePreferences = () => {
    document.getElementById('settings-window').style.display = 'none';
};

/* --- TERMINAL ENGINE --- */
const termOut = document.getElementById('term-out');
const termIn = document.getElementById('term-in');
const termPrefix = document.getElementById('term-prefix');

function updateTerminalPrefix() {
    if (termPrefix) termPrefix.textContent = (isAdmin ? 'A' : 'U') + ' > github\\pages\\devicals >';
}

function printToTerminal(text) {
    termOut.textContent += `\n${text}`;
    termOut.scrollTop = termOut.scrollHeight;
}

function setupTerminal() {
    if (!termIn) return;
    termIn.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const raw = termIn.value.trim();
            termIn.value = '';
            
            let displayCmd = raw;
            if (raw.startsWith('user login ')) {
                displayCmd = 'user login **********';
            }
            
            printToTerminal(`\n${termPrefix.textContent} ${displayCmd}`);
            if (raw) await executeTerminalCommand(raw);
        }
    });
}

async function executeTerminalCommand(cmdStr) {
    const args = cmdStr.split(' ');
    const cmd = args[0].toLowerCase();
    
    switch (cmd) {
        case 'help':
            printToTerminal(`
┌ HELP
├ lists all commands,
└ displays this message

┌ USER
├ displays current user information and/or
│ perform admin login or logout actions
│ usage: user [login <password> | logout]
└ note: login password will be redacted as * in input

┌ SOURCE
└ origin > website source code

┌ NAVIGATE
├ navigate to a different page
│ usage: navigate [path]
│ example: navigate community/chitchat
│          moves to 'Chits & Chats' page
│ example: navigate extra/writing/books
│          moves to 'Books' page
└ aliases: nav

┌ MESSAGE
├ send a message in 'Chits & Chats'
│ usage: message [user:<name>; msg:<message> | message:<message> badge*:<true|false>]
│        username is optional | badge* is [A] admin only
│ aliases: msg
└ notes: drawings cannot be added via terminal

┌ THEME
├ manages current theme
│ usage: theme [apply <theme> | index]
└ aliases: c, color

┌ PAGE
├ show or hide @hidden pages
│ [A] admin only
└ usage: page [show | hide]

┌ BROADCAST
├ manages announcements
│ [A] admin only
│ usage: broadcast [create <message> | index | delete <indexID>]
│        no arguments will default to 'index' argument
└ aliases: bc`);
            break;
            
        case 'user':
            if (args[1] === 'login') {
                const password = args.slice(2).join(' ');
                if (!password) { printToTerminal("Error: missing password"); break; }
                const { error } = await supabaseClient.auth.signInWithPassword({ email: '3rr0r.d3v@gmail.com', password });
                if (error) printToTerminal("Login Failed: " + error.message);
                else printToTerminal("Successfully logged in as Administrator status");
            } else if (args[1] === 'logout') {
                await supabaseClient.auth.signOut();
                printToTerminal("Logged out.");
            } else {
                printToTerminal(isAdmin ? "Current User: Administrator" : "Current User: Guest");
            }
            break;
            
        case 'source':
            window.open('https://github.com/devicals/devicals.github.io');
            printToTerminal("Opened source repository.");
            break;
            
        case 'nav':
        case 'navigate':
            let target = args[1];
            if (!target) { printToTerminal("Usage: navigate <pageID/path>"); break; }
            const pageId = target.split('/').pop();
            if (flatPagesMap[pageId] || pageId === 'home' || pageId === 'blogs' || pageId === 'projects' || pageId === 'downloads') {
                loadPage(pageId);
                printToTerminal(`Navigating to ${pageId}...`);
            } else {
                printToTerminal(`Error: Page '${pageId}' not found.`);
            }
            break;
            
        case 'c':
        case 'color':
        case 'theme':
            if (args[1] === 'index') {
                printToTerminal(`Available themes:\n- vitesse-dark\n- original\n- evergreens\n- gruvbox\n- ice-world\n- purple-orange\n- orange-purple\n- pink-dream\n- cyberpunk\n- desert\n- custom`);
            } else if (args[1] === 'apply' || args[1]) {
                const t = args[1] === 'apply' ? args[2] : args[1];
                if (!t) { printToTerminal("Usage: theme <name>"); break; }
                window.changeTheme(t);
                printToTerminal(`Theme applied: ${t}`);
            } else {
                printToTerminal("Usage: theme <theme_name>");
            }
            break;
            
        case 'page':
            if (!isAdmin) { printToTerminal("Error: Insufficient privileges"); break; }
            if (args[1] === 'show') {
                sessionStorage.setItem('sidebar_expire', (Date.now() + 1800000).toString());
                loadCustomPages();
                printToTerminal("Hidden pages are now visible.");
            } else if (args[1] === 'hide') {
                sessionStorage.removeItem('sidebar_expire');
                loadCustomPages();
                printToTerminal("Hidden pages are now hidden.");
            } else {
                printToTerminal("Usage: page [show | hide]");
            }
            break;
            
        case 'bc':
        case 'broadcast':
            if (!isAdmin) { printToTerminal("Error: Insufficient privileges"); break; }
            const subCmd = args[1] || 'index';
            
            if (subCmd === 'index') {
                let out = "\nIndex of current announcements:\n";
                if (currentAnnouncements.length === 0) out += "No announcements found.\n";
                else currentAnnouncements.forEach((a, i) => out += `${i + 1}. '${a}'\n`);
                out += "\nEnd";
                printToTerminal(out);
            } else if (subCmd === 'create') {
                const msg = args.slice(2).join(' ');
                if (!msg) { printToTerminal("Error: empty message"); break; }
                const newList = [...currentAnnouncements, msg];
                await supabaseClient.from('site_content').update({ data: newList }).eq('key', 'announcements');
                let out = `\nCreated announcement '${msg}' at index ${newList.length}\n\nUpdated index of current announcements:\n`;
                newList.forEach((a, i) => out += `${i + 1}. '${a}'\n`);
                out += "\nEnd";
                printToTerminal(out);
            } else if (subCmd === 'delete') {
                const delIdx = parseInt(args[2]) - 1;
                if (isNaN(delIdx) || delIdx < 0 || delIdx >= currentAnnouncements.length) { printToTerminal("Error: invalid index"); break; }
                const newList = currentAnnouncements.filter((_, i) => i !== delIdx);
                await supabaseClient.from('site_content').update({ data: newList }).eq('key', 'announcements');
                printToTerminal(`Deleted announcement at index ${delIdx + 1}`);
            } else {
                printToTerminal("Usage: broadcast [create <message> | index | delete <indexID>]");
            }
            break;
            
        case 'msg':
        case 'message':
            let fullStr = args.slice(1).join(' ');
            if (!fullStr) { printToTerminal("Usage: message [user:<name>; msg:<message> | message:<message> badge*:<true|false>]"); break; }
            
            let uName = "Anonymous";
            let msgText = fullStr;
            let useBadge = false;

            if (fullStr.includes('user:') && fullStr.includes('msg:')) {
                const parts = fullStr.split('msg:');
                uName = parts[0].replace('user:', '').replace(';', '').trim() || "Anonymous";
                msgText = parts[1].trim();
            } else if (fullStr.includes('message:')) {
                msgText = fullStr.replace('message:', '').trim();
            }
            
            if (msgText.includes('badge*:')) {
                const bp = msgText.split('badge*:');
                msgText = bp[0].trim();
                useBadge = bp[1].trim() === 'true';
            }

            if (useBadge && !isAdmin) {
                printToTerminal("Error: Cannot use badge*. Insufficient privileges.");
                break;
            }

            const { data, error } = await supabaseClient.from('guestbook').insert({ 
                name: uName, 
                message: msgText, 
                is_creator: useBadge,
                ip_address: 'Terminal',
                country: 'Unknown',
                is_vpn: false
            }).select('id').single();

            if (error) {
                printToTerminal("Error sending message: " + error.message);
            } else {
                if (data && data.id) {
                    const localSaved = JSON.parse(localStorage.getItem('posted_messages') || '[]');
                    localSaved.push(data.id);
                    localStorage.setItem('posted_messages', JSON.stringify(localSaved));
                }
                printToTerminal(`Message sent to Chits & Chats as ${uName}.`);
            }
            break;

        default:
            printToTerminal(`Command not found: ${cmd}. Type 'help' for a list of commands.`);
            break;
    }
}