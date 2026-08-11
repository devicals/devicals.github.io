function getAdminTabs() {
    const tabs = [
        { key: 'blogs', label: 'blogs' }
    ];
    if (window.isOwner) {
        tabs.push({ key: 'projects', label: 'projects' });
        tabs.push({ key: 'downloads', label: 'downloads' });
        tabs.push({ key: 'games', label: 'liked games' });
    }
    tabs.push({ key: 'users', label: 'users' });
    tabs.push({ key: 'anns', label: 'announcements' });
    tabs.push({ key: 'chat', label: 'admin chat', align: 'right' });
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
        <button class="admin-tab-btn ${t.key === active ? 'active' : ''}" style="${t.align === 'right' ? 'margin-left:auto;' : ''}" onclick="renderAdminTabBar('${t.key}'); renderAdminSection('${t.key}')">${t.label}</button>
    `).join('');
}

window.renderAdminSection = async function (section) {
    const view = document.getElementById('admin-section-content');
    view.innerHTML = '<span style="color:var(--fg-muted);">loading...</span>';

    if ((section === 'games' || section === 'projects' || section === 'downloads') && !window.isOwner) {
        view.innerHTML = `<div class="admin-only-note">this section is restricted to error dev.</div>`;
        return;
    }

    if (section === 'chat') {
        view.innerHTML = `
            <div class="admin-section-title">admin chat</div>
            <div class="admin-card" style="display:flex; flex-direction:column; height: 500px; padding:0; overflow:hidden;">
                <div id="admin-chat-messages" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; border-bottom:1px solid var(--border);">
                    <span style="color:var(--fg-muted);">loading chat...</span>
                </div>
                <div style="padding:15px; background:var(--bg-main); display:flex; gap:10px;">
                    <input type="text" id="admin-chat-input" class="ui-input" style="margin:0; flex:1;" placeholder="message admins..." onkeydown="if(event.key==='Enter') sendAdminChat()">
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="sendAdminChat()">send</button>
                </div>
            </div>
        `;
        loadAdminChat();
        if (!window._adminChatSub) {
            window._adminChatSub = supabaseClient.channel('admin-chat-realtime')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_content', filter: 'key=eq.admin_chat' }, (payload) => {
                    if (document.getElementById('admin-chat-messages')) {
                        renderAdminChatMessages(payload.new.data || []);
                    }
                }).subscribe();
        }
    } else if (section === 'users') {
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

            const renderRow = (u) => {
                const isTargetOwner = u.is_owner === true || u.email?.toLowerCase() === window.OWNER_EMAIL;
                const canWarnThisUser = window.isOwner || (!isTargetOwner && !u.is_admin);
                return `
                    <div class="admin-user-card">
                        <div class="admin-user-card-header">
                            <div>
                                <strong style="color:var(--accent); font-size:16px;">${u.username || 'unnamed'}</strong>
                                <span style="color:var(--fg-muted); margin-left:8px;">(ID: ${u.id})</span>
                                ${isTargetOwner ? '<span class="user-tag admin" style="border-color:var(--accent); color:var(--accent);">error dev</span>' : (u.is_admin ? '<span class="user-tag admin">admin</span>' : '')}
                                ${u.is_banned ? '<span class="user-tag banned">banned</span>' : ''}
                                ${u.warning_count ? `<span class="user-tag" style="border-color:var(--destructive); color:var(--destructive);">${u.warning_count} warning${u.warning_count > 1 ? 's' : ''}</span>` : ''}
                            </div>
                        </div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                            ${canWarnThisUser ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminWarnUser('${u.id}', '${(u.username || 'unnamed').replace(/'/g, "\\'")}')">warn</button>` : ''}
                            ${u.warning_count ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminViewWarnings('${u.id}')">view record</button>` : ''}
                            ${window.isOwner && !isTargetOwner ? `
                                <button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', '${u.is_admin ? 'demote' : 'promote'}')">${u.is_admin ? 'demote' : 'make admin'}</button>
                                ${u.is_banned
                                    ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', 'unban')">unban</button>`
                                    : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'ban')">ban</button>`
                                }
                            ` : ''}
                        </div>
                    </div>
                `;
            };

            view.innerHTML = `
                ${!window.isOwner ? '<div class="admin-only-note">promoting, demoting, banning users, and warning other admins/owners is restricted to error dev.</div>' : ''}
                <div class="admin-section-title">active users (${active.length})</div>
                ${active.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:13px;">no active users.</p>'}
                <div class="admin-section-title" style="margin-top:40px;">banned users (${banned.length})</div>
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

        const visibleBlogs = list.map((b, i) => ({ ...b, originalIndex: i })).filter(b => {
            if (window.isOwner) return true;
            return b.author_id === currentUser?.id;
        });

        view.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="admin-section-title" style="margin:0; border:none; padding:0;">manage blogs</div>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--accent); color:var(--accent);" onclick="adminEditBlog(-1)">+ new blog</button>
            </div>
            <div class="flat-list-container">
                ${visibleBlogs.map((b) => `
                    <div class="admin-card admin-card-row">
                        <div>
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${b.title}</div>
                            <div style="color:var(--fg-muted); font-size:12px; display:flex; align-items:center; flex-wrap:wrap;">id: #${b.id} | date: ${b.date} ${window.authorTagHTML(authorMap[b.author_id])}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="ui-btn" style="width:auto; margin:0;" onclick="adminEditBlog(${b.originalIndex})">edit</button>
                            <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteEntry('blogs', ${b.originalIndex})">delete</button>
                        </div>
                    </div>
                `).join('') || '<p>no blogs found.</p>'}
            </div>
        `;
    } else if (section === 'projects') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'projects').single();
        let tabs = data?.data?.tabs || {};
        
        let needsUpdate = false;
        let pCounter = 1;
        Object.keys(tabs).forEach(k => {
            (tabs[k].projects || []).forEach(p => {
                if (!p.id) {
                    p.id = Date.now() + pCounter++;
                    needsUpdate = true;
                }
            });
        });
        if (needsUpdate) {
            await supabaseClient.from('site_content').update({ data: { tabs } }).eq('key', 'projects');
        }

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
                                <span>${p.name} <span style="color:var(--fg-muted); font-size:11px;">#${p.id || ''}</span></span>
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
                            <div style="font-weight:bold; color:var(--accent); font-size:16px;">${d.name} <span style="color:var(--fg-muted); font-size:11px;">#${d.id || ''}</span></div>
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

