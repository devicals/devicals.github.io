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
let customConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    makeDraggable('nav-window', 'nav-drag');
    makeDraggable('announcement-window', 'ann-drag');
    makeDraggable('terminal-window', 'term-drag');
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
    
    const savedTheme = localStorage.getItem('selected-theme') || 'original';
    changeTheme(savedTheme);
    
    sessionStorage.removeItem('announcement-closed');
    setupTerminal();

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
    document.getElementById('term-prompt-prefix').textContent = `${isAdmin ? 'A' : 'U'} > github\\pages\\devicals >`;
    loadCustomPages();

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
    currentAnnouncements = data;
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

function renderTreeNodes(nodes, container, prefix = '') {
    nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const nodePrefix = prefix + (isLast ? '└─ ' : '├─ ');
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'nav-item';
        
        if (node.type === 'category') {
            itemDiv.innerHTML = `<span style="color:hsl(var(--accent)); font-weight:600; margin-top:10px; display:inline-block; cursor:default;">${node.name}/</span>`;
            container.appendChild(itemDiv);
            renderTreeNodes(node.children, container, '');
        } else {
            const link = document.createElement('span');
            link.textContent = node.name;
            link.onclick = () => loadPage(node.id);
            
            itemDiv.appendChild(document.createTextNode(nodePrefix));
            itemDiv.appendChild(link);
            container.appendChild(itemDiv);
            
            if (node.children && node.children.length > 0) {
                const childPrefix = prefix + (isLast ? '   ' : '│  ');
                renderTreeNodes(node.children, container, childPrefix);
            }
        }
    });
}

async function loadCustomPages() {
    customConfig = await loadYAML('/storage/data/custom.yaml');
    if (!customConfig || !customConfig.customPages) return;

    const container = document.getElementById('nav-tree-content');
    container.innerHTML = '';

    const expire = sessionStorage.getItem('sidebar_expire');
    const isRevealed = expire && Date.now() < parseInt(expire);

    let tree = [];
    Object.entries(customConfig.customPages).forEach(([key, category]) => {
        let catNode = { name: category.display || key, type: 'category', children: [] };
        if (category.sub) {
            let nodeMap = {};
            category.sub.forEach(p => {
                if (isRevealed || (!p.hidden && !p.locked)) {
                    nodeMap[p.id] = { ...p, children: [] };
                }
            });
            Object.values(nodeMap).forEach(p => {
                let pType = typeof p.type === 'object' ? p.type.type : p.type;
                if (pType === 'refsection' && p.type.refid && nodeMap[p.type.refid]) {
                    nodeMap[p.type.refid].children.push(p);
                } else {
                    catNode.children.push(p);
                }
            });
        }
        if (catNode.children.length > 0) tree.push(catNode);
    });

    renderTreeNodes(tree, container);

    container.innerHTML += `
        <div class="nav-folder">System/</div>
        <div class="nav-item">└─ <span onclick="window.openTerminal()">Terminal</span></div>
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
    if (!customConfig) customConfig = await loadYAML('/storage/data/custom.yaml');
    if (customConfig && customConfig.customPages) {
        let customPage = null;
        for (const key in customConfig.customPages) {
            const found = customConfig.customPages[key].sub.find(p => String(p.id) === String(pageName));
            if (found) { customPage = found; break; }
        }
        
        if (customPage) {
            if (customPage.locked && sessionStorage.getItem('unlocked_' + pageName) !== 'true') {
                pendingPage = { id: pageName, args: args };
                document.getElementById('lock-window').style.display = 'flex';
                return;
            }

            let pagePath = customPage.path;
            if (pagePath.startsWith('~/')) {
                pagePath = '/storage/internal/pages/custom/' + pagePath.substring(2);
            }
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
window.closeLockModal = () => { document.getElementById('lock-window').style.display = 'none'; document.getElementById('lock-input').value = ''; pendingPage = null; }

window.openTerminal = () => {
    const win = document.getElementById('terminal-window');
    win.style.display = 'flex';
    win.style.zIndex = ++window.highestZ;
    document.getElementById('term-input').focus();
};
window.closeTerminal = () => { document.getElementById('terminal-window').style.display = 'none'; };

function escapeHTML(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function setupTerminal() {
    const termInput = document.getElementById('term-input');
    const termOutput = document.getElementById('term-output');
    
    const print = (text, breakline = false) => {
        const div = document.createElement('div');
        div.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
        termOutput.appendChild(div);
        if (breakline) termOutput.appendChild(document.createElement('br'));
        termOutput.scrollTop = termOutput.scrollHeight;
    };

    termInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const val = termInput.value.trim();
            termInput.value = '';
            if (!val) return;
            
            let maskedVal = val;
            if (val.startsWith('user login ')) {
                const parts = val.split(' ');
                if (parts[2]) maskedVal = `user login ${'*'.repeat(parts[2].length)}`;
            }
            
            const promptSymbol = isAdmin ? 'A' : 'U';
            print(`${promptSymbol} > github\\pages\\devicals > ${maskedVal}`);
            await processCommand(val, print);
        }
    });
}

async function processCommand(cmdLine, print) {
    const args = cmdLine.split(' ');
    const cmd = args[0].toLowerCase();
    const fullArgs = cmdLine.substring(cmd.length).trim();

    switch(cmd) {
        case 'help':
            print(`┌ HELP\n├ lists all commands,\n└ displays this message\n\n┌ USER\n├ displays current user information and/or\n│ perform admin login or logout actions\n│ usage: user [login <password> | logout]\n└ note: login password will be redacted as * in input\n\n┌ SOURCE\n└ origin > website source code\n\n┌ NAVIGATE\n├ navigate to a different page\n│ usage: navigate [path]\n│ example: navigate community/chitchat\n│          moves to 'Chits & Chats' page\n│ example: navigate extra/writing/books\n│          moves to 'Books' page\n└ aliases: nav\n\n┌ MESSAGE\n├ send a message in 'Chits & Chats'\n│ usage: message [user:<name>; msg:<message> | message:<message> badge*:<true|false>]\n│        username is optional | badge* is [A] admin only\n│ aliases: msg\n└ notes: drawings cannot be added via terminal\n\n┌ THEME\n├ manages current theme\n│ usage: theme [apply <theme> | index]\n└ aliases: c, color\n\n┌ PAGE\n├ show or hide @hidden pages\n│ [A] admin only\n└ usage: page [show | hide]\n\n┌ BROADCAST\n├ manages announcements\n│ [A] admin only\n│ usage: broadcast [create <message> | index | delete <indexID>]\n│        no arguments will default to 'index' argument\n└ aliases: bc`, true);
            break;
        case 'user':
            if (args[1] === 'login' && args[2]) {
                const { error } = await supabaseClient.auth.signInWithPassword({ email: '3rr0r.d3v@gmail.com', password: args[2] });
                if (error) print(`Error: ${error.message}`, true);
                else print(`Successfully logged in as Administrator status`, true);
            } else if (args[1] === 'logout') {
                await supabaseClient.auth.signOut();
                print(`Logged out.`, true);
            } else {
                print(`Current status: ${isAdmin ? 'Administrator' : 'User'}`, true);
            }
            break;
        case 'source':
            window.open('https://github.com/devicals/devicals.github.io', '_blank');
            print(`Opening source...`, true);
            break;
        case 'navigate':
        case 'nav':
            if (fullArgs) {
                const parts = fullArgs.split('/');
                const id = parts[parts.length - 1];
                loadPage(id);
                print(`Navigated to ${id}`, true);
            } else {
                print(`usage: navigate [path]`, true);
            }
            break;
        case 'message':
        case 'msg':
            if (!fullArgs) { print(`usage: message [user:<name>; msg:<message>]`, true); break; }
            let msgStr = fullArgs; let userStr = isAdmin ? 'Error Dev' : 'Anonymous';
            if (fullArgs.includes('msg:')) {
                const p = fullArgs.split('msg:');
                msgStr = p[1].split('badge*:')[0].trim();
                if (p[0].includes('user:')) userStr = p[0].split('user:')[1].replace(';','').trim() || userStr;
            } else {
                msgStr = fullArgs.split('badge*:')[0].trim();
            }
            const useBadge = isAdmin && fullArgs.includes('badge*:true');
            const { error: msgErr } = await supabaseClient.from('guestbook').insert({ name: userStr, message: msgStr, is_creator: useBadge, ip_address: 'Hidden', country: 'Unknown', is_vpn: false });
            if (msgErr) print(`Error: ${msgErr.message}`, true);
            else print(`Message sent.`, true);
            break;
        case 'theme':
        case 'c':
        case 'color':
            if (args[1] === 'apply' && args[2]) {
                changeTheme(args[2]); print(`Applied theme: ${args[2]}`, true);
            } else if (args[1] === 'index') {
                print(`Themes: vitesse-dark, original, evergreens, gruvbox, ice-world, purple-orange, orange-purple, pink-dream, cyberpunk, desert, custom`, true);
            } else {
                print(`usage: theme [apply <theme> | index]`, true);
            }
            break;
        case 'page':
            if (!isAdmin) { print(`Error: Insufficient privileges`, true); break; }
            if (args[1] === 'show') {
                sessionStorage.setItem('sidebar_expire', (Date.now() + 1800000).toString());
                loadCustomPages(); print(`Hidden pages revealed.`, true);
            } else if (args[1] === 'hide') {
                sessionStorage.removeItem('sidebar_expire');
                loadCustomPages(); print(`Hidden pages hidden.`, true);
            } else {
                print(`usage: page [show | hide]`, true);
            }
            break;
        case 'broadcast':
        case 'bc':
            if (!isAdmin && args[1] !== 'index') { print(`Error: Insufficient privileges`, true); break; }
            const mode = args[1] || 'index';
            if (mode === 'index') {
                if (currentAnnouncements.length === 0) print(`No announcements found.`, true);
                else {
                    let out = `Index of current announcements:\n`;
                    currentAnnouncements.forEach((a, i) => out += `${i + 1}. '${a}'\n`);
                    print(out + `\nEnd`, true);
                }
            } else if (mode === 'create') {
                const text = fullArgs.substring(6).trim();
                if (!text) { print(`usage: bc create <message>`, true); break; }
                const newList = [...currentAnnouncements, text];
                await supabaseClient.from('site_content').update({ data: newList }).eq('key', 'announcements');
                print(`Created announcement '${text}' at index ${newList.length}`, true);
            } else if (mode === 'delete' && args[2]) {
                const idx = parseInt(args[2]) - 1;
                if (idx >= 0 && idx < currentAnnouncements.length) {
                    const newList = currentAnnouncements.filter((_, i) => i !== idx);
                    await supabaseClient.from('site_content').update({ data: newList }).eq('key', 'announcements');
                    print(`Deleted announcement at index ${args[2]}`, true);
                } else {
                    print(`Error: Invalid index`, true);
                }
            }
            break;
        default:
            print(`Error: '${cmd}' is not recognized. Type 'help' for commands.`, true);
    }
}