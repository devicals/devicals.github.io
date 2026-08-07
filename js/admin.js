window.renderAdminPage = async function() {
    const container = document.getElementById('page-content');
    container.innerHTML = `
        <h1>Admin Control Dashboard</h1>
        
        <div style="display:flex; gap:10px; margin-top:20px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px;">
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('tree')">Page Structure</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('users')">User Management</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="renderAdminSection('anns')">Announcements</button>
            <button class="ui-btn" style="width:auto; margin:0;" onclick="toggleHiddenAdmin()">${showHiddenPages ? 'Hide Hidden' : 'Show Hidden'}</button>
        </div>

        <div id="admin-section-content"></div>
    `;
    renderAdminSection('tree');
};

window.toggleHiddenAdmin = function() {
    showHiddenPages = !showHiddenPages;
    renderNavigation();
    window.renderAdminPage();
};

window.renderAdminSection = async function(section) {
    const view = document.getElementById('admin-section-content');
    if (section === 'tree') {
        view.innerHTML = `
            <h2>Manage Pages & Hierarchy</h2>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <button class="ui-btn" style="width:auto; margin:0;" onclick="addFolderNode()">+ Add Folder</button>
                <button class="ui-btn" style="width:auto; margin:0;" onclick="addFileNode()">+ Add Page</button>
            </div>
            <div id="visual-tree-builder"></div>
        `;
        renderVisualTreeBuilder();
    } else if (section === 'users') {
        view.innerHTML = 'Loading users database...';
        try {
            const { data, error } = await supabaseClient.rpc('admin_get_users');
            if (error || !data) {
                view.innerHTML = `
                    <p style="color:var(--destructive)">Failed to load users from database.</p>
                    <p style="font-size:11px; color:var(--fg-muted); margin-top:8px;">Ensure you have executed the required SQL setup functions in Supabase.</p>
                `;
                return;
            }

            const active = data.filter(u => !u.is_banned);
            const banned = data.filter(u => u.is_banned);

            const renderRow = (u) => `
                <div class="admin-user-card">
                    <div class="admin-user-card-header">
                        <div>
                            <strong>${u.username || 'Unnamed'}</strong> (${u.email})
                            ${u.is_admin ? '<span class="user-tag admin">ADMIN</span>' : ''}
                            ${u.is_banned ? '<span class="user-tag banned">BANNED</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                        <button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', '${u.is_admin ? 'demote' : 'promote'}')">${u.is_admin ? 'Demote' : 'Make Admin'}</button>
                        ${u.is_banned 
                            ? `<button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', 'unban')">Unban</button>` 
                            : `<button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'ban')">Ban</button>`
                        }
                        <button class="ui-btn" style="width:auto; margin:0;" onclick="adminUserAction('${u.id}', 'reset')">Reset Password</button>
                        <button class="ui-btn" style="width:auto; margin:0; border-color:var(--destructive); color:var(--destructive);" onclick="adminUserAction('${u.id}', 'delete')">Kick</button>
                    </div>
                </div>
            `;

            view.innerHTML = `
                <h2>Active Users (${active.length})</h2>
                ${active.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:12px;">No active users.</p>'}
                <h2 style="margin-top:24px;">Banned Users (${banned.length})</h2>
                ${banned.map(renderRow).join('') || '<p style="color:var(--fg-muted); font-size:12px;">No banned users.</p>'}
            `;
        } catch (e) {
            view.innerHTML = '<p style="color:var(--destructive)">Database connection error.</p>';
        }
    } else if (section === 'anns') {
        view.innerHTML = `
            <h2>Announcements</h2>
            <div class="settings-group">
                <textarea id="admin-ann-text" class="ui-input" rows="3" placeholder="New announcement text..."></textarea>
                <button class="ui-btn" onclick="postAdminAnnouncement()">Post Announcement</button>
            </div>
            <div id="admin-ann-list">Loading...</div>
        `;
        loadAdminAnnouncements();
    }
};

function renderVisualTreeBuilder() {
    const container = document.getElementById('visual-tree-builder');
    if (!container) return;
    container.innerHTML = '';

    function buildVisualNodes(nodes, parentEl) {
        nodes.forEach((node, idx) => {
            const row = document.createElement('div');
            row.className = 'tree-node-item';
            row.innerHTML = `
                <span style="font-weight:bold; color:var(--accent);">${node.type === 'folder' ? '[F]' : '[P]'}</span>
                <span style="flex:1;">${node.name} ${node.hidden ? '<span style="color:var(--destructive)">(Hidden)</span>' : ''}</span>
                <button class="ui-btn" style="width:auto; margin:0; padding:2px 6px;" onclick="moveNode(event, ${idx}, -1)">↑</button>
                <button class="ui-btn" style="width:auto; margin:0; padding:2px 6px;" onclick="moveNode(event, ${idx}, 1)">↓</button>
                <button class="ui-btn" style="width:auto; margin:0; padding:2px 6px;" onclick="editNode(event, ${idx})">✎</button>
                <button class="ui-btn" style="width:auto; margin:0; padding:2px 6px; color:var(--destructive);" onclick="deleteNode(event, ${idx})">✕</button>
            `;
            
            row.querySelector("button:nth-of-type(1)").onclick = () => moveNode(nodes, idx, -1);
            row.querySelector("button:nth-of-type(2)").onclick = () => moveNode(nodes, idx, 1);
            row.querySelector("button:nth-of-type(3)").onclick = () => editNode(nodes, idx);
            row.querySelector("button:nth-of-type(4)").onclick = () => deleteNode(nodes, idx);

            parentEl.appendChild(row);
            if (node.children) {
                const childWrap = document.createElement('div');
                childWrap.style.paddingLeft = '20px';
                parentEl.appendChild(childWrap);
                buildVisualNodes(node.children, childWrap);
            }
        });
    }
    buildVisualNodes(navData.children || [], container);
}

function moveNode(arr, idx, dir) {
    if (idx + dir < 0 || idx + dir >= arr.length) return;
    const temp = arr[idx];
    arr[idx] = arr[idx + dir];
    arr[idx + dir] = temp;
    renderNavigation();
    renderVisualTreeBuilder();
}

function editNode(arr, idx) {
    const node = arr[idx];
    const newName = prompt("Rename page/folder:", node.name);
    if (newName) node.name = newName;
    if (node.type === 'file') {
        const isHidden = confirm("Hide this page from non-admins?");
        node.hidden = isHidden;
    }
    renderNavigation();
    renderVisualTreeBuilder();
}

function deleteNode(arr, idx) {
    if (confirm(`Delete "${arr[idx].name}"?`)) {
        arr.splice(idx, 1);
        renderNavigation();
        renderVisualTreeBuilder();
    }
}

window.addFolderNode = function() {
    const name = prompt("New Folder Name:");
    if (name) {
        navData.children.push({ name, type: "folder", children: [] });
        renderNavigation();
        renderVisualTreeBuilder();
    }
};

window.addFileNode = function() {
    const name = prompt("New Page Name:");
    if (name) {
        const isHtml = confirm("Is this an interactive HTML tool page? (Click OK for HTML, Cancel for Markdown)");
        if (isHtml) {
            const url = prompt("Enter HTML page URL (e.g. pages/custom.html):", "pages/");
            navData.children.push({ name, type: "file", fileType: "html", url });
        } else {
            const path = prompt("Enter Markdown file path (e.g. content/note.md):", "content/");
            navData.children.push({ name, type: "file", fileType: "md", path });
        }
        renderNavigation();
        renderVisualTreeBuilder();
    }
};

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

async function loadAdminAnnouncements() {
    const list = document.getElementById('admin-ann-list');
    if (!list) return;
    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'announcements').single();
        if (data && data.data) {
            list.innerHTML = data.data.map((a, i) => `
                <div style="background:var(--bg-hover); padding:8px; border:1px solid var(--border); margin-bottom:4px; display:flex; justify-content:space-between; font-size:12px;">
                    <span>${a}</span>
                    <button class="ui-btn" style="width:auto; margin:0; color:var(--destructive);" onclick="deleteAdminAnn(${i})">Delete</button>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p style="color:var(--fg-muted); font-size:12px;">No active announcements.</p>';
        }
    } catch (e) {
        list.innerHTML = '<p style="color:var(--destructive); font-size:12px;">Failed to load announcements.</p>';
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