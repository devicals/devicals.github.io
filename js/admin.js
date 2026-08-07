async function renderAdminDashboard() {
    const container = document.getElementById('page-content');
    const breadcrumbs = document.getElementById('breadcrumbs');
    breadcrumbs.innerHTML = "Admin Dashboard";
    
    container.innerHTML = `
        <h1>Admin Control Panel</h1>
        <div class="settings-group">
            <h2>User Management</h2>
            <div id="admin-user-list">Loading users...</div>
        </div>
    `;
    
    const { data, error } = await supabaseClient.rpc('admin_get_users');
    const list = document.getElementById('admin-user-list');
    
    if (error || !data) {
        list.innerHTML = `<p style="color:var(--destructive)">Error fetching users. Make sure you set up the SQL functions.</p>`;
        return;
    }
    
    list.innerHTML = data.map(u => `
        <div style="background: var(--bg-sidebar); padding: 10px; margin-bottom: 10px; border: 1px solid var(--border);">
            <strong>${u.username || 'Unnamed'}</strong> (${u.email})
            <span style="float:right;">
                ${u.is_banned ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminAction('${u.id}', 'unban')">Unban</button>` : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminAction('${u.id}', 'ban')">Ban</button>`}
                <button class="ui-btn" style="width:auto; margin:0;" onclick="adminAction('${u.id}', 'reset')">Reset Pass</button>
                <button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminAction('${u.id}', 'delete')">Kick</button>
            </span>
        </div>
    `).join('');
}

window.adminAction = async (id, action) => {
    let do_ban = null, do_delete = false, do_reset = false;
    if (action === 'ban') do_ban = true;
    if (action === 'unban') do_ban = false;
    if (action === 'delete') do_delete = true;
    if (action === 'reset') do_reset = true;
    
    await supabaseClient.rpc('admin_manage_user', { target_id: id, do_ban, do_delete, do_reset_pass: do_reset });
    renderAdminDashboard();
};