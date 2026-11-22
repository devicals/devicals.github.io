function checkOwnerAccess() {
    let ident = null;
    if (window.getUserIdentity) {
        ident = window.getUserIdentity();
    } else if (window.parent && window.parent.getUserIdentity) {
        ident = window.parent.getUserIdentity();
    }
    const isOwner = ident ? ident.isOwner : (window.isOwner === true);
    if (!isOwner) {
        const rawHash = (window.location.hash || '').substring(1).split('?')[0].replace(/\s+/g, '_');
        if (rawHash === 'inbox') {
            window.location.hash = 'Index/Home';
        }
        const container = document.getElementById('page-content');
        if (container) container.innerHTML = '';
        return false;
    }
    return true;
}

if (!window._inboxKickInterval) {
    window._inboxKickInterval = setInterval(() => {
        const rawHash = (window.location.hash || '').substring(1).split('?')[0].replace(/\s+/g, '_');
        if (rawHash === 'inbox') {
            checkOwnerAccess();
        }
    }, 500);
}

window.renderInboxPage = async function () {
    if (!checkOwnerAccess()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px; padding-bottom:12px; border-bottom:1px dashed var(--border-bright);">
            <div>
                <div class="admin-section-title" style="margin:0; border:none; padding:0;">inbox</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="ui-btn ui-btn-sm" style="width:auto; margin:0;" onclick="loadInboxMessages()">refresh</button>
                <button class="ui-btn ui-btn-sm ui-icon-del" style="width:auto; margin:0;" onclick="clearAllInboxMessages()">clear all</button>
            </div>
        </div>
        <div id="inbox-list" class="flat-list-container">
            <span style="color:var(--fg-muted); font-family:var(--font-ui); font-size:12px;">loading messages...</span>
        </div>
    `;
    await loadInboxMessages();
};

window.loadInboxMessages = async function () {
    if (!checkOwnerAccess()) return;
    const listEl = document.getElementById('inbox-list');
    if (!listEl) return;

    try {
        const { data, error } = await supabaseClient
            .from('site_content')
            .select('*')
            .like('key', 'anon_msg_%');

        if (error) throw error;

        if (!data || !data.length) {
            listEl.innerHTML = '<span style="color:var(--fg-muted); font-family:var(--font-ui); font-size:12px;">no messages yet.</span>';
            return;
        }

        const sorted = [...data].sort((a, b) => {
            const ta = new Date(a.data?.created_at || 0).getTime();
            const tb = new Date(b.data?.created_at || 0).getTime();
            return tb - ta;
        });

        listEl.innerHTML = sorted.map(row => {
            const msg = row.data || {};
            const hasName = !!(msg.author_name && String(msg.author_name).trim());
            const senderDisplay = hasName ? window.escapeAttr(String(msg.author_name).trim()) : 'anonymous';
            const senderBadge = hasName
                ? (msg.is_logged_in ? '<span class="user-tag admin">account</span>' : '<span class="user-tag">guest</span>')
                : '<span class="user-tag">anon</span>';
            const dateStr = msg.created_at ? new Date(msg.created_at).toLocaleString() : 'unknown date';
            const textHtml = msg.message
                ? `<div style="font-size:14px; line-height:1.7; color:var(--fg-main); white-space:pre-wrap; word-break:break-word; margin-top:10px;">${window.escapeAttr(msg.message)}</div>`
                : '';

            const isValidDrawing = typeof msg.drawing === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(msg.drawing);
            const drawingHtml = isValidDrawing
                ? `<div style="margin-top:12px;"><img src="${msg.drawing}" alt="drawing" style="max-width:100%; max-height:360px; border:1px solid var(--border); background:#1c1b18; display:block;"></div>`
                : '';

            return `
                <div class="admin-card" id="inbox-item-${window.escapeAttr(row.key)}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                        <div>
                            <strong style="color:${hasName ? 'var(--accent)' : 'var(--fg-muted)'}; font-family:var(--font-ui); font-size:13px;">${senderDisplay}</strong>
                            ${senderBadge}
                            <div style="font-family:var(--font-ui); font-size:11px; color:var(--fg-muted); margin-top:4px;">${window.escapeAttr(dateStr)}</div>
                        </div>
                        <button class="ui-btn ui-btn-sm ui-icon-btn ui-icon-del" style="width:auto; margin:0;" title="delete" aria-label="delete" onclick="deleteInboxMessage('${window.escapeAttr(row.key)}')">
                            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 4h11M6 4V2.5h4V4M4.5 4l.7 9.5h5.6l.7-9.5"/></svg>
                        </button>
                    </div>
                    ${textHtml}
                    ${drawingHtml}
                </div>
            `;
        }).join('');
    } catch (e) {
        listEl.innerHTML = `<span style="color:var(--destructive); font-family:var(--font-ui); font-size:12px;">failed to load messages: ${window.escapeAttr(e.message)}</span>`;
    }
};

window.deleteInboxMessage = async function (key) {
    if (!checkOwnerAccess()) return;
    if (!await window.guiConfirm('delete this message?', 'confirm deletion')) return;
    await supabaseClient.from('site_content').delete().eq('key', key);
    await loadInboxMessages();
};

window.clearAllInboxMessages = async function () {
    if (!checkOwnerAccess()) return;
    if (!await window.guiConfirm('permanently delete ALL inbox messages?', 'clear inbox')) return;
    await supabaseClient.from('site_content').delete().like('key', 'anon_msg_%');
    await loadInboxMessages();
};