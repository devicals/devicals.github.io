function getAdminTabs() {
    return [
        { key: 'users', label: 'users' },
        { key: 'anns', label: 'announcements' },
        { key: 'codes', label: 'share codes' },
        { key: 'chat', label: 'admin chat', align: 'right' }
    ];
}

window.renderAdminPage = async function () {
    const container = document.getElementById('page-content');
    container.innerHTML = `
        <div class="admin-section-title" style="margin-bottom:8px; border-bottom:none; padding-bottom:0;">admin dashboard</div>
        <div class="admin-tab-bar" id="admin-tab-bar"></div>
        <div id="admin-section-content"></div>
    `;
    renderAdminTabBar('users');
    renderAdminSection('users');
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

    if (section === 'codes') {
        view.innerHTML = `
            <div class="admin-section-title">manage tier list share codes</div>
            <div id="admin-codes-list" class="flat-list-container">loading...</div>
        `;
        loadAdminShareCodes();
    } else if (section === 'chat') {
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
                const isTargetOwner = u.is_owner === true || u.username?.toLowerCase() === 'error dev';
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
    }
};

async function loadAdminShareCodes() {
    const listEl = document.getElementById('admin-codes-list');
    if (!listEl) return;
    try {
        const { data, error } = await supabaseClient.from('site_content').select('*').like('key', 'tierlist_share_%');
        if (error) throw error;
        if (!data || !data.length) {
            listEl.innerHTML = '<span style="color:var(--fg-muted);">no share codes found.</span>';
            return;
        }
        listEl.innerHTML = data.map(item => {
            const code = item.key.replace('tierlist_share_', '');
            const info = item.data || {};
            const creator = info.creator_name || 'unknown / anon';
            const title = info.name || 'untitled list';
            const dateStr = info.created_at ? new Date(info.created_at).toLocaleString() : 'unknown date';
            const expStr = info.expires_at ? new Date(info.expires_at).toLocaleDateString() : 'never';
            const usesStr = info.max_uses ? `${info.current_uses || 0}/${info.max_uses}` : 'unlimited';

            return `
                <div class="admin-card admin-card-row">
                    <div>
                        <div style="font-weight:bold; color:var(--accent); font-size:16px;">CODE: ${code}</div>
                        <div style="color:var(--fg-main); font-size:13px; margin-top:4px;">Title: ${window.escapeAttr(title)}</div>
                        <div style="color:var(--fg-muted); font-size:11px; margin-top:2px;">Creator: ${window.escapeAttr(creator)} &middot; Expires: ${expStr} &middot; Uses: ${usesStr} &middot; ${dateStr}</div>
                    </div>
                    <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="adminDeleteShareCode('${item.key}')">delete</button>
                </div>
            `;
        }).join('');
    } catch (e) {
        listEl.innerHTML = `<span style="color:var(--destructive);">failed to load share codes: ${e.message}</span>`;
    }
}

window.adminDeleteShareCode = async function(key) {
    if (!await window.guiConfirm("delete this share code?", "confirm deletion")) return;
    await supabaseClient.from('site_content').delete().eq('key', key);
    loadAdminShareCodes();
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