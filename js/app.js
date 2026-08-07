const supabaseUrl = "https://wtasesmqwpnbwzdynnas.supabase.co";
const supabaseKey = "sb_publishable_ay0PuIePjZwrEgP5XpD5iQ_W5wC-5g9";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentProfile = null;
let navData = { children: [] };
let flatNodes = [];
let showHiddenPages = false;

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
});

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
};

document.getElementById('theme-selector').onchange = (e) => {
    localStorage.setItem('theme', e.target.value);
    if(document.documentElement.getAttribute('data-theme') !== 'light') {
        document.documentElement.setAttribute('data-theme', e.target.value);
    }
};

document.getElementById('save-css').onclick = () => {
    const css = document.getElementById('custom-css-input').value;
    localStorage.setItem('custom-css', css);
    document.getElementById('custom-css-block').textContent = css;
};

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
                <div class="profile-id">${currentUser.id}</div>
            </div>
            <input type="text" id="prof-name" class="ui-input" placeholder="Set Display Name">
            <button class="ui-btn" onclick="updateProfile()">Save Name</button>
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
        } else {
            await supabaseClient.auth.signInWithPassword({ email, password });
        }
    } catch(e) {
        alert(e.message);
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
    } catch(e) {}
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
    const breadcrumbs = document.getElementById('breadcrumbs');
    
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
            try {
                const res = await fetch(node.file);
                if (res.ok) {
                    const text = await res.text();
                    mdContainer.innerHTML = marked.parse(text);
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

function updateWordCount(text) {
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    document.getElementById('doc-char-count').textContent = `${words} words ${chars} characters`;
}