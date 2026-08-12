const supabaseUrl = "https://wtasesmqwpnbwzdynnas.supabase.co";
const supabaseKey = "sb_publishable_ay0PuIePjZwrEgP5XpD5iQ_W5wC-5g9";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentProfile = null;
let navData = { children: [] };
let flatNodes = [];
let commitPage = 1;
let expandedFolders = JSON.parse(localStorage.getItem('expandedFolders') || '[]');
let authModalState = 'login'; 

window.isOwner = false;
window.OWNER_EMAIL = '3rr0r.d3v@gmail.com';

marked.use({ breaks: true, gfm: true });

async function hashPassword(plainText) {
    if (!plainText) return '';
    const msgUint8 = new TextEncoder().encode(plainText + "_devicals_salt_2026");
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptEmail(email) {
    if (!email) return null;
    const text = email.trim().toLowerCase();
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ 42);
    }
    return 'enc_' + btoa(result);
}

async function decryptEmail(enc) {
    if (!enc) return null;
    if (!enc.startsWith('enc_')) return enc;
    try {
        const raw = atob(enc.replace('enc_', ''));
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            result += String.fromCharCode(raw.charCodeAt(i) ^ 42);
        }
        return result;
    } catch(e) {
        return enc;
    }
}

function initSynchronousUser() {
    try {
        const sessionStr = localStorage.getItem('custom_auth_session');
        if (sessionStr) {
            const parsed = JSON.parse(sessionStr);
            const name = (parsed.username || '').trim().toLowerCase();
            const email = (parsed.email || '').trim().toLowerCase();
            if (name === 'error dev' || email === window.OWNER_EMAIL.toLowerCase()) {
                parsed.is_owner = true;
                parsed.is_admin = true;
            }
            currentUser = parsed;
            currentProfile = parsed;
            window.isOwner = parsed.is_owner === true;
            if (parsed.is_admin || window.isOwner) {
                document.body.classList.add('is-admin');
            }
        }
    } catch(e) {}
}
initSynchronousUser();

window.getUserIdentity = function() {
    let user = currentUser;
    if (!user) {
        try {
            const sessionStr = localStorage.getItem('custom_auth_session');
            if (sessionStr) user = JSON.parse(sessionStr);
        } catch(e) {}
    }
    const name = (user?.username || '').trim().toLowerCase();
    const email = (user?.email || '').trim().toLowerCase();
    const isOwner = user ? (user.is_owner === true || name === 'error dev' || email === window.OWNER_EMAIL.toLowerCase()) : false;
    const isAdmin = user ? (user.is_admin === true || isOwner) : false;
    return {
        user: user,
        profile: user,
        isOwner: isOwner,
        isAdmin: isAdmin,
        username: user ? user.username : null
    };
};

function notifyIframeAuth() {
    const iframe = document.getElementById('iframe-workspace');
    if (iframe && iframe.contentWindow) {
        try {
            if (iframe.contentWindow.onParentAuthChanged) {
                iframe.contentWindow.onParentAuthChanged();
            }
        } catch (e) {}
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    loadSettingsLocally();
    await loadNavigation();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    initAuth();
    loadAnnouncementsToasts();
});

window.getDeviceId = function() {
    let devId = localStorage.getItem('device_id');
    if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        localStorage.setItem('device_id', devId);
    }
    return devId;
};

window.escapeAttr = function (str) {
    return (str || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

window.guiAlert = function(msg, title = "notification") {
    document.getElementById('gui-title').textContent = title;
    document.getElementById('gui-msg').innerHTML = `<div class="markdown-body" style="white-space:normal;">${msg}</div>`;
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

window.guiForm = function (fields, title = "input required") {
    return new Promise((resolve) => {
        document.getElementById('gui-form-title').textContent = title;
        const container = document.getElementById('gui-form-fields');
        container.innerHTML = fields.map(f => `
            <div class="settings-group">
                <label>${window.escapeAttr(f.label || f.key)}</label>
                ${f.type === 'textarea'
                    ? `<textarea id="gf-${f.key}" class="ui-input" rows="${f.rows || 6}" placeholder="${window.escapeAttr(f.placeholder || '')}">${window.escapeAttr(f.value || '')}</textarea>`
                    : `<input type="${f.type === 'password' ? 'password' : 'text'}" id="gf-${f.key}" class="ui-input" placeholder="${window.escapeAttr(f.placeholder || '')}" value="${window.escapeAttr(f.value || '')}">`
                }
            </div>
        `).join('');

        const modal = document.getElementById('gui-form-modal');
        modal.style.display = 'flex';

        const okBtn = document.getElementById('gui-form-ok');
        const cleanup = () => { modal.style.display = 'none'; okBtn.onclick = null; };

        okBtn.onclick = () => {
            const result = {};
            fields.forEach(f => { result[f.key] = document.getElementById(`gf-${f.key}`).value; });
            cleanup();
            resolve(result);
        };
        window.closeGuiFormModal = () => { cleanup(); resolve(null); };
    });
};

window.resolveAuthorsMap = async function (ids) {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))];
    if (!uniqueIds.length) return {};
    try {
        const { data, error } = await supabaseClient.from('profiles').select('id, username, is_owner, is_admin').in('id', uniqueIds);
        if (error) throw error;
        const map = {};
        (data || []).forEach(p => { map[p.id] = p; });
        return map;
    } catch (e) {
        return {};
    }
};

window.authorTagHTML = function (authorProfile) {
    if (!authorProfile) return '';
    const isOwnerAuthor = authorProfile.is_owner === true || authorProfile.username?.toLowerCase() === 'error dev';
    const label = isOwnerAuthor ? 'error dev' : (authorProfile.username || 'unnamed admin');
    const color = isOwnerAuthor ? 'var(--accent)' : 'var(--fg-muted)';
    return `<span style="font-size:10px; color:${color}; border:1px solid var(--border); padding:2px 6px; margin-left:6px; white-space:nowrap;">${window.escapeAttr(label)}</span>`;
};

function loadSettingsLocally() {
    const isDark = localStorage.getItem('dark-mode') !== 'false';
    const theme = localStorage.getItem('theme') || 'primary';
    const customCss = localStorage.getItem('custom-css') || '';
    const bgEffect = localStorage.getItem('bg-effect') || 'particles';

    document.documentElement.setAttribute('data-theme', !isDark ? 'light' : theme);
    document.getElementById('custom-css-block').textContent = customCss;
    document.getElementById('custom-css-input').value = customCss;
    document.getElementById('theme-selector').value = theme;
    document.getElementById('bg-effect-selector').value = bgEffect;
}

document.getElementById('toggle-dark-mode').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const isLight = current === 'light';
    const theme = document.getElementById('theme-selector').value;
    document.documentElement.setAttribute('data-theme', isLight ? theme : 'light');
    localStorage.setItem('dark-mode', isLight ? 'true' : 'false');
    syncSettingsToServer();
    syncIframeTheme();
    if (window.refreshBgTheme) window.refreshBgTheme();
};

document.getElementById('theme-selector').onchange = (e) => {
    localStorage.setItem('theme', e.target.value);
    if (document.documentElement.getAttribute('data-theme') !== 'light') {
        document.documentElement.setAttribute('data-theme', e.target.value);
    }
    syncSettingsToServer();
    syncIframeTheme();
    if (window.refreshBgTheme) window.refreshBgTheme();
};

document.getElementById('save-css').onclick = () => {
    const css = document.getElementById('custom-css-input').value;
    localStorage.setItem('custom-css', css);
    document.getElementById('custom-css-block').textContent = css;
    syncSettingsToServer();
};

document.getElementById('bg-effect-selector').onchange = (e) => {
    localStorage.setItem('bg-effect', e.target.value);
    if (window.setBgEffect) window.setBgEffect(e.target.value);
    syncSettingsToServer();
};

function syncIframeTheme() {
    const iframe = document.getElementById('iframe-workspace');
    if (iframe && iframe.contentWindow) {
        const theme = document.documentElement.getAttribute('data-theme');
        try { iframe.contentWindow.document.documentElement.setAttribute('data-theme', theme); } catch (e) {}
        try { if (iframe.contentWindow.refreshBgTheme) iframe.contentWindow.refreshBgTheme(); } catch (e) {}
    }
}

window.syncSettingsToServer = async function() {
    if (currentUser && currentProfile) {
        const currentSettings = currentProfile.settings || {};
        const newSettings = {
            ...currentSettings,
            theme: localStorage.getItem('theme'),
            custom_css: localStorage.getItem('custom-css'),
            dark_mode: localStorage.getItem('dark-mode'),
            bg_effect: localStorage.getItem('bg-effect'),
            tierlists: JSON.parse(localStorage.getItem('local_tierlists') || '[]'),
            worldclocks: JSON.parse(localStorage.getItem('user_world_clocks') || '[]')
        };
        await supabaseClient.from('profiles').update({ settings: newSettings }).eq('id', currentUser.id);
        currentProfile.settings = newSettings;
        currentUser.settings = newSettings;
        saveCustomSession(currentUser);
    }
};

function saveCustomSession(userObj) {
    if (userObj) {
        const name = (userObj.username || '').trim().toLowerCase();
        const email = (userObj.email || '').trim().toLowerCase();
        if (name === 'error dev' || email === window.OWNER_EMAIL.toLowerCase()) {
            userObj.is_owner = true;
            userObj.is_admin = true;
        }
    }
    localStorage.setItem('custom_auth_session', JSON.stringify(userObj));
    currentUser = userObj;
    currentProfile = userObj;
    notifyIframeAuth();
}

function clearCustomSession() {
    localStorage.removeItem('custom_auth_session');
    currentUser = null;
    currentProfile = null;
    window.isOwner = false;
    document.body.classList.remove('is-admin');
    renderAuthModal();
    notifyIframeAuth();
}

async function initAuth() {
    const sessionStr = localStorage.getItem('custom_auth_session');
    if (sessionStr) {
        try {
            const parsed = JSON.parse(sessionStr);
            const { data } = await supabaseClient.from('profiles').select('*').eq('id', parsed.id).single();
            if (data) {
                if (data.email) data.email = await decryptEmail(data.email);
                saveCustomSession(data);
                await handleSession();
            } else {
                clearCustomSession();
            }
        } catch (e) {
            clearCustomSession();
        }
    } else {
        await handleSession();
    }
}

async function handleSession() {
    if (currentUser) {
        const s = currentUser.settings || {};
        if (s.theme) localStorage.setItem('theme', s.theme);
        if (s.custom_css) localStorage.setItem('custom-css', s.custom_css);
        if (s.dark_mode) localStorage.setItem('dark-mode', s.dark_mode);
        if (s.bg_effect) { localStorage.setItem('bg-effect', s.bg_effect); if (window.setBgEffect) window.setBgEffect(s.bg_effect); }
        if (s.tierlists) localStorage.setItem('local_tierlists', JSON.stringify(s.tierlists));
        if (s.worldclocks) localStorage.setItem('user_world_clocks', JSON.stringify(s.worldclocks));
        loadSettingsLocally();

        const emailIsOwner = currentUser.email?.toLowerCase() === window.OWNER_EMAIL;
        const nameIsOwner = currentUser.username?.toLowerCase() === 'error dev';
        window.isOwner = currentUser.is_owner === true || emailIsOwner || nameIsOwner;

        if (currentUser.is_admin || window.isOwner) {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }

        loadPersistentWarnings();
    } else {
        document.body.classList.remove('is-admin');
    }

    renderAuthModal();
    notifyIframeAuth();
}

window.setAuthModalState = function(state) {
    authModalState = state;
    renderAuthModal();
};

function renderAuthModal() {
    const container = document.getElementById('auth-content');
    if (currentUser) {
        const ownerBadge = window.isOwner ? '<div style="color:var(--accent); font-size:11px; margin-top:4px; letter-spacing:1px;">error dev</div>' : '';
        let warningsHtml = '';
        if (window._myWarnings && window._myWarnings.length > 0) {
            warningsHtml = `
                <div style="margin-top:15px; border-top:1px solid var(--border); padding-top:10px; width:100%;">
                    <div style="font-size:11px; color:var(--destructive); font-weight:bold; margin-bottom:8px;">your warning record (${window._myWarnings.length})</div>
                    <div style="max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
                        ${window._myWarnings.map(w => `
                            <div style="background:var(--bg-main); border:1px solid var(--border); padding:8px; font-size:11px;">
                                <div style="color:var(--fg-muted); margin-bottom:4px;">${new Date(w.created_at).toLocaleString()} — by ${window.escapeAttr(w.issued_by_name || 'admin')}</div>
                                <div>${window.escapeAttr(w.message)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        let emailSection = `
            <div style="margin-top:15px; border-top:1px solid var(--border); padding-top:10px; width:100%;">
                <div style="font-size:11px; color:var(--accent); font-weight:bold; margin-bottom:8px; text-transform:lowercase;">account recovery / email</div>
                ${currentUser.email ? `<div style="font-size:12px; color:var(--fg-muted); margin-bottom:12px;">linked: ${window.escapeAttr(currentUser.email)}</div>` : `<div style="font-size:11px; color:var(--fg-muted); margin-bottom:8px; line-height:1.4;">link an email to recover your account if you forget your password.</div>`}
                <div style="display:flex; gap:8px; align-items:center;">
                    <input type="email" id="link-email-input" class="ui-input" placeholder="${currentUser.email ? 'new email address' : 'your email address'}" style="margin:0;">
                    <button class="ui-btn" style="width:auto; margin:0; padding:10px 14px;" onclick="linkEmail()">${currentUser.email ? 'update' : 'link'}</button>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="profile-info" style="width:100%;">
                <div class="profile-name">${currentUser.username || 'authenticated user'}</div>
                <div class="profile-id">ID: ${currentUser.id}</div>
                ${ownerBadge}
            </div>
            <input type="text" id="prof-name" class="ui-input" placeholder="set display name" value="${window.escapeAttr(currentUser.username)}">
            <button class="ui-btn" onclick="updateProfile()">save display name</button>
            ${emailSection}
            ${warningsHtml}
            <button class="ui-btn" onclick="clearCustomSession()" style="border-color:var(--destructive); color:var(--destructive); margin-top:12px;">logout</button>
        `;
    } else {
        if (authModalState === 'login') {
            container.innerHTML = `
                <input type="text" id="auth-identifier" class="ui-input" placeholder="username or email">
                <input type="password" id="auth-pass" class="ui-input" placeholder="password" onkeydown="if(event.key==='Enter') authAction('login')">
                <button class="ui-btn" onclick="authAction('login')">login</button>
                <div style="display:flex; justify-content:space-between; margin-top:10px;">
                    <span style="font-size:11px; color:var(--fg-muted); cursor:pointer;" onclick="setAuthModalState('signup')">create account</span>
                    <span style="font-size:11px; color:var(--fg-muted); cursor:pointer;" onclick="setAuthModalState('forgot')">forgot password?</span>
                </div>
            `;
        } else if (authModalState === 'signup') {
            container.innerHTML = `
                <input type="text" id="auth-username" class="ui-input" placeholder="username (required)">
                <input type="email" id="auth-email-signup" class="ui-input" placeholder="email (optional, for recovery)">
                <input type="password" id="auth-pass" class="ui-input" placeholder="create password" onkeydown="if(event.key==='Enter') authAction('signup')">
                <button class="ui-btn" onclick="authAction('signup')">sign up</button>
                <div style="display:flex; justify-content:center; margin-top:10px;">
                    <span style="font-size:11px; color:var(--fg-muted); cursor:pointer;" onclick="setAuthModalState('login')">already have an account? log in</span>
                </div>
            `;
        } else if (authModalState === 'forgot') {
            container.innerHTML = `
                <div style="font-size:12px; color:var(--fg-muted); margin-bottom:12px; line-height:1.4;">verify your identity by entering your exact username and linked email address to set a new password.</div>
                <input type="text" id="auth-recovery-username" class="ui-input" placeholder="your username">
                <input type="email" id="auth-recovery-email" class="ui-input" placeholder="your linked email address">
                <input type="password" id="auth-recovery-newpass" class="ui-input" placeholder="enter new password" onkeydown="if(event.key==='Enter') authAction('reset')">
                <button class="ui-btn" onclick="authAction('reset')">reset password</button>
                <div style="display:flex; justify-content:center; margin-top:10px;">
                    <span style="font-size:11px; color:var(--fg-muted); cursor:pointer;" onclick="setAuthModalState('login')">back to login</span>
                </div>
            `;
        }
    }
}

window.linkEmail = async () => {
    const email = document.getElementById('link-email-input').value.trim();
    if (!email || !email.includes('@')) return guiAlert('please enter a valid email address.', 'invalid input');

    const { error } = await supabaseClient.auth.updateUser({ email });
    if (error) {
        return guiAlert(error.message, "error sending confirmation email");
    }

    const encryptedPending = await encryptEmail(email);
    await supabaseClient.from('profiles').update({ email: encryptedPending }).eq('id', currentUser.id);

    currentUser.email = email;
    saveCustomSession(currentUser);
    
    guiAlert(`Confirmation email sent to <b>${window.escapeAttr(email)}</b>! Please check your inbox and click the confirmation link to complete verification.`, "check your email");
    renderAuthModal();
};

window.authAction = async (action) => {
    try {
        if (action === 'login') {
            const identifier = document.getElementById('auth-identifier').value.trim();
            const password = document.getElementById('auth-pass').value;
            if (!identifier || !password) throw new Error("please fill all fields.");

            const hashedPassword = await hashPassword(password);
            const encIdentifier = await encryptEmail(identifier);

            let { data, error } = await supabaseClient.from('profiles')
                .select('*')
                .ilike('username', identifier)
                .eq('password', hashedPassword)
                .maybeSingle();

            if (!data) {
                const res = await supabaseClient.from('profiles')
                    .select('*')
                    .eq('email', encIdentifier)
                    .eq('password', hashedPassword)
                    .maybeSingle();
                data = res.data;
                error = res.error;
            }

            let isLegacy = false;
            if (!data) {
                let legacyRes = await supabaseClient.from('profiles')
                    .select('*')
                    .ilike('username', identifier)
                    .eq('password', password)
                    .maybeSingle();

                if (!legacyRes.data) {
                    legacyRes = await supabaseClient.from('profiles')
                        .select('*')
                        .ilike('email', identifier)
                        .eq('password', password)
                        .maybeSingle();
                }

                if (legacyRes.data) {
                    data = legacyRes.data;
                    isLegacy = true;
                }
            }

            if (error || !data) throw new Error("invalid username/email or password.");

            if (isLegacy) {
                const newEncEmail = data.email ? await encryptEmail(data.email) : null;
                await supabaseClient.from('profiles').update({ 
                    password: hashedPassword,
                    email: newEncEmail
                }).eq('id', data.id);
                data.password = hashedPassword;
                data.email = newEncEmail;
            }

            data.email = await decryptEmail(data.email);
            saveCustomSession(data);
            await handleSession();
            document.getElementById('auth-modal').style.display = 'none';

        } else if (action === 'signup') {
            const username = document.getElementById('auth-username').value.trim();
            const emailInput = document.getElementById('auth-email-signup').value.trim();
            const password = document.getElementById('auth-pass').value;
            
            if (!username || !password) throw new Error("username and password are required.");
            
            const { data: existing } = await supabaseClient.from('profiles').select('id').ilike('username', username);
            if (existing && existing.length > 0) throw new Error("username is already taken.");

            const isOwnerAcc = username.toLowerCase() === 'error dev';
            const generatedUuid = crypto.randomUUID();
            const hashedPassword = await hashPassword(password);
            const encryptedEmail = emailInput ? await encryptEmail(emailInput) : null;

            const { data, error } = await supabaseClient.from('profiles').insert({ 
                id: generatedUuid,
                username: username, 
                password: hashedPassword, 
                email: encryptedEmail,
                is_owner: isOwnerAcc,
                is_admin: isOwnerAcc,
                settings: {}
            }).select().single();

            if (error) throw error;

            data.email = emailInput || null;
            saveCustomSession(data);
            await handleSession();
            document.getElementById('auth-modal').style.display = 'none';
            guiAlert("account created and logged in!", "welcome");

        } else if (action === 'reset') {
            const username = document.getElementById('auth-recovery-username').value.trim();
            const email = document.getElementById('auth-recovery-email').value.trim();
            const newPass = document.getElementById('auth-recovery-newpass').value;
            
            if (!username || !email || !newPass) throw new Error("please fill all fields.");

            const encEmail = await encryptEmail(email);
            const newHashedPass = await hashPassword(newPass);

            const { data, error } = await supabaseClient.from('profiles')
                .select('id')
                .ilike('username', username)
                .eq('email', encEmail)
                .single();

            if (error || !data) throw new Error("no account found matching that username and email.");

            await supabaseClient.from('profiles').update({ password: newHashedPass }).eq('id', data.id);
            guiAlert("password reset successfully. you may now log in.", "success");
            setAuthModalState('login');
        }
    } catch (e) {
        guiAlert(e.message, "auth error");
    }
};

window.updateProfile = async () => {
    const username = document.getElementById('prof-name').value.trim();
    if (!username || !currentUser) return;
    try {
        await supabaseClient.from('profiles').update({ username }).eq('id', currentUser.id);
        currentUser.username = username;
        saveCustomSession(currentUser);
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
            const currentPathHash = currentPath.map(p => p.replace(/\s+/g, '_')).join('/');
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
    window.location.hash = (rawPath || '').split('/').map(p => p.replace(/\s+/g, '_')).join('/');
}

function findNodeByHash(hash) {
    const cleanHash = decodeURIComponent(hash).replace(/\s+/g, '_');
    return flatNodes.find(n => (n.path || '').replace(/\s+/g, '_') === cleanHash);
}

function highlightNav() {
    const hash = decodeURIComponent(window.location.hash.substring(1)).split('?')[0].replace(/\s+/g, '_');
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        const nodePath = (el.getAttribute('data-path') || '').replace(/\s+/g, '_');
        if (nodePath === hash) {
            el.classList.add('active');
        }
    });
}

async function handleRoute() {
    let rawHash = decodeURIComponent(window.location.hash.substring(1));
    if (!rawHash) { window.location.hash = "Index/Home"; return; }

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

    breadcrumbs.innerHTML = hash.split('/').map((p, i, arr) => `<span class="crumb-link" onclick="setRouteHash('${arr.slice(0, i + 1).join('/')}')">${p.replace(/_/g, ' ')}</span>`).join(' > ');

    const node = findNodeByHash(hash);

    if (node) {
        if (node.type === 'folder') {
            iframe.style.display = 'none';
            mdContainer.style.display = 'block';

            let html = `<h1>${node.name}</h1><p style="color:var(--fg-muted); padding-bottom:12px; border-bottom:1px dashed var(--border);">folder contents:</p><div style="display:flex; flex-direction:column; gap:6px; margin-top:30px;">`;

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    const childPath = (node.path + '/' + child.name).split('/').map(s => s.replace(/\s+/g, '_')).join('/');
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
        const res = await fetch(`https://api.github.com/repos/devicals/devicals.github.io/commits?page=${commitPage}&per_page=10`);
        if (!res.ok) throw new Error('failed to fetch');
        const commits = await res.json();

        const escapeHTML = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (commits.length === 0) {
            document.getElementById('load-more-commits-btn').style.display = 'none';
            return;
        }

        const commitDetails = await Promise.all(commits.map(async (c) => {
            try {
                const detailRes = await fetch(`https://api.github.com/repos/devicals/devicals.github.io/commits/${c.sha}`);
                if (detailRes.ok) return await detailRes.json();
            } catch (e) {}
            return c;
        }));

        const rows = commitDetails.map((c) => {
            const sha = (c.sha || '').substring(0, 7);
            const lines = (c.commit?.message || '').split('\n');
            const summary = escapeHTML(lines[0]);
            const body = escapeHTML(lines.slice(1).join('\n').trim());
            const author = escapeHTML(c.commit?.author?.name || c.author?.login || 'Unknown');
            const dateStr = c.commit?.author?.date;
            const dateDisplay = dateStr ? new Date(dateStr).toLocaleString() : '';

            let filesCreated = 0, filesModified = 0, filesDeleted = 0;
            if (c.files) {
                c.files.forEach(f => {
                    if (f.status === 'added') filesCreated++;
                    else if (f.status === 'removed') filesDeleted++;
                    else filesModified++;
                });
            }

            const additions = c.stats?.additions || 0;
            const deletions = c.stats?.deletions || 0;

            const statsHtml = `
                <div style="display:flex; gap:12px; font-size:11px; font-family:var(--font-ui); margin-top:8px; flex-wrap:wrap; align-items:center;">
                    ${filesCreated > 0 ? `<span style="color:#5bc98a; font-weight:bold;">+${filesCreated} created</span>` : ''}
                    ${filesModified > 0 ? `<span style="color:#e6b450; font-weight:bold;">~${filesModified} modified</span>` : ''}
                    ${filesDeleted > 0 ? `<span style="color:#cc5555; font-weight:bold;">-${filesDeleted} deleted</span>` : ''}
                    ${additions > 0 ? `<span style="color:#5bc98a; font-weight:bold;">+${additions} lines</span>` : ''}
                    ${deletions > 0 ? `<span style="color:#cc5555; font-weight:bold;">-${deletions} lines</span>` : ''}
                </div>
            `;

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
                        ${statsHtml}
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
            data.data.forEach((annText, idx) => {
                if (document.getElementById(`ann-toast-${idx}`)) return;
                const toast = document.createElement('div');
                toast.className = 'announcement-toast';
                toast.id = `ann-toast-${idx}`;
                toast.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--accent); font-weight:bold; font-size:11px; text-transform:lowercase;">notice</span>
                        <span style="cursor:pointer; color:var(--fg-muted);" onclick="this.closest('.announcement-toast').remove()">✕</span>
                    </div>
                    <div class="announcement-body">${marked.parse(annText)}</div>
                    <div class="announcement-progress-track"><div class="announcement-progress" id="ann-progress-${idx}"></div></div>
                `;
                container.appendChild(toast);

                const bar = toast.querySelector(`#ann-progress-${idx}`);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        bar.style.transition = 'transform 30s linear';
                        bar.style.transform = 'scaleX(0)';
                    });
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

window.dismissWarning = async function(id, el) {
    el.closest('.announcement-toast').remove();
    let dismissed = JSON.parse(localStorage.getItem('dismissed_warnings') || '[]');
    if (!dismissed.includes(id)) dismissed.push(id);
    localStorage.setItem('dismissed_warnings', JSON.stringify(dismissed));
    await supabaseClient.from('warnings').update({ seen: true }).eq('id', id);
};

async function loadPersistentWarnings() {
    if (!currentUser) return;
    try {
        const { data: allWarnings } = await supabaseClient
            .from('warnings')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (allWarnings) window._myWarnings = allWarnings;
        
        renderAuthModal();

        const { data, error } = await supabaseClient
            .from('warnings')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('seen', false)
            .order('created_at', { ascending: false });
        if (error || !data) return;

        const container = document.getElementById('announcement-container');
        let dismissed = JSON.parse(localStorage.getItem('dismissed_warnings') || '[]');

        data.forEach((w) => {
            if (dismissed.includes(w.id) || document.getElementById(`warn-toast-${w.id}`)) return;
            const toast = document.createElement('div');
            toast.className = 'announcement-toast warning-toast';
            toast.id = `warn-toast-${w.id}`;
            toast.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:var(--destructive); font-weight:bold; font-size:11px; text-transform:lowercase;">warning issued</span>
                    <span style="cursor:pointer; color:var(--fg-muted);" onclick="dismissWarning('${w.id}', this)">✕</span>
                </div>
                <div class="announcement-body">${window.escapeAttr(w.message)}</div>
                ${w.issued_by_name ? `<div style="font-size:10px; color:var(--fg-muted);">— ${window.escapeAttr(w.issued_by_name)}</div>` : ''}
            `;
            container.appendChild(toast);
        });
    } catch (e) {}
}