let adminChatList = [];

window.loadAdminChat = async function() {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'admin_chat').single();
        if (data && data.data) {
            adminChatList = data.data;
        } else {
            adminChatList = [];
        }
        renderAdminChatMessages(adminChatList);
    } catch (e) {
        document.getElementById('admin-chat-messages').innerHTML = '<span style="color:var(--destructive);">failed to load chat. Ensure admin_chat row exists in site_content table.</span>';
    }
};

window.renderAdminChatMessages = function(messages) {
    adminChatList = messages;
    const container = document.getElementById('admin-chat-messages');
    if (!container) return;
    if (!messages || messages.length === 0) {
        container.innerHTML = '<span style="color:var(--fg-muted); font-style:italic;">no messages yet.</span>';
        return;
    }
    container.innerHTML = messages.map(m => {
        const isMe = m.author_id === currentUser?.id;
        const authorColor = m.is_owner ? 'var(--accent)' : 'var(--fg-muted)';
        return `
            <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'};">
                <div style="font-size:10px; color:${authorColor}; margin-bottom:4px; letter-spacing:0.5px;">${window.escapeAttr(m.author_name)} ${m.is_owner ? '(error dev)' : ''} &middot; ${new Date(m.timestamp).toLocaleTimeString()}</div>
                <div style="background:${isMe ? 'var(--accent)' : 'var(--bg-hover)'}; color:${isMe ? 'var(--bg-main)' : 'var(--fg-main)'}; padding:8px 12px; border:1px solid ${isMe ? 'var(--accent)' : 'var(--border)'}; border-radius:4px; max-width:80%; font-size:13px; line-height:1.4;">
                    ${window.escapeAttr(m.message)}
                </div>
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
};

window.sendAdminChat = async function() {
    const input = document.getElementById('admin-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    
    const msg = {
        id: Date.now(),
        author_id: currentUser?.id,
        author_name: currentProfile?.username || 'admin',
        is_owner: window.isOwner,
        message: text,
        timestamp: new Date().toISOString()
    };
    
    const temp = [...adminChatList, msg];
    renderAdminChatMessages(temp);
    
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'admin_chat').single();
    let latestList = data?.data || [];
    latestList.push(msg);
    if (latestList.length > 100) latestList = latestList.slice(-100);
    
    const { error, data: updateData } = await supabaseClient.from('site_content').update({ data: latestList }).eq('key', 'admin_chat').select();
    if (error || !updateData || updateData.length === 0) {
        if (window.parent && window.parent.guiAlert) window.parent.guiAlert("Message failed to send. Database row 'admin_chat' does not exist in site_content table.", "Error");
    }
};

window.adminEditBlog = async function (idx) {
    const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
    let list = data?.data || [];
    let b = idx >= 0 ? list[idx] : { title: '', content: '' };

    if (idx >= 0 && !window.isOwner && b.author_id !== currentUser?.id) {
        guiAlert("you can only edit blogs that you posted.", "permission denied");
        return;
    }

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
    
    const { data: updateData, error } = await supabaseClient.from('site_content').update({ data: list }).eq('key', 'blogs').select();
    
    if (error) {
        guiAlert("error saving blog: " + error.message, "save failed");
        return;
    }
    if (!updateData || updateData.length === 0) {
        guiAlert("Save failed! Your account does not have permission to update 'site_content'. Please ask the owner to update the database RLS policies.", "Permission Denied");
        return;
    }
    
    renderAdminSection('blogs');
};

window.adminDeleteEntry = async function (key, idx) {
    if (key === 'blogs') {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'blogs').single();
        let list = data?.data || [];
        if (!window.isOwner && list[idx]?.author_id !== currentUser?.id) {
            guiAlert("you can only delete blogs that you posted.", "permission denied");
            return;
        }
    }
    if (!await window.guiConfirm("delete this entry?", "confirm")) return;
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
    
    let maxId = 0;
    Object.values(pData.tabs).forEach(t => {
        (t.projects || []).forEach(p => { if (p.id > maxId) maxId = p.id; });
    });
    
    pData.tabs[tabKey].projects.push({ id: maxId + 1, name: result.name, description: result.description, link: result.link, author_id: currentUser?.id || null });
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
    if (!proj.id) {
        let maxId = 0;
        Object.values(pData.tabs).forEach(t => {
            (t.projects || []).forEach(p => { if (p.id > maxId) maxId = p.id; });
        });
        proj.id = maxId + 1;
    }
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
    let do_ban = null, promote = null;
    if (action === 'ban') do_ban = true;
    if (action === 'unban') do_ban = false;
    if (action === 'promote') promote = true;
    if (action === 'demote') promote = false;

    if (promote !== null) {
        await supabaseClient.from('profiles').update({ is_admin: promote }).eq('id', id);
    } else if (do_ban !== null) {
        await supabaseClient.from('profiles').update({ is_banned: do_ban }).eq('id', id);
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
        issued_by_name: issuerName
    });
    guiAlert('warning issued.', 'done');
    renderAdminSection('users');
};

window.adminViewWarnings = async function (userId) {
    const { data } = await supabaseClient.from('warnings').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!data || !data.length) { guiAlert('no warnings on record.', 'warning record'); return; }
    
    let html = `<div style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">`;
    data.forEach(w => {
        html += `
            <div style="background:var(--bg-main); border:1px solid var(--border); padding:10px; font-size:12px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <div style="color:var(--fg-muted); margin-bottom:4px;">${new Date(w.created_at).toLocaleString()} — by ${window.escapeAttr(w.issued_by_name || 'admin')}</div>
                    <div>${window.escapeAttr(w.message)}</div>
                </div>
                ${window.isOwner ? `<button class="ui-btn" style="width:auto; margin:0; padding:2px 6px; color:var(--destructive);" onclick="adminDeleteWarning('${w.id}', '${userId}')">✕</button>` : ''}
            </div>
        `;
    });
    html += `</div>`;
    if (window.isOwner) {
        html += `<button class="ui-btn" style="margin-top:15px; border-color:var(--destructive); color:var(--destructive);" onclick="adminClearAllWarnings('${userId}')">clear all warnings</button>`;
    }
    
    const modal = document.getElementById('gui-modal');
    document.getElementById('gui-title').textContent = 'warning record';
    const msgBox = document.getElementById('gui-msg');
    if (msgBox) {
        msgBox.innerHTML = html;
        msgBox.style.whiteSpace = 'normal'; 
    }
    modal.style.display = 'flex';
};

window.adminDeleteWarning = async function (warningId, userId) {
    await supabaseClient.from('warnings').delete().eq('id', warningId);
    adminViewWarnings(userId);
    renderAdminSection('users');
};

window.adminClearAllWarnings = async function (userId) {
    await supabaseClient.from('warnings').delete().eq('user_id', userId);
    window.closeGuiModal();
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