const supabaseUrl = "https://wtasesmqwpnbwzdynnas.supabase.co";
const supabaseKey = "sb_publishable_ay0PuIePjZwrEgP5XpD5iQ_W5wC-5g9";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentProfile = null;
let navData = { children: [] };
let flatNodes = [];
let commitPage = 1;
let expandedFolders = JSON.parse(localStorage.getItem('expandedFolders') || '[]');

marked.use({ breaks: true, gfm: true });

document.addEventListener('DOMContentLoaded', async () => {
    loadSettingsLocally();
    await loadNavigation();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    initAuth();
    loadAnnouncementsToasts();
});

window.guiAlert = function(msg, title = "notification") {
    document.getElementById('gui-title').textContent = title;
    document.getElementById('gui-msg').textContent = msg;
    document.getElementById('gui-modal').style.display = 'flex';
};

window.closeGuiModal = function() {
    document.getElementById('gui-modal').style.display = 'none';
};

window.guiConfirm = function(msg, title = "confirm action") {
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

window.guiPrompt = function(msg, defaultValue = "", title = "input required") {
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
    if (document.documentElement.getAttribute('data-theme') !== 'light') {
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
        try { iframe.contentWindow.document.documentElement.setAttribute('data-theme', theme); } catch (e) {}
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
            if (currentProfile?.is_admin || currentUser.email?.toLowerCase() === '3rr0r.d3v@gmail.com') {
                document.body.classList.add('is-admin');
            } else {
                document.body.classList.remove('is-admin');
            }
        } catch (e) {}
    } else {
        document.body.classList.remove('is-admin');
    }

    renderAuthModal();
}

function renderAuthModal() {
    const container = document.getElementById('auth-content');
    if (currentUser) {
        container.innerHTML = `
            <div class="profile-info">
                <div class="profile-name">${currentProfile?.username || 'authenticated user'}</div>
                <div class="profile-id">ID: ${currentUser.id}</div>
            </div>
            <input type="text" id="prof-name" class="ui-input" placeholder="set display name">
            <button class="ui-btn" onclick="updateProfile()">save display name</button>
            <button class="ui-btn" onclick="supabaseClient.auth.signOut()" style="border-color:var(--destructive); color:var(--destructive);">logout</button>
        `;
    } else {
        container.innerHTML = `
            <input type="email" id="auth-email" class="ui-input" placeholder="email">
            <input type="password" id="auth-pass" class="ui-input" placeholder="password">
            <button class="ui-btn" onclick="authAction('login')">login</button>
            <button class="ui-btn" onclick="authAction('signup')">sign up</button>
        `;
    }
}

window.authAction = async (action) => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;
    try {
        if (action === 'signup') {
            await supabaseClient.auth.signUp({ email, password });
            guiAlert("account created successfully. you may now log in.", "auth success");
        } else {
            await supabaseClient.auth.signInWithPassword({ email, password });
        }
    } catch (e) {
        guiAlert(e.message, "auth error");
    }
};

window.updateProfile = async () => {
    const username = document.getElementById('prof-name').value;
    if (!username || !currentUser) return;
    try {
        await supabaseClient.from('profiles').upsert({ id: currentUser.id, username });
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
        currentProfile = data;
        renderAuthModal();
        guiAlert("display name updated.", "Success");
    } catch (e) {
        guiAlert(e.message, "Error");
    }
};

document.getElementById('auth-trigger').onclick = () => document.getElementById('auth-modal').style.display = 'flex';
document.getElementById('settings-trigger').onclick = () => document.getElementById('settings-modal').style.display = 'flex';

async function loadNavigation() {
    try {
        const response = await fetch('data/structure.yaml');
        const yamlText = await response.text();
        const parsed = jsyaml.load(yamlText);
        navData = { children: parsed };
    } catch (e) {
        console.error("failed to load navigation", e);
    }
    renderNavigation();
}

function renderNavigation() {
    const container = document.getElementById('nav-tree');
    container.innerHTML = '';
    flatNodes = [];

    function buildTree(nodes, parentEl, pathPrefix = []) {
        nodes.forEach(node => {
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
                    setRouteHash(currentPathHash);
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
                    setRouteHash(currentPathHash);
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

function setRouteHash(rawPath) {
    window.location.hash = rawPath;
}

function highlightNav() {
    const hash = decodeURIComponent(window.location.hash.substring(1)).split('?')[0];
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('data-path') === hash) {
            el.classList.add('active');
        }
    });
}

async function handleRoute() {
    let rawHash = decodeURIComponent(window.location.hash.substring(1));
    if (!rawHash) { window.location.hash = "index/home"; return; }

    let parts = rawHash.split('?');
    let hash = parts[0];

    highlightNav();

    const iframe = document.getElementById('iframe-workspace');
    const mdContainer = document.getElementById('page-content');
    const breadcrumbs = document.getElementById('breadcrumbs');

    if (hash === 'admin') {
        iframe.style.display = 'none';
        mdContainer.style.display = 'block';
        breadcrumbs.innerHTML = 'system > admin dashboard';
        if (window.renderAdminPage) window.renderAdminPage();
        return;
    }

    breadcrumbs.innerHTML = hash.split('/').map((p, i, arr) => `<span class="crumb-link" onclick="setRouteHash('${arr.slice(0, i + 1).join('/').replace(/'/g, "\\'")}')">${p}</span>`).join(' > ');

    const node = flatNodes.find(n => n.path === hash);

    if (node) {
        if (node.type === 'folder') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';

            let html = `<h1>${node.name}</h1><p style="color:var(--fg-muted); padding-bottom:12px; border-bottom:1px dashed var(--border);">folder contents:</p><div style="display:flex; flex-direction:column; gap:6px; margin-top:30px;">`;

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    const childPath = node.path + '/' + child.name;
                    html += `
                        <a href="#${childPath}" style="padding: 16px 20px; background:var(--bg-hover); border:1px solid var(--border); color:var(--fg-main); text-decoration:none; transition: border-color 0.2s; font-size: 15px; font-weight: bold;">
                            ${child.name}
                        </a>
                    `;
                });
            } else {
                html += `<div style="color:var(--fg-muted); font-style:italic;">this folder is empty.</div>`;
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

        if (node.fileType === 'commits') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';
            commitPage = 1;
            await renderCommitsPage(mdContainer, true);
            return;
        }

        if (node.fileType === 'html') {
            mdContainer.style.display = 'none';
            iframe.style.display = 'block';
            iframe.src = node.url + (parts[1] ? '?' + parts[1] : '');
            return;
        }

        if (node.fileType === 'md') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';
            try {
                const res = await fetch(node.file);
                const text = res.ok ? await res.text() : '## blank page\ncontent not found.';
                mdContainer.innerHTML = marked.parse(text);
                updateWordCount(text);
            } catch (e) {
                mdContainer.innerHTML = '<h2>error loading document</h2>';
            }
            return;
        }
    }

    iframe.style.display = 'none';
    mdContainer.style.display = 'block';
    mdContainer.innerHTML = '<h2 style="color:var(--destructive); margin-top:20px;">page not found</h2>';
}

async function renderCommitsPage(container, reset = false) {
    if (reset) {
        container.innerHTML = '<h1>commit history</h1><div id="commits-list" style="margin-top:40px;"></div><button id="load-more-commits-btn" class="ui-btn" style="margin-top:20px;" onclick="loadMoreCommits()">load more commits</button>';
    }
    const listEl = document.getElementById('commits-list');
    try {
        const res = await fetch(`https://api.github.com/repos/devicals/devicals.github.io/commits?page=${commitPage}&per_page=15`);
        if (!res.ok) throw new Error('failed to fetch');
        const commits = await res.json();

        const escapeHTML = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (commits.length === 0) {
            document.getElementById('load-more-commits-btn').style.display = 'none';
            return;
        }

        const rows = commits.map((c) => {
            const sha = (c.sha || '').substring(0, 7);
            const lines = (c.commit?.message || '').split('\n');
            const summary = escapeHTML(lines[0]);
            const body = escapeHTML(lines.slice(1).join('\n').trim());
            const author = escapeHTML(c.commit?.author?.name || c.author?.login || 'Unknown');
            const dateStr = c.commit?.author?.date;
            const dateDisplay = dateStr ? new Date(dateStr).toLocaleString() : '';

            return `
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="width: 14px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 2px; flex: 1; background: var(--border);"></div>
                        <div style="color: var(--accent); font-weight: bold; line-height: 1; font-size: 16px;">&#9679;</div>
                        <div style="width: 2px; flex: 1; background: var(--border);"></div>
                    </div>
                    <div style="flex: 1; min-width: 0; padding-bottom: 20px; border-bottom: 1px dashed var(--border);">
                        <div style="white-space: pre-wrap; word-break: break-word; color: var(--fg-main); font-size: 16px; font-weight: bold;">${summary}</div>
                        ${body ? `<div style="white-space: pre-wrap; word-break: break-word; color: var(--fg-muted); font-size: 13px; margin-top: 8px;">${body}</div>` : ''}
                        <div style="color: var(--fg-muted); font-size: 12px; margin-top: 10px;">
                            <span style="color:var(--accent);">${sha}</span> &middot; ${author} &middot; ${dateDisplay}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        listEl.innerHTML += rows;
    } catch (e) {
        listEl.innerHTML += '<p style="color:var(--destructive);">failed to load additional commits.</p>';
    }
}

window.loadMoreCommits = function () {
    commitPage++;
    renderCommitsPage(document.getElementById('page-content'), false);
};

function updateWordCount(text) {
    const el = document.getElementById('doc-char-count');
    if (!el) return;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    el.textContent = `${words} words ${chars} characters`;
}

async function loadAnnouncementsToasts() {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data && data.data.length > 0) {
            const container = document.getElementById('announcement-container');
            container.innerHTML = '';

            data.data.forEach((annText, idx) => {
                const toast = document.createElement('div');
                toast.className = 'announcement-toast';
                toast.id = `ann-toast-${idx}`;
                toast.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--accent); font-weight:bold; font-size:11px; text-transform:uppercase;">notice</span>
                        <span style="cursor:pointer; color:var(--fg-muted);" onclick="this.closest('.announcement-toast').remove()">✕</span>
                    </div>
                    <div class="announcement-body">${marked.parse(annText)}</div>
                    <div class="announcement-progress-track"><div class="announcement-progress" id="ann-progress-${idx}"></div></div>
                `;
                container.appendChild(toast);

                const bar = toast.querySelector(`#ann-progress-${idx}`);
                requestAnimationFrame(() => {
                    bar.style.transition = 'transform 30s linear';
                    bar.style.transform = 'scaleX(0)';
                });

                setTimeout(() => {
                    if (toast.isConnected) {
                        toast.style.transition = 'opacity 0.4s ease';
                        toast.style.opacity = '0';
                        setTimeout(() => toast.remove(), 400);
                    }
                }, 30000);
            });
        }
    } catch (e) {}
}