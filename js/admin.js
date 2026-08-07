window.openAdminModal = function() {
    document.getElementById('settings-modal').style.display = 'none';
    let adminModal = document.getElementById('admin-modal');
    if(!adminModal) {
        adminModal = document.createElement('div');
        adminModal.id = 'admin-modal';
        adminModal.className = 'modal';
        adminModal.innerHTML = `
            <div class="modal-box" style="width:750px; max-width:92vw;">
                <div class="modal-title">Admin Control Dashboard</div>
                <div id="admin-dashboard-content"></div>
                <button class="modal-close" onclick="document.getElementById('admin-modal').style.display='none'">Close</button>
            </div>
        `;
        document.body.appendChild(adminModal);
    }
    adminModal.style.display = 'flex';
    renderAdminDashboardContent();
};

async function renderAdminDashboardContent() {
    const container = document.getElementById('admin-dashboard-content');
    container.innerHTML = `
        <div style="display:flex; gap:12px; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:8px;">
            <button class="ui-btn" style="width:auto; margin:0;" onclick="switchAdminTab('users')">Users</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="switchAdminTab('anns')">Announcements</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="switchAdminTab('tree')">Page Structure</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="toggleShowHidden()">${showHiddenPages ? 'Hide Hidden Pages' : 'Show Hidden Pages'}</button>
        </div>
        <div id="admin-tab-view"></div>
    `;
    switchAdminTab('users');
}

window.toggleShowHidden = function() {
    showHiddenPages = !showHiddenPages;
    renderNavigation();
    renderAdminDashboardContent();
};

window.switchAdminTab = async function(tab) {
    const view = document.getElementById('admin-tab-view');
    if(tab === 'users') {
        view.innerHTML = 'Loading user records...';
        const { data, error } = await supabaseClient.rpc('admin_get_users');
        if(error || !data) {
            view.innerHTML = '<p style="color:var(--destructive)">Failed to load users from database.</p>';
            return;
        }
        
        const activeUsers = data.filter(u => !u.is_banned);
        const bannedUsers = data.filter(u => u.is_banned);

        const renderUserRow = (u) => `
            <div class="admin-card">
                <div class="admin-card-header">
                    <div>
                        <strong>${u.username || 'Unnamed'}</strong> 
                        <span style="color:var(--fg-muted)">(${u.email})</span>
                        ${u.is_admin ? '<span class="user-status-tag admin">ADMIN</span>' : ''}
                        ${u.is_banned ? '<span class="user-status-tag banned">BANNED</span>' : ''}
                    </div>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAction('${u.id}', '${u.is_admin ? 'unset_admin' : 'set_admin'}')">${u.is_admin ? 'Demote' : 'Make Admin'}</button>
                    ${u.is_banned 
                        ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminAction('${u.id}', 'unban')">Unban</button>` 
                        : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminAction('${u.id}', 'ban')">Ban</button>`
                    }
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAction('${u.id}', 'reset')">Reset Password</button>
                    <button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminAction('${u.id}', 'delete')">Kick</button>
                </div>
            </div>
        `;

        view.innerHTML = `
            <h3 style="color:var(--accent); margin-bottom:8px;">Active Accounts (${activeUsers.length})</h3>
            ${activeUsers.map(renderUserRow).join('') || '<p style="color:var(--fg-muted)">No active users.</p>'}
            
            <h3 style="color:var(--destructive); margin-top:20px; margin-bottom:8px;">Banned Accounts (${bannedUsers.length})</h3>
            ${bannedUsers.map(renderUserRow).join('') || '<p style="color:var(--fg-muted)">No banned users.</p>'}
        `;
    } else if(tab === 'anns') {
        view.innerHTML = `
            <div class="settings-group">
                <label>Post Announcement</label>
                <textarea id="new-ann-input" class="ui-input" rows="3" placeholder="Enter announcement text..."></textarea>
                <button class="ui-btn" onclick="postAnnouncement()">Submit Announcement</button>
            </div>
            <div id="ann-list-container">Loading announcements...</div>
        `;
        loadAnnouncements();
    } else if(tab === 'tree') {
        view.innerHTML = `
            <div class="settings-group">
                <label>Navigation Hierarchy JSON</label>
                <textarea id="tree-json-input" class="ui-input" rows="12">${JSON.stringify(navData, null, 2)}</textarea>
                <button class="ui-btn" onclick="saveTreeJSON()">Save Hierarchy</button>
            </div>
        `;
    }
};

window.adminAction = async (id, action) => {
    let do_ban = null, do_delete = false, do_reset = false, set_admin = null;
    if (action === 'ban') do_ban = true;
    if (action === 'unban') do_ban = false;
    if (action === 'delete') do_delete = true;
    if (action === 'reset') do_reset = true;
    if (action === 'set_admin') set_admin = true;
    if (action === 'unset_admin') set_admin = false;
    
    if (set_admin !== null) {
        await supabaseClient.from('profiles').update({ is_admin: set_admin }).eq('id', id);
    } else {
        await supabaseClient.rpc('admin_manage_user', { target_id: id, do_ban, do_delete, do_reset_pass: do_reset });
    }
    switchAdminTab('users');
};

async function loadAnnouncements() {
    const container = document.getElementById('ann-list-container');
    if(!container) return;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data) {
            container.innerHTML = data.data.map((a, i) => `
                <div style="background:var(--bg-hover); padding:10px; border:1px solid var(--border); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:12px;">${a}</span>
                    <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive); border-color:var(--destructive);" onclick="deleteAnn(${i})">Delete</button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color:var(--fg-muted)">No announcements active.</p>';
        }
    } catch(e) {
        container.innerHTML = '<p style="color:var(--destructive)">Failed to load announcements.</p>';
    }
}

window.postAnnouncement = async () => {
    const text = document.getElementById('new-ann-input').value.trim();
    if(!text) return;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        const anns = data?.data || [];
        anns.push(text);
        await supabaseClient.from('site_content').update({ data: anns }).eq('key', 'announcements');
        document.getElementById('new-ann-input').value = '';
        loadAnnouncements();
    } catch(e) {}
};

window.deleteAnn = async (idx) => {
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        const anns = data?.data || [];
        anns.splice(idx, 1);
        await supabaseClient.from('site_content').update({ data: anns }).eq('key', 'announcements');
        loadAnnouncements();
    } catch(e) {}
};

window.saveTreeJSON = function() {
    try {
        const parsed = JSON.parse(document.getElementById('tree-json-input').value);
        navData = parsed;
        renderNavigation();
        alert('Navigation tree updated locally.');
    } catch(e) {
        alert('Invalid JSON syntax: ' + e.message);
    }
};