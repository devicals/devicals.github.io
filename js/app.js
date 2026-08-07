const supabaseUrl = "https://wtasesmqwpnbwzdynnas.supabase.co";
const supabaseKey = "sb_publishable_ay0PuIePjZwrEgP5XpD5iQ_W5wC-5g9";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentProfile = null;
let navData = { children: [] };
let flatNodes = [];
let showHiddenPages = false;
let announcementTimer = null;
let currentDocFile = null;

const DEFAULT_NAV = {
  "children": [
    {
      "name": "Index",
      "type": "folder",
      "children": [
        { "name": "Home", "type": "file", "fileType": "html", "url": "pages/home.html" },
        { "name": "Blogs", "type": "file", "fileType": "html", "url": "pages/blogs.html" },
        {
          "name": "Community",
          "type": "folder",
          "children": [
            { "name": "Chits & Chats", "type": "file", "fileType": "html", "url": "pages/chitchat.html" },
            { "name": "Gallery", "type": "file", "fileType": "html", "url": "pages/gallery.html" }
          ]
        }
      ]
    },
    {
      "name": "Content",
      "type": "folder",
      "children": [
        { "name": "Projects", "type": "file", "fileType": "html", "url": "pages/projects.html" },
        { "name": "Downloads", "type": "file", "fileType": "html", "url": "pages/downloads.html" },
        {
          "name": "Writing",
          "type": "folder",
          "children": [
            {
              "name": "Books",
              "type": "folder",
              "collapsed": true,
              "children": [
                { "name": "Obliteration", "type": "file", "fileType": "md", "path": "content/books/obliter8tion/retribution/intro_1.md", "hidden": true },
                {
                  "name": "Halloween Specials",
                  "type": "folder",
                  "children": [
                    {
                      "name": "O' Mother of Mine",
                      "type": "folder",
                      "children": [
                        { "name": "The Lamb of Blood", "type": "file", "fileType": "md", "path": "content/books/hs/omom/chapter_1.md" },
                        { "name": "The Shepherd of Filth", "type": "file", "fileType": "md", "path": "content/books/hs/omom/chapter_2.md" },
                        { "name": "The Slaughtered Lamb", "type": "file", "fileType": "md", "path": "content/books/hs/omom/chapter_3.md" }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "name": "Poems",
              "type": "folder",
              "collapsed": true,
              "children": [
                {
                  "name": "first",
                  "type": "folder",
                  "children": [
                    { "name": "I \"the song bird\"", "type": "file", "fileType": "md", "path": "content/poems/c1/1.md" },
                    { "name": "II \"waking\"", "type": "file", "fileType": "md", "path": "content/poems/c1/2.md" },
                    { "name": "III \"loss\"", "type": "file", "fileType": "md", "path": "content/poems/c1/3.md" },
                    { "name": "IV \" \"", "type": "file", "fileType": "md", "path": "content/poems/c1/4.md" },
                    { "name": "V \"warm\"", "type": "file", "fileType": "md", "path": "content/poems/c1/5.md" },
                    { "name": "VI \"stay.\"", "type": "file", "fileType": "md", "path": "content/poems/c1/6.md" },
                    { "name": "VII \"river\"", "type": "file", "fileType": "md", "path": "content/poems/c1/7.md" },
                    { "name": "IIX \"again\"", "type": "file", "fileType": "md", "path": "content/poems/c1/8.md" },
                    { "name": "IX \"the aching grew worse\"", "type": "file", "fileType": "md", "path": "content/poems/c1/9.md" },
                    { "name": "X \"bridge...\"", "type": "file", "fileType": "md", "path": "content/poems/c1/10.md" }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "About Me",
      "type": "folder",
      "children": [
        { "name": "Games I <3", "type": "file", "fileType": "html", "url": "pages/games.html" },
        { "name": "Spotify", "type": "file", "fileType": "spotify" }
      ]
    },
    {
      "name": "Other Stuff",
      "type": "folder",
      "children": [
        {
          "name": "Tier List Maker",
          "type": "folder",
          "children": [
            { "name": "ZATOcord Tierlist", "type": "file", "fileType": "html", "url": "pages/zato.html" }
          ]
        },
        { "name": "World Clock Viewer", "type": "file", "fileType": "html", "url": "pages/worldclock.html" },
        { "name": "Code Translator", "type": "file", "fileType": "html", "url": "pages/codes.html" }
      ]
    },
    {
      "name": "Archived Pages",
      "type": "folder",
      "hidden": true,
      "children": [
        { "name": "Obliteration", "type": "file", "fileType": "md", "path": "content/books/obliter8tion/retribution/intro_1.md" },
        { "name": "Oricade Songs", "type": "file", "fileType": "html", "url": "pages/gallery.html?type=audio" },
        { "name": "Function Generator", "type": "file", "fileType": "html", "url": "pages/function_generator.html" }
      ]
    }
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await loadNavigation();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    initAuth();
    loadAnnouncementsToast();
});

function guiAlert(msg, title = "Notification") {
    document.getElementById('gui-title').textContent = title;
    document.getElementById('gui-msg').textContent = msg;
    document.getElementById('gui-modal').style.display = 'flex';
}

function closeGuiModal() {
    document.getElementById('gui-modal').style.display = 'none';
}

function guiConfirm(msg, title = "Confirm Action") {
    return new Promise((resolve) => {
        document.getElementById('gui-confirm-title').textContent = title;
        document.getElementById('gui-confirm-msg').textContent = msg;
        const modal = document.getElementById('gui-confirm-modal');
        modal.style.display = 'flex';

        const yesBtn = document.getElementById('gui-confirm-yes');
        
        const cleanup = () => {
            modal.style.display = 'none';
            yesBtn.onclick = null;
        };

        yesBtn.onclick = () => { cleanup(); resolve(true); };
        window.closeGuiConfirmModal = () => { cleanup(); resolve(false); };
    });
}

function guiPrompt(msg, defaultValue = "", title = "Input Required") {
    return new Promise((resolve) => {
        document.getElementById('gui-prompt-title').textContent = title;
        document.getElementById('gui-prompt-msg').textContent = msg;
        const input = document.getElementById('gui-prompt-input');
        input.value = defaultValue;
        const modal = document.getElementById('gui-prompt-modal');
        modal.style.display = 'flex';

        const okBtn = document.getElementById('gui-prompt-ok');
        
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.onclick = null;
        };

        okBtn.onclick = () => { const val = input.value; cleanup(); resolve(val); };
        window.closeGuiPromptModal = () => { cleanup(); resolve(null); };
    });
}

function loadSettings() {
    const isDark = localStorage.getItem('dark-mode') !== 'false';
    const theme = localStorage.getItem('theme') || 'primary';
    const customCss = localStorage.getItem('custom-css') || '';
    
    document.documentElement.setAttribute('data-theme', !isDark ? 'light' : theme);
    document.getElementById('custom-css-block').textContent = customCss;
    document.getElementById('custom-css-input').value = customCss;
    document.getElementById('theme-selector').value = theme;
}

document.getElementById('toggle-dark-mode').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const isLight = current === 'light';
    const theme = document.getElementById('theme-selector').value;
    document.documentElement.setAttribute('data-theme', isLight ? theme : 'light');
    localStorage.setItem('dark-mode', isLight ? 'true' : 'false');
    syncIframeTheme();
};

document.getElementById('theme-selector').onchange = (e) => {
    localStorage.setItem('theme', e.target.value);
    if(document.documentElement.getAttribute('data-theme') !== 'light') {
        document.documentElement.setAttribute('data-theme', e.target.value);
    }
    syncIframeTheme();
};

document.getElementById('save-css').onclick = () => {
    const css = document.getElementById('custom-css-input').value;
    localStorage.setItem('custom-css', css);
    document.getElementById('custom-css-block').textContent = css;
};

function syncIframeTheme() {
    const iframe = document.getElementById('iframe-workspace');
    if (iframe && iframe.contentWindow) {
        const theme = document.documentElement.getAttribute('data-theme');
        try {
            iframe.contentWindow.document.documentElement.setAttribute('data-theme', theme);
        } catch(e) {}
    }
}

async function initAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        await handleSession(session);
        supabaseClient.auth.onAuthStateChange((_event, session) => handleSession(session));
    } catch (e) {
        renderAuthModal();
    }
}

async function handleSession(session) {
    currentUser = session?.user || null;
    currentProfile = null;
    const adminLink = document.getElementById('admin-settings-link');
    
    if (currentUser) {
        try {
            const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
            currentProfile = data;
            if (currentProfile?.is_admin) {
                adminLink.style.display = 'block';
            } else {
                adminLink.style.display = 'none';
            }
        } catch(e) {
            adminLink.style.display = 'none';
        }
    } else {
        adminLink.style.display = 'none';
    }
    
    renderAuthModal();
    renderNavigation();
}

function renderAuthModal() {
    const container = document.getElementById('auth-content');
    if (currentUser) {
        container.innerHTML = `
            <div class="profile-info">
                <div class="profile-name">${currentProfile?.username || 'Authenticated User'}</div>
                <div class="profile-id">ID: ${currentUser.id}</div>
            </div>
            <input type="text" id="prof-name" class="ui-input" placeholder="Set Display Name">
            <button class="ui-btn" onclick="updateProfile()">Save Display Name</button>
            <button class="ui-btn" onclick="supabaseClient.auth.signOut()">Logout</button>
        `;
    } else {
        container.innerHTML = `
            <input type="email" id="auth-email" class="ui-input" placeholder="Email">
            <input type="password" id="auth-pass" class="ui-input" placeholder="Password">
            <button class="ui-btn" onclick="authAction('login')">Login</button>
            <button class="ui-btn" onclick="authAction('signup')">Sign Up</button>
        `;
    }
}

window.authAction = async (action) => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;
    try {
        if (action === 'signup') {
            await supabaseClient.auth.signUp({ email, password });
            guiAlert("Account created successfully. You may now log in.", "Auth Success");
        } else {
            await supabaseClient.auth.signInWithPassword({ email, password });
        }
    } catch(e) {
        guiAlert(e.message, "Auth Error");
    }
};

window.updateProfile = async () => {
    const username = document.getElementById('prof-name').value;
    if(!username || !currentUser) return;
    try {
        await supabaseClient.from('profiles').upsert({ id: currentUser.id, username });
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
        currentProfile = data;
        renderAuthModal();
        guiAlert("Display name updated.", "Success");
    } catch(e) {
        guiAlert(e.message, "Error");
    }
};

document.getElementById('auth-trigger').onclick = () => document.getElementById('auth-modal').style.display = 'flex';
document.getElementById('settings-trigger').onclick = () => document.getElementById('settings-modal').style.display = 'flex';

window.openAdminFromSettings = function() {
    document.getElementById('settings-modal').style.display = 'none';
    window.location.hash = 'admin';
};

async function loadNavigation() {
    try {
        const res = await fetch('data/structure.json');
        if (res.ok) {
            navData = await res.json();
        } else {
            navData = DEFAULT_NAV;
        }
    } catch (e) {
        navData = DEFAULT_NAV;
    }
    renderNavigation();
}

function renderNavigation() {
    const container = document.getElementById('nav-tree');
    container.innerHTML = '';
    flatNodes = [];
    
    const canSeeHidden = showHiddenPages || (currentProfile?.is_admin === true);

    function buildTree(nodes, parentEl, pathPrefix = []) {
        nodes.forEach(node => {
            if (node.hidden && !canSeeHidden) return;
            
            const currentPath = [...pathPrefix, node.name];
            const el = document.createElement('div');
            
            if (node.type === 'folder') {
                el.innerHTML = `<div class="nav-item"><span class="nav-chevron">${node.collapsed ? '>' : 'v'}</span> ${node.name}</div>`;
                const childrenContainer = document.createElement('div');
                childrenContainer.className = `nav-children ${node.collapsed ? '' : 'expanded'}`;
                el.querySelector('.nav-item').onclick = (e) => {
                    const chev = e.currentTarget.querySelector('.nav-chevron');
                    const isExp = childrenContainer.classList.toggle('expanded');
                    chev.textContent = isExp ? 'v' : '>';
                };
                el.appendChild(childrenContainer);
                parentEl.appendChild(el);
                buildTree(node.children || [], childrenContainer, currentPath);
            } else {
                el.className = 'nav-item';
                el.textContent = node.name;
                const pathHash = currentPath.join('/');
                el.onclick = () => window.location.hash = pathHash;
                el.setAttribute('data-path', pathHash);
                parentEl.appendChild(el);
                flatNodes.push({ name: node.name, path: pathHash, fileType: node.fileType, url: node.url, file: node.path });
            }
        });
    }
    buildTree(navData.children || [], container);
    highlightNav();
}

function highlightNav() {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-path="${hash}"]`);
    if(active) active.classList.add('active');
}

async function handleRoute() {
    let hash = decodeURIComponent(window.location.hash.substring(1));
    if (!hash) { hash = "Index/Home"; window.location.hash = hash; return; }
    
    highlightNav();
    
    const iframe = document.getElementById('iframe-workspace');
    const mdContainer = document.getElementById('page-content');
    const editorWorkspace = document.getElementById('editor-workspace');
    const breadcrumbs = document.getElementById('breadcrumbs');
    
    editorWorkspace.style.display = 'none';

    if (hash === 'admin') {
        iframe.style.display = 'none';
        mdContainer.style.display = 'block';
        breadcrumbs.innerHTML = 'System > Admin Dashboard';
        if (window.renderAdminPage) window.renderAdminPage();
        return;
    }

    breadcrumbs.innerHTML = hash.split('/').map(p => `<span class="crumb-link" onclick="window.location.hash='${p}'">${p}</span>`).join(' > ');
    
    const node = flatNodes.find(n => n.path === hash);
    
    if (node) {
        if (node.fileType === 'spotify') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';
            mdContainer.innerHTML = '<div id="spotify-inject"></div>';
            if (window.renderSpotify) window.renderSpotify();
            return;
        }
        
        if (node.fileType === 'html') {
            mdContainer.style.display = 'none';
            iframe.style.display = 'block';
            iframe.src = node.url;
            return;
        }
        
        if (node.fileType === 'md') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';
            currentDocFile = node.file;
            try {
                const res = await fetch(node.file);
                if (res.ok) {
                    const text = await res.text();
                    let adminEditHeader = '';
                    if (currentProfile?.is_admin) {
                        adminEditHeader = `<div class="editor-header"><span style="font-size:11px; color:var(--fg-muted)">Path: ${node.file}</span><button class="ui-btn" style="width:auto; margin:0;" onclick="openMarkdownEditor('${node.file}')">✎ Edit Page</button></div>`;
                    }
                    mdContainer.innerHTML = adminEditHeader + marked.parse(text);
                    updateWordCount(text);
                } else {
                    mdContainer.innerHTML = '<h2>404 - Document Not Found</h2>';
                }
            } catch(e) {
                mdContainer.innerHTML = '<h2>Error loading document</h2>';
            }
            return;
        }
    }
    
    if (hash.startsWith('pages/')) {
        mdContainer.style.display = 'none';
        iframe.style.display = 'block';
        iframe.src = hash;
        return;
    }
    
    iframe.style.display = 'none';
    mdContainer.style.display = 'block';
    mdContainer.innerHTML = '<h2>Page not found</h2>';
}

window.openMarkdownEditor = async function(filePath) {
    const iframe = document.getElementById('iframe-workspace');
    const mdContainer = document.getElementById('page-content');
    const editorWorkspace = document.getElementById('editor-workspace');

    iframe.style.display = 'none';
    mdContainer.style.display = 'none';
    editorWorkspace.style.display = 'block';

    try {
        const res = await fetch(filePath);
        const text = res.ok ? await res.text() : '';
        editorWorkspace.innerHTML = `
            <div class="editor-header">
                <h2>Edit Page: ${filePath}</h2>
                <div style="display:flex; gap:8px;">
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="handleRoute()">Cancel</button>
                    <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="saveMarkdownContent('${filePath}')">Save Page</button>
                </div>
            </div>
            <textarea id="markdown-edit-area" class="ui-input" style="height: calc(100vh - 220px); resize: vertical; font-family: var(--font-ui); font-size:12px; line-height:1.6;">${text}</textarea>
        `;
    } catch(e) {
        guiAlert('Failed to load content for editing.', 'Error');
    }
};

window.saveMarkdownContent = async function(filePath) {
    const text = document.getElementById('markdown-edit-area').value;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'page_edits').single();
        const edits = data?.data || {};
        edits[filePath] = text;
        await supabaseClient.from('site_content').upsert({ key: 'page_edits', data: edits });
        guiAlert('Page saved successfully.', 'Saved');
        handleRoute();
    } catch(e) {
        guiAlert('Saved locally for this session.', 'Saved');
        handleRoute();
    }
};

function updateWordCount(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    document.getElementById('doc-char-count').textContent = `${words} words ${chars} characters`;
}

async function loadAnnouncementsToast() {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data && data.data.length > 0) {
            const toast = document.getElementById('announcement-toast');
            const textEl = document.getElementById('announcement-text');
            const bar = document.getElementById('announcement-bar');

            textEl.textContent = data.data[0];
            toast.style.display = 'flex';
            bar.style.width = '100%';

            setTimeout(() => {
                bar.style.width = '0%';
            }, 50);

            announcementTimer = setTimeout(() => {
                closeAnnouncementToast();
            }, 30000);
        }
    } catch(e) {}
}

window.closeAnnouncementToast = function() {
    const toast = document.getElementById('announcement-toast');
    if (toast) toast.style.display = 'none';
    if (announcementTimer) clearTimeout(announcementTimer);
};