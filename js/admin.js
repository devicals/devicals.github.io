function getAdminTabs() {
    const tabs = [
        { key: 'blogs', label: 'blogs' },
        { key: 'projects', label: 'projects' },
        { key: 'downloads', label: 'downloads' }
    ];
    if (window.isOwner) tabs.push({ key: 'games', label: 'liked games' });
    tabs.push({ key: 'users', label: 'users' });
    tabs.push({ key: 'anns', label: 'announcements' });
    return tabs;
}

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
    bar.innerHTML = getAdminTabs().map(t => `
        <button class="admin-tab-btn ${t.key === active ? 'active' : ''}" onclick="renderAdminTabBar('${t.key}'); renderAdminSection('${t.key}')">${t.label}</button>
    `).join('');
}

window.renderAdminSection = async function (section) {
    const view = document.getElementById('admin-section-content');
    view.innerHTML = '<span style="color:var(--fg-muted);">loading...</span>';

    if (section === 'games' && !window.isOwner) {
        view.innerHTML = `<div class="admin-only-note">liked games is only editable by error dev.</div>`;
        return;
    }

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

            const { data: warningsData } = await supabaseClient.from('warnings').select('user_id');
            const warnCounts = {};
            (warningsData || []).forEach(w => { warnCounts[w.user_id] = (warnCounts[w.user_id] || 0) + 1; });
            users = users.map(u => ({ ...u, warning_count: warnCounts[u.id] || 0 }));

            const active = users.filter(u => !u.is_banned);
            const banned = users.filter(u => u.is_banned);

            const renderRow = (u) => `
                <div class="admin-user-card">
                    <div class="admin-user-card-header">
                        <div>
                            <strong style="color:var(--accent); font-size:16px;">${u.username || 'unnamed'}</strong>
                            <span style="color:var(--fg-muted); margin-left:8px;">(ID: ${u.id})</span>
                            ${u.is_owner ? '<span class="user-tag admin" style="border-color:var(--accent); color:var(--accent);">error dev</span>' : (u.is_admin ? '<span class="user-tag admin">admin</span>' : '')}
                            ${u.is_banned ? '<span class="user-tag banned">banned</span>' : ''}
                            ${u.warning_count ? `<span class="user-tag" style="border-color:var(--destructive); color:var(--destructive);">${u.warning_count} warning${u.warning_count > 1 ? 's' : ''}</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                        <button class="ui-btn" style="width:auto; margin:0;" onclick="adminWarnUser('${u.id}', '${(u.username || 'unnamed').replace(/'/g, "\\'")}')">warn</button>
                        ${u.warning_count ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminViewWarnings('${u.id}')">view record</button>` : ''}
                        ${window.isOwner ? `
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', '${u.is_admin ? 'demote' : 'promote'}')">${u.is_admin ? 'demote' : 'make admin'}</button>
                            ${u.is_banned
                                ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', 'unban')">unban</button>`
                                : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'ban')">ban</button>`
                            }
                        ` : ''}
                    </div>
                </div>
            `;

            view.innerHTML = `
                ${!window.isOwner ? '<div class="admin-only-note">promoting, demoting, and banning users is restricted to error dev. you can still issue warnings.</div>' : ''}
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
        const authorMap = await window.resolveAuthorsMap(list.map(b => b.author_id));

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
                            <div style="color:var(--fg-muted); font-size:12px; display:flex; align-items:center; flex-wrap:wrap;">id: #${b.id} | date: ${b.date} ${window.authorTagHTML(authorMap[b.author_id])}</div>
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

        const allAuthorIds = [];
        Object.values(tabs).forEach(t => (t.projects || []).forEach(p => allAuthorIds.push(p.author_id)));
        const authorMap = await window.resolveAuthorsMap(allAuthorIds);

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
                                <span>${p.name} <span style="color:var(--fg-muted); font-size:11px;">#${p.id || ''}</span> ${window.authorTagHTML(authorMap[p.author_id])}</span>
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
        const authorMap = await window.resolveAuthorsMap(list.map(d => d.author_id));

        view.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="admin-section-title" style="margin:0; border:none; padding:0;">manage downloads</div>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminEditDownload(-1)">+ new download</button>
            </div>
            <div class="flat-list-container">
                ${list.map((d, i) => `
                    <div class="admin-card admin-card-row">
                        <div>
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${d.name} <span style="color:var(--fg-muted); font-size:11px;">#${d.id || ''}</span> ${window.authorTagHTML(authorMap[d.author_id])}</div>
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

    const result = await window.guiForm([
        { key: 'title', label: 'blog title', value: b.title },
        { key: 'content', label: 'content (markdown, multi-line supported)', type: 'textarea', rows: 10, value: b.content }
    ], idx >= 0 ? 'edit blog post' : 'new blog post');
    if (!result || !result.title) return;

    if (idx >= 0) {
        list[idx].title = result.title;
        list[idx].content = result.content;
    } else {
        const nextId = list.length > 0 ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        list.unshift({ id: nextId, date: dateStr, title: result.title, content: result.content, author_id: currentUser?.id || null });
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
    const result = await window.guiForm([
        { key: 'name', label: 'project name' },
        { key: 'description', label: 'description', type: 'textarea', rows: 4 },
        { key: 'link', label: 'link URL', value: 'https://' }
    ], 'new project');
    if (!result || !result.name) return;

    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    if (!pData.tabs[tabKey].projects) pData.tabs[tabKey].projects = [];
    const nextId = Date.now();
    pData.tabs[tabKey].projects.push({ id: nextId, name: result.name, description: result.description, link: result.link, author_id: currentUser?.id || null });
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminEditProject = async function (tabKey, idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    let proj = pData.tabs[tabKey].projects[idx];

    const result = await window.guiForm([
        { key: 'name', label: 'project name', value: proj.name },
        { key: 'description', label: 'description', type: 'textarea', rows: 4, value: proj.description },
        { key: 'link', label: 'link URL', value: proj.link }
    ], 'edit project');
    if (!result) return;

    proj.name = result.name;
    proj.description = result.description;
    proj.link = result.link;
    if (!proj.id) proj.id = Date.now();
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

    const result = await window.guiForm([
        { key: 'name', label: 'download name', value: d.name },
        { key: 'description', label: 'description', type: 'textarea', rows: 4, value: d.description },
        { key: 'url', label: 'URL', value: d.url }
    ], idx >= 0 ? 'edit download' : 'new download');
    if (!result || !result.name) return;

    if (idx >= 0) {
        list[idx].name = result.name; list[idx].description = result.description; list[idx].url = result.url;
    } else {
        const nextId = list.length > 0 ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
        list.push({ id: nextId, name: result.name, description: result.description, url: result.url, author_id: currentUser?.id || null });
    }
    await supabaseClient.from('site_content').update({ data: list }).eq('key', 'downloads');
    renderAdminSection('downloads');
};

window.adminAddFavGame = async function () {
    if (!window.isOwner) return;
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
    if (!window.isOwner) return;
    if (!await window.guiConfirm("delete this favorite?", "confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data;
    gData.favorites.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminAddSimpleGame = async function (listKey) {
    if (!window.isOwner) return;
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
    if (!window.isOwner) return;
    if (!await window.guiConfirm("delete this item?", "confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data;
    gData[listKey].splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminUserAction = async (id, action) => {
    if (!window.isOwner) return;
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

window.adminWarnUser = async function (userId, username) {
    const result = await window.guiForm([
        { key: 'message', label: `warning message for ${username || 'this user'}`, type: 'textarea', rows: 4, placeholder: 'explain why this user is being warned...' }
    ], 'issue warning');
    if (!result || !result.message || !result.message.trim()) return;

    const issuerName = window.isOwner ? 'error dev' : (currentProfile?.username || 'admin');
    await supabaseClient.from('warnings').insert({
        user_id: userId,
        message: result.message.trim(),
        issued_by: currentUser?.id || null,
        issued_by_name: issuerName,
        seen: false
    });
    guiAlert('warning issued. it will appear as a notice next time this user visits the site, and is saved to their record.', 'done');
    renderAdminSection('users');
};

window.adminViewWarnings = async function (userId) {
    const { data } = await supabaseClient.from('warnings').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!data || !data.length) { guiAlert('no warnings on record.', 'warning record'); return; }
    const text = data.map(w => `${new Date(w.created_at).toLocaleString()} — issued by ${w.issued_by_name || 'admin'}\n${w.message}`).join('\n\n');
    guiAlert(text, 'warning record');
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