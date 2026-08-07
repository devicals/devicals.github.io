window.renderAdminPage = async function() {
    const container = document.getElementById('page-content');
    container.innerHTML = `
        <h1 style="margin-bottom:30px;">Admin Dashboard</h1>
        
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:40px; border-bottom:1px solid var(--border); padding-bottom:20px;">
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('blogs')">Manage Blogs</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('projects')">Manage Projects</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('downloads')">Manage Downloads</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('games')">Manage Liked Games</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('users')">User Management</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('anns')">Announcements</button>
        </div>

        <div id="admin-section-content"></div>
    `;
    renderAdminSection('blogs');
};

window.renderAdminSection = async function(section) {
    const view = document.getElementById('admin-section-content');
    view.innerHTML = '<span style="color:var(--fg-muted);">Loading...</span>';

    if (section === 'users') {
        try {
            const { data, error } = await supabaseClient.rpc('admin_get_users');
            let users = data;
            
            // Fallback if RPC fails or doesn't exist
            if (error || !data) {
                const fallback = await supabaseClient.from('profiles').select('*');
                if(fallback.error) throw fallback.error;
                users = fallback.data;
            }

            const active = users.filter(u => !u.is_banned);
            const banned = users.filter(u => u.is_banned);

            const renderRow = (u) => `
                <div class="admin-user-card" style="padding:20px; border:1px solid var(--border); margin-bottom:16px;">
                    <div class="admin-user-card-header">
                        <div>
                            <strong style="color:var(--accent); font-size:16px;">${u.username || 'Unnamed'}</strong> 
                            <span style="color:var(--fg-muted); margin-left:8px;">(ID: ${u.id})</span>
                            ${u.is_admin ? '<span class="user-tag admin">ADMIN</span>' : ''}
                            ${u.is_banned ? '<span class="user-tag banned">BANNED</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                        <button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', '${u.is_admin ? 'demote' : 'promote'}')">${u.is_admin ? 'Demote' : 'Make Admin'}</button>
                        ${u.is_banned 
                            ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', 'unban')">Unban</button>` 
                            : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'ban')">Ban</button>`
                        }
                        <button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'delete')">Kick / Delete</button>
                    </div>
                </div>
            `;

            view.innerHTML = `
                <h2 style="margin-bottom:20px;">Active Users (${active.length})</h2>
                ${active.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:13px;">No active users.</p>'}
                <h2 style="margin-top:40px; margin-bottom:20px;">Banned Users (${banned.length})</h2>
                ${banned.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:13px;">No banned users.</p>'}
            `;
        } catch (e) {
            view.innerHTML = `<p style="color:var(--destructive)">Database connection error: ${e.message}</p>`;
        }
    } else if (section === 'anns') {
        view.innerHTML = `
            <h2 style="margin-bottom:20px;">Announcements</h2>
            <div class="settings-group" style="margin-bottom:40px;">
                <textarea id="admin-ann-text" class="ui-input" rows="4" placeholder="New announcement text..."></textarea>
                <button class="ui-btn" style="width:auto;" onclick="postAdminAnnouncement()">Post Announcement</button>
            </div>
            <div id="admin-ann-list" class="flat-list-container">Loading...</div>
        `;
        loadAdminAnnouncements();
    } else if (section === 'blogs') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
        let list = data?.data || [];
        
        view.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0;">Manage Blogs</h2>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminEditBlog(-1)">+ New Blog</button>
            </div>
            <div class="flat-list-container">
                ${list.map((b, i) => `
                    <div class="flat-list-item" style="flex-direction:row; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${b.title}</div>
                            <div style="color:var(--fg-muted); font-size:12px;">ID: ${b.id} | Date: ${b.date}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminEditBlog(${i})">Edit</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteEntry('blogs', ${i})">Delete</button>
                        </div>
                    </div>
                `).join('') || '<p>No blogs found.</p>'}
            </div>
        `;
    } else if (section === 'projects') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
        let tabs = data?.data?.tabs || {};
        
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0;">Manage Projects</h2>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminAddProjectTab()">+ New Tab</button>
            </div>
        `;

        Object.keys(tabs).forEach(tabKey => {
            let projs = tabs[tabKey].projects || [];
            html += `
                <div style="margin-bottom:40px; border:1px solid var(--border); padding:20px; background:var(--bg-hover);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                        <h3 style="margin:0;">Tab: ${tabs[tabKey].display}</h3>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAddProject('${tabKey}')">+ Add Project</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteProjectTab('${tabKey}')">Delete Tab</button>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${projs.map((p, i) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--border); padding-bottom:12px;">
                                <span>${p.name}</span>
                                <div style="display:flex; gap:10px;">
                                    <button class="ui-btn" style="width:auto; margin:0; padding:4px 8px; font-size:11px;" onclick="adminEditProject('${tabKey}', ${i})">Edit</button>
                                    <button class="ui-btn" style="width:auto; margin:0; padding:4px 8px; font-size:11px; color:var(--destructive);" onclick="adminDeleteProject('${tabKey}', ${i})">Delete</button>
                                </div>
                            </div>
                        `).join('') || '<span style="color:var(--fg-muted);">No projects in this tab.</span>'}
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
                <h2 style="margin:0;">Manage Downloads</h2>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminEditDownload(-1)">+ New Download</button>
            </div>
            <div class="flat-list-container">
                ${list.map((d, i) => `
                    <div class="flat-list-item" style="flex-direction:row; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${d.name}</div>
                            <div style="color:var(--fg-muted); font-size:12px;">URL: ${d.url}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminEditDownload(${i})">Edit</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteEntry('downloads', ${i})">Delete</button>
                        </div>
                    </div>
                `).join('') || '<p>No downloads found.</p>'}
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
        `).join('') || '<span style="color:var(--fg-muted);">Empty list.</span>';

        view.innerHTML = `
            <h2 style="margin-bottom:20px;">Manage Liked Games</h2>
            
            <div style="margin-bottom:40px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3>Favorites</h3>
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAddFavGame()">+ Add Favorite</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${(gData.favorites || []).map((f, i) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border); padding:12px; background:var(--bg-hover);">
                            <span><strong>${f.title}</strong></span>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteFavGame(${i})">Delete</button>
                        </div>
                    `).join('') || '<span style="color:var(--fg-muted);">No favorites.</span>'}
                </div>
            </div>

            <div style="display:flex; gap:20px;">
                <div style="flex:1; border:1px solid var(--border); padding:15px; background:var(--bg-hover);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4>Games I Like</h4>
                        <button class="ui-btn" style="width:auto; margin:0; padding:2px 8px; font-size:11px;" onclick="adminAddSimpleGame('liked')">+ Add</button>
                    </div>
                    ${renderSimpleList(gData.liked, 'liked')}
                </div>
                <div style="flex:1; border:1px solid var(--border); padding:15px; background:var(--bg-hover);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4>Want to Play</h4>
                        <button class="ui-btn" style="width:auto; margin:0; padding:2px 8px; font-size:11px;" onclick="adminAddSimpleGame('wanttoplay')">+ Add</button>
                    </div>
                    ${renderSimpleList(gData.wanttoplay, 'wanttoplay')}
                </div>
            </div>
        `;
    }
};

// ==== Blog Functions ====
window.adminEditBlog = async function(idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
    let list = data?.data || [];
    let b = idx >= 0 ? list[idx] : { title: '', content: '' };

    const title = await window.guiPrompt("Blog Title:", b.title, "Edit Blog Post");
    if (title === null) return;
    const content = await window.guiPrompt("Content (Markdown):", b.content, "Edit Blog Content");
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

window.adminDeleteEntry = async function(key, idx) {
    if(!await window.guiConfirm("Delete this entry?", "Confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', key).single();
    let list = data?.data || [];
    list.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: list }).eq('key', key);
    renderAdminSection(key);
};

// ==== Project Functions ====
window.adminAddProjectTab = async function() {
    const name = await window.guiPrompt("Tab Name:");
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    if(!pData.tabs) pData.tabs = {};
    pData.tabs[key] = { display: name, projects: [] };
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminDeleteProjectTab = async function(tabKey) {
    if(!await window.guiConfirm("Delete this entire tab and its projects?", "Confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    delete pData.tabs[tabKey];
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminAddProject = async function(tabKey) {
    const name = await window.guiPrompt("Project Name:");
    if (!name) return;
    const desc = await window.guiPrompt("Description:");
    const link = await window.guiPrompt("Link URL:", "https://");
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    if(!pData.tabs[tabKey].projects) pData.tabs[tabKey].projects = [];
    pData.tabs[tabKey].projects.push({ name, description: desc, link });
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminEditProject = async function(tabKey, idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    let proj = pData.tabs[tabKey].projects[idx];
    
    const name = await window.guiPrompt("Project Name:", proj.name);
    if (name === null) return;
    const desc = await window.guiPrompt("Description:", proj.description);
    const link = await window.guiPrompt("Link URL:", proj.link);
    
    proj.name = name;
    proj.description = desc;
    proj.link = link;
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

window.adminDeleteProject = async function(tabKey, idx) {
    if(!await window.guiConfirm("Delete this project?", "Confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
    let pData = data?.data || { tabs: {} };
    pData.tabs[tabKey].projects.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: pData }).eq('key', 'projects');
    renderAdminSection('projects');
};

// ==== Download Functions ====
window.adminEditDownload = async function(idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'downloads').single();
    let list = data?.data || [];
    let d = idx >= 0 ? list[idx] : { name: '', description: '', url: 'https://' };

    const name = await window.guiPrompt("Download Name:", d.name);
    if (name === null) return;
    const desc = await window.guiPrompt("Description:", d.description);
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

// ==== Game Functions ====
window.adminAddFavGame = async function() {
    const title = await window.guiPrompt("Favorite Game Title:");
    if (!title) return;
    const comment = await window.guiPrompt("Comment (Optional):");
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data || { favorites: [], liked: [], wanttoplay: [] };
    if(!gData.favorites) gData.favorites = [];
    gData.favorites.push({ title, comment, tags: {} });
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminDeleteFavGame = async function(idx) {
    if(!await window.guiConfirm("Delete this favorite?", "Confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data;
    gData.favorites.splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminAddSimpleGame = async function(listKey) {
    const title = await window.guiPrompt("Game Title:");
    if (!title) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data || { favorites: [], liked: [], wanttoplay: [] };
    if(!gData[listKey]) gData[listKey] = [];
    gData[listKey].push(title);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

window.adminDeleteSimpleGame = async function(listKey, idx) {
    if(!await window.guiConfirm("Delete this item?", "Confirm")) return;
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'games').single();
    let gData = data?.data;
    gData[listKey].splice(idx, 1);
    await supabaseClient.from('site_content').update({ data: gData }).eq('key', 'games');
    renderAdminSection('games');
};

// ==== User / Account actions ====
window.adminUserAction = async (id, action) => {
    let do_ban = null, do_delete = false, do_reset = false, promote = null;
    if (action === 'ban') do_ban = true;
    if (action === 'unban') do_ban = false;
    if (action === 'delete') do_delete = true;
    if (action === 'reset') do_reset = true;
    if (action === 'promote') promote = true;
    if (action === 'demote') promote = false;

    if (promote !== null) {
        await supabaseClient.from('profiles').update({ is_admin: promote }).eq('id', id);
    } else {
        await supabaseClient.rpc('admin_manage_user', { target_id: id, do_ban, do_delete, do_reset_pass: do_reset });
    }
    renderAdminSection('users');
};

// ==== Announcements ====
async function loadAdminAnnouncements() {
    const list = document.getElementById('admin-ann-list');
    if (!list) return;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data && data.data.length > 0) {
            list.innerHTML = data.data.map((a, i) => `
                <div class="flat-list-item" style="flex-direction:row; justify-content:space-between; align-items:center;">
                    <span style="font-size:14px; line-height:1.6;">${a}</span>
                    <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="deleteAdminAnn(${i})">Delete</button>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<span style="color:var(--fg-muted);">No active announcements.</span>';
        }
    } catch (e) {
        list.innerHTML = '<span style="color:var(--destructive);">Failed to load announcements.</span>';
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