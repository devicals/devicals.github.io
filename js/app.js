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
window.pagesDb = {}; // Global page DB for markdown content
let expandedFolders = JSON.parse(localStorage.getItem('expandedFolders') || '[]');

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
              "children": [
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
    }
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
    loadSettingsLocally();
    await fetchPagesDb(); // Fetch markdown DB upfront
    await loadNavigation();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    initAuth();
    loadAnnouncementsToast();
});

window.guiAlert = function(msg, title = "Notification") {
    document.getElementById('gui-title').textContent = title;
    document.getElementById('gui-msg').textContent = msg;
    document.getElementById('gui-modal').style.display = 'flex';
};

window.closeGuiModal = function() {
    document.getElementById('gui-modal').style.display = 'none';
};

window.guiConfirm = function(msg, title = "Confirm Action") {
    return new Promise((resolve) => {
        document.getElementById('gui-confirm-title').textContent = title;
        document.getElementById('gui-confirm-msg').textContent = msg;
        const modal = document.getElementById('gui-confirm-modal');
        modal.style.display = 'flex';

        const yesBtn = document.getElementById('gui-confirm-yes');
        const cleanup = () => { modal.style.display = 'none'; yesBtn.onclick = null; };

        yesBtn.onclick = () => { cleanup(); resolve(true); };
        window.closeGuiConfirmModal = () => { cleanup(); resolve(false); };
    });
};

window.guiPrompt = function(msg, defaultValue = "", title = "Input Required") {
    return new Promise((resolve) => {
        document.getElementById('gui-prompt-title').textContent = title;
        document.getElementById('gui-prompt-msg').textContent = msg;
        const input = document.getElementById('gui-prompt-input');
        input.value = defaultValue;
        const modal = document.getElementById('gui-prompt-modal');
        modal.style.display = 'flex';

        const okBtn = document.getElementById('gui-prompt-ok');
        const cleanup = () => { modal.style.display = 'none'; okBtn.onclick = null; };

        okBtn.onclick = () => { const val = input.value; cleanup(); resolve(val); };
        window.closeGuiPromptModal = () => { cleanup(); resolve(null); };
    });
};

function loadSettingsLocally() {
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
    syncSettingsToServer();
    syncIframeTheme();
};

document.getElementById('theme-selector').onchange = (e) => {
    localStorage.setItem('theme', e.target.value);
    if(document.documentElement.getAttribute('data-theme') !== 'light') {
        document.documentElement.setAttribute('data-theme', e.target.value);
    }
    syncSettingsToServer();
    syncIframeTheme();
};

document.getElementById('save-css').onclick = () => {
    const css = document.getElementById('custom-css-input').value;
    localStorage.setItem('custom-css', css);
    document.getElementById('custom-css-block').textContent = css;
    syncSettingsToServer();
};

function syncIframeTheme() {
    const iframe = document.getElementById('iframe-workspace');
    if (iframe && iframe.contentWindow) {
        const theme = document.documentElement.getAttribute('data-theme');
        try { iframe.contentWindow.document.documentElement.setAttribute('data-theme', theme); } catch(e) {}
    }
}

async function syncSettingsToServer() {
    if (currentUser) {
        const payload = { 
            theme: localStorage.getItem('theme'), 
            custom_css: localStorage.getItem('custom-css'),
            dark_mode: localStorage.getItem('dark-mode')
        };
        await supabaseClient.from('site_content').upsert({ key: 'settings_' + currentUser.id, data: payload });
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
            const { data: profData } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
            currentProfile = profData;
            
            const { data: setObj } = await supabaseClient.from('site_content').select('data').eq('key', 'settings_' + currentUser.id).single();
            if (setObj && setObj.data) {
                if (setObj.data.theme) localStorage.setItem('theme', setObj.data.theme);
                if (setObj.data.custom_css) localStorage.setItem('custom-css', setObj.data.custom_css);
                if (setObj.data.dark_mode) localStorage.setItem('dark-mode', setObj.data.dark_mode);
                loadSettingsLocally();
            }

            if (currentProfile?.is_admin) {
                adminLink.style.display = 'flex';
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
            <button class="ui-btn" onclick="supabaseClient.auth.signOut()" style="border-color:var(--destructive); color:var(--destructive);">Logout</button>
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

async function fetchPagesDb() {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'pages_db').single();
        if (data && data.data) {
            window.pagesDb = data.data;
        }
    } catch(e) {
        window.pagesDb = {};
    }
}

async function loadNavigation() {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'structure').single();
        if (data && data.data && data.data.length > 0) {
            navData = { children: data.data };
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
    
    const canSeeHidden = currentProfile?.is_admin ? showHiddenPages : false;

    function buildTree(nodes, parentEl, pathPrefix = []) {
        nodes.forEach(node => {
            if (node.hidden && !canSeeHidden) return;
            
            const currentPath = [...pathPrefix, node.name];
            const currentPathHash = currentPath.join('/');
            const el = document.createElement('div');
            
            if (node.type === 'folder') {
                const isExp = expandedFolders.includes(currentPathHash);
                el.innerHTML = `<div class="nav-item"><span class="nav-chevron">${isExp ? 'v' : '>'}</span> <span style="font-weight:bold;">${node.name}</span></div>`;
                const childrenContainer = document.createElement('div');
                childrenContainer.className = `nav-children ${isExp ? 'expanded' : ''}`;
                
                el.querySelector('.nav-item').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nowExp = childrenContainer.classList.toggle('expanded');
                    if (nowExp && !expandedFolders.includes(currentPathHash)) {
                        expandedFolders.push(currentPathHash);
                    } else if (!nowExp) {
                        expandedFolders = expandedFolders.filter(p => p !== currentPathHash);
                    }
                    localStorage.setItem('expandedFolders', JSON.stringify(expandedFolders));
                    el.querySelector('.nav-chevron').textContent = nowExp ? 'v' : '>';
                    window.location.hash = currentPathHash;
                });

                el.appendChild(childrenContainer);
                parentEl.appendChild(el);
                flatNodes.push({ name: node.name, type: 'folder', path: currentPathHash, children: node.children });
                buildTree(node.children || [], childrenContainer, currentPath);
            } else {
                el.className = 'nav-item';
                el.innerHTML = `<span style="width:14px"></span>${node.name}`;
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.hash = currentPathHash;
                });
                el.setAttribute('data-path', currentPathHash);
                parentEl.appendChild(el);
                flatNodes.push({ name: node.name, type: 'file', path: currentPathHash, fileType: node.fileType, url: node.url, file: node.path });
            }
        });
    }
    buildTree(navData.children || [], container);
    highlightNav();
}

function highlightNav() {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('data-path') === hash) {
            el.classList.add('active');
        }
    });
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

    breadcrumbs.innerHTML = hash.split('/').map((p, i, arr) => `<span class="crumb-link" onclick="window.location.hash='${arr.slice(0, i+1).join('/')}'">${p}</span>`).join(' > ');
    
    const node = flatNodes.find(n => n.path === hash);
    
    if (node) {
        if (node.type === 'folder') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';
            
            const canSeeHidden = currentProfile?.is_admin ? showHiddenPages : false;
            let html = `<h1>${node.name}</h1><p style="color:var(--fg-muted); padding-bottom:12px; border-bottom:1px dashed var(--border);">Folder Contents:</p><div style="display:flex; flex-direction:column; gap:6px; margin-top:30px;">`;
            
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    if (child.hidden && !canSeeHidden) return;
                    const childPath = node.path + '/' + child.name;
                    html += `
                        <a href="#${childPath}" style="padding: 16px 20px; background:var(--bg-hover); border:1px solid var(--border); color:var(--fg-main); text-decoration:none; transition: border-color 0.2s; font-size: 15px; font-weight: bold;">
                            ${child.name}
                        </a>
                    `;
                });
            } else {
                html += `<div style="color:var(--fg-muted); font-style:italic;">This folder is empty.</div>`;
            }
            
            html += `</div>`;
            mdContainer.innerHTML = html;
            return;
        }

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
                let text = window.pagesDb[node.file];
                if (!text) {
                    const res = await fetch(node.file);
                    text = res.ok ? await res.text() : '## Blank Page\nClick edit to add content.';
                }
                
                let adminEditHeader = '';
                if (currentProfile?.is_admin) {
                    adminEditHeader = `<div class="editor-header"><span style="font-size:12px; color:var(--fg-muted)">Path: ${node.file}</span><button class="ui-btn" style="width:auto; margin:0;" onclick="openMarkdownEditor('${node.file}')">✎ Edit Page</button></div>`;
                }
                mdContainer.innerHTML = adminEditHeader + marked.parse(text);
                updateWordCount(text);
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
    mdContainer.innerHTML = '<h2 style="color:var(--destructive); margin-top:20px;">Page not found</h2>';
}

window.openMarkdownEditor = async function(filePath) {
    const iframe = document.getElementById('iframe-workspace');
    const mdContainer = document.getElementById('page-content');
    const editorWorkspace = document.getElementById('editor-workspace');

    iframe.style.display = 'none';
    mdContainer.style.display = 'none';
    editorWorkspace.style.display = 'block';

    try {
        let text = window.pagesDb[filePath];
        if (!text) {
            const res = await fetch(filePath);
            text = res.ok ? await res.text() : '';
        }

        editorWorkspace.innerHTML = `
            <div class="editor-header">
                <h2 style="margin:0;">Edit Page: ${filePath}</h2>
                <div style="display:flex; gap:12px;">
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="handleRoute()">Cancel</button>
                    <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="saveMarkdownContent('${filePath}')">Save Page</button>
                </div>
            </div>
            <textarea id="markdown-edit-area" class="ui-input" style="height: calc(100vh - 250px); resize: none; font-family: var(--font-ui); font-size:13px; line-height:1.6; padding: 20px;">${text}</textarea>
        `;
    } catch(e) {
        guiAlert('Failed to load content for editing.', 'Error');
    }
};

window.saveMarkdownContent = async function(filePath) {
    const text = document.getElementById('markdown-edit-area').value;
    try {
        window.pagesDb[filePath] = text;
        await supabaseClient.from('site_content').upsert({ key: 'pages_db', data: window.pagesDb });
        guiAlert('Page saved successfully to Database.', 'Saved');
        handleRoute();
    } catch(e) {
        guiAlert('Failed to save content.', 'Error');
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

            textEl.textContent = data.data[data.data.length - 1]; // show latest
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