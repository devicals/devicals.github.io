const ADMIN_TABS = [
    { key: 'blogs', label: 'blogs' },
    { key: 'projects', label: 'projects' },
    { key: 'downloads', label: 'downloads' },
    { key: 'games', label: 'liked games' },
    { key: 'users', label: 'users' },
    { key: 'anns', label: 'announcements' }
];

window.renderAdminPage = async function () {
    const container = document.getElementById('page-content');
    container.innerHTML = `
        <div class="admin-section-title" style="margin-bottom:8px; border-bottom:none; padding-bottom:0;">admin dashboard</div>
        <div class="admin-tab-bar" id="admin-tab-bar"></div>
        <div id="admin-section-content"></div>
    `;
    renderAdminTabBar('blogs');
    renderAdminSection('blogs');
};

function renderAdminTabBar(active) {
    const bar = document.getElementById('admin-tab-bar');
    bar.innerHTML = ADMIN_TABS.map(t => `
        <button class="admin-tab-btn ${t.key === active ? 'active' : ''}" onclick="renderAdminTabBar('${t.key}'); renderAdminSection('${t.key}')">${t.label}</button>
    `).join('');
}

window.renderAdminSection = async function (section) {
    const view = document.getElementById('admin-section-content');
    view.innerHTML = '<span style="color:var(--fg-muted);">loading...</span>';

    if (section === 'users') {
        try {
            let users = [];
            const { data, error } = await supabaseClient.rpc('admin_get_users');
            if (!error && data) {
                users = data;
            } else {
                const fallback = await supabaseClient.from('profiles').select('*');
                if (fallback.error) throw fallback.error;
                users = fallback.data;
            }

            const active = users.filter(u => !u.is_banned);
            const banned = users.filter(u => u.is_banned);

            const renderRow = (u) => `
                <div class="admin-user-card">
                    <div class="admin-user-card-header">
                        <div>
                            <strong style="color:var(--accent); font-size:16px;">${u.username || 'unnamed'}</strong>
                            <span style="color:var(--fg-muted); margin-left:8px;">(ID: ${u.id})</span>
                            ${u.is_admin ? '<span class="user-tag admin">admin</span>' : ''}
                            ${u.is_banned ? '<span class="user-tag banned">banned</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                        <button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', '${u.is_admin ? 'demote' : 'promote'}')">${u.is_admin ? 'demote' : 'make admin'}</button>
                        ${u.is_banned
                            ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', 'unban')">unban</button>`
                            : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'ban')">ban</button>`
                        }
                    </div>
                </div>
            `;

            view.innerHTML = `
                <div class="admin-section-title">active users (${active.length})</div>
                ${active.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:13px;">no active users.</p>'}
                <div class="admin-section-title" style="margin-top:40px;">Banned Users (${banned.length})</div>
                ${banned.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:13px;">no banned users.</p>'}
            `;
        } catch (e) {
            view.innerHTML = `<p style="color:var(--destructive)">error fetching users: ${e.message}</p>`;
        }
    } else if (section === 'anns') {
        view.innerHTML = `
            <div class="admin-section-title">announcements</div>
            <div class="admin-card" style="margin-bottom:40px;">
                <textarea id="admin-ann-text" class="ui-input" rows="4" placeholder="new announcement text..." style="margin-bottom:12px;"></textarea>
                <button class="ui-btn" style="width:auto;" onclick="postAdminAnnouncement()">post announcement</button>
            </div>
            <div id="admin-ann-list" class="flat-list-container">loading...</div>
        `;
        loadAdminAnnouncements();
    } else if (section === 'blogs') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
        let list = data?.data || [];

        view.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="admin-section-title" style="margin:0; border:none; padding:0;">manage blogs</div>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminEditBlog(-1)">+ new blog</button>
            </div>
            <div class="flat-list-container">
                ${list.map((b, i) => `
                    <div class="admin-card admin-card-row">
                        <div>
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${b.title}</div>
                            <div style="color:var(--fg-muted); font-size:12px;">id: #${b.id} | date: ${b.date}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminEditBlog(${i})">edit</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteEntry('blogs', ${i})">delete</button>
                        </div>
                    </div>
                `).join('') || '<p>no blogs found.</p>'}
            </div>
        `;
    } else if (section === 'projects') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
        let tabs = data?.data?.tabs || {};

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="admin-section-title" style="margin:0; border:none; padding:0;">manage projects</div>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminAddProjectTab()">+ new tab</button>
            </div>
        `;

        Object.keys(tabs).forEach(tabKey => {
            let projs = tabs[tabKey].projects || [];
            html += `
                <div class="admin-card" style="margin-bottom:24px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <h3 style="margin:0; color:var(--fg-main); font-weight:400;">Tab: ${tabs[tabKey].display}</h3>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAddProject('${tabKey}')">+ add project</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteProjectTab('${tabKey}')">delete tab</button>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${projs.map((p, i) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--border); padding-bottom:12px;">
                                <span>${p.name}</span>
                                <div style="display:flex; gap:10px;">
                                    <button class="ui-btn" style="width:auto; margin:0; padding:4px 8px; font-size:11px;" onclick="adminEditProject('${tabKey}', ${i})">edit</button>
                                    <button class="ui-btn" style="width:auto; margin:0; padding:4px 8px; font-size:11px; color:var(--destructive);" onclick="adminDeleteProject('${tabKey}', ${i})">delete</button>
                                </div>
                            </div>
                        `).join('') || '<span style="color:var(--fg-muted);">no projects in this tab.</span>'}
                    </div>
                </div>
            `;
        });
        view.innerHTML = html;
    } else if (section === 'downloads') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'downloads').single();
        let list = data?.data || [];

        view.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="admin-section-title" style="margin:0; border:none; padding:0;">manage downloads</div>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminEditDownload(-1)">+ new download</button>
            </div>
            <div class="flat-list-container">
                ${list.map((d, i) => `
                    <div class="admin-card admin-card-row">
                        <div>
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${d.name}</div>
                            <div style="color:var(--fg-muted); font-size:12px;">URL: ${d.url}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminEditDownload(${i})">edit</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteEntry('downloads', ${i})">delete</button>
                        </div>
                    </div>
                `).join('') || '<p>no downloads found.</p>'}
            </div>
        `;
    } else if (section === 'games') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
        let gData = data?.data || { favorites: [], liked: [], wanttoplay: [] };

        const renderSimpleList = (arr, key) => arr.map((item, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--border); padding:8px 0;">
                <span>${item}</span>
                <button class="ui-btn" style="width:auto; margin:0; padding:2px 8px; font-size:10px; color:var(--destructive);" onclick="adminDeleteSimpleGame('${key}', ${i})">✕</button>
            </div>
        `).join('') || '<span style="color:var(--fg-muted);">empty list.</span>';

        view.innerHTML = `
            <div class="admin-section-title">manage liked games</div>

            <div class="admin-card" style="margin-bottom:24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="font-weight:400;">favorites</h3>
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAddFavGame()">+ add favorite</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${(gData.favorites || []).map((f, i) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border); padding:12px; background:var(--bg-main);">
                            <span><strong>${f.title}</strong></span>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteFavGame(${i})">delete</button>
                        </div>
                    `).join('') || '<span style="color:var(--fg-muted);">no favorites.</span>'}
                </div>
            </div>

            <div style="display:flex; gap:20px;">
                <div class="admin-card" style="flex:1; margin-bottom:0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4 style="font-weight:400;">games i like</h4>
                        <button class="ui-btn" style="width:auto; margin:0; padding:2px 8px; font-size:11px;" onclick="adminAddSimpleGame('liked')">+ add</button>
                    </div>
                    ${renderSimpleList(gData.liked, 'liked')}
                </div>
                <div class="admin-card" style="flex:1; margin-bottom:0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4 style="font-weight:400;">want to play</h4>
                        <button class="ui-btn" style="width:auto; margin:0; padding:2px 8px; font-size:11px;" onclick="adminAddSimpleGame('wanttoplay')">+ add</button>
                    </div>
                    ${renderSimpleList(gData.wanttoplay, 'wanttoplay')}
                </div>
            </div>
        `;
    }
};

window.adminEditBlog = async function (idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
    let list = data?.data || [];
    let b = idx >= 0 ? list[idx] : { title: '', content: '' };

    const title = await window.guiPrompt("blog title:", b.title, "edit blog post");
    if (title === null) return;
    const content = await window.guiPrompt("content (markdown):", b.content, "edit blog content");
    if (content === null) return;

    if (idx >= 0) {
        list[idx].title = title;
        list[idx].content = content;
    } else {
        const nextId = list.length > 0 ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        list.unshift({ id: nextId, date: dateStr, title, content });
    }
    await supabaseClient.from('site_content').update({ data: list }).eq('key', 'blogs');
    renderAdminSection('blogs');
};

window.adminDeleteEntry = async function (key, idx) {
    if (!await window.guiConfirm("delete this entry?", "Confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', key).single();
    let list = data?.data || [];
    list.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: list }).eq('key', key);
    renderAdminSection(key);
};

window.adminAddProjectTab = async function () {
    const name = await window.guiPrompt("tab name:");
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    if (!pData.tabs) pData.tabs = {};
    pData.tabs[key] = { display: name, projects: [] };
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminDeleteProjectTab = async function (tabKey) {
    if (!await window.guiConfirm("delete this entire tab and its projects?", "confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    delete pData.tabs[tabKey];
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminAddProject = async function (tabKey) {
    const name = await window.guiPrompt("project Name:");
    if (!name) return;
    const desc = await window.guiPrompt("description:");
    const link = await window.guiPrompt("link URL:", "https://");
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    if (!pData.tabs[tabKey].projects) pData.tabs[tabKey].projects = [];
    pData.tabs[tabKey].projects.push({ name, description: desc, link });
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminEditProject = async function (tabKey, idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    let proj = pData.tabs[tabKey].projects[idx];

    const name = await window.guiPrompt("project name:", proj.name);
    if (name === null) return;
    const desc = await window.guiPrompt("description:", proj.description);
    const link = await window.guiPrompt("link URL:", proj.link);

    proj.name = name;
    proj.description = desc;
    proj.link = link;
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminDeleteProject = async function (tabKey, idx) {
    if (!await window.guiConfirm("delete this project?", "confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    pData.tabs[tabKey].projects.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminEditDownload = async function (idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'downloads').single();
    let list = data?.data || [];
    let d = idx >= 0 ? list[idx] : { name: '', description: '', url: 'https://' };

    const name = await window.guiPrompt("download name:", d.name);
    if (name === null) return;
    const desc = await window.guiPrompt("description:", d.description);
    const url = await window.guiPrompt("URL:", d.url);

    if (idx >= 0) {
        list[idx].name = name; list[idx].description = desc; list[idx].url = url;
    } else {
        const nextId = list.length > 0 ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
        list.push({ id: nextId, name, description: desc, url });
    }
    await supabaseClient.from('site_content').update({ data: list }).eq('key', 'downloads');
    renderAdminSection('downloads');
};

window.adminAddFavGame = async function () {
    const title = await window.guiPrompt("favorite game title:");
    if (!title) return;
    const comment = await window.guiPrompt("comment (optional):");
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data || { favorites: [], liked: [], wanttoplay: [] };
    if (!gData.favorites) gData.favorites = [];
    gData.favorites.push({ title, comment, tags: {} });
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminDeleteFavGame = async function (idx) {
    if (!await window.guiConfirm("delete this favorite?", "confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data;
    gData.favorites.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminAddSimpleGame = async function (listKey) {
    const title = await window.guiPrompt("game title:");
    if (!title) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data || { favorites: [], liked: [], wanttoplay: [] };
    if (!gData[listKey]) gData[listKey] = [];
    gData[listKey].push(title);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminDeleteSimpleGame = async function (listKey, idx) {
    if (!await window.guiConfirm("delete this item?", "confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data;
    gData[listKey].splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminUserAction = async (id, action) => {
    let do_ban = null, do_delete = false, promote = null;
    if (action === 'ban') do_ban = true;
    if (action === 'unban') do_ban = false;
    if (action === 'delete') do_delete = true;
    if (action === 'promote') promote = true;
    if (action === 'demote') promote = false;

    if (promote !== null) {
        await supabaseClient.from('profiles').update({ is_admin: promote }).eq('id', id);
    } else if (do_ban !== null) {
        await supabaseClient.from('profiles').update({ is_banned: do_ban }).eq('id', id);
    } else if (do_delete) {
        await supabaseClient.from('profiles').delete().eq('id', id);
    }
    renderAdminSection('users');
};

async function loadAdminAnnouncements() {
    const list = document.getElementById('admin-ann-list');
    if (!list) return;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data && data.data.length > 0) {
            list.innerHTML = data.data.map((a, i) => `
                <div class="admin-card admin-card-row">
                    <span style="font-size:14px; line-height:1.6;">${a}</span>
                    <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="deleteAdminAnn(${i})">delete</button>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<span style="color:var(--fg-muted);">no active announcements.</span>';
        }
    } catch (e) {
        list.innerHTML = '<span style="color:var(--destructive);">failed to load announcements.</span>';
    }
}

window.postAdminAnnouncement = async () => {
    const text = document.getElementById('admin-ann-text').value.trim();
    if (!text) return;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        const anns = data?.data || [];
        anns.push(text);
        await supabaseClient.from('site_content').update({ data: anns }).eq('key', 'announcements');
        document.getElementById('admin-ann-text').value = '';
        loadAdminAnnouncements();
    } catch (e) {}
};

window.deleteAdminAnn = async (idx) => {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        const anns = data?.data || [];
        anns.splice(idx, 1);
        await supabaseClient.from('site_content').update({ data: anns }).eq('key', 'announcements');
        loadAdminAnnouncements();
    } catch (e) {}
};