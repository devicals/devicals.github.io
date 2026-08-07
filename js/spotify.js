let spotifyInterval = null;
let lastFmUser = localStorage.getItem('lastfm_user') || '';

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    const isAdmin = window.parent.currentProfile?.is_admin || false;

    let adminSettingsHtml = '';
    if (isAdmin) {
        adminSettingsHtml = `
            <div style="margin-bottom:30px; padding:20px; border:1px dashed var(--accent);">
                <h3 style="margin-top:0; color:var(--accent);">Admin: Set Last.fm Username</h3>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="lastfm-input" class="ui-input" style="margin:0; flex:1;" placeholder="Enter Last.fm username" value="${lastFmUser}">
                    <button class="ui-btn" style="width:auto; margin:0;" onclick="saveLastFmUser()">Save</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <h1 style="margin-bottom:30px;">Spotify</h1>
        ${adminSettingsHtml}
        
        <h2 style="margin-bottom:20px;">Currently Playing</h2>
        <div id="spotify-status" style="margin-bottom:40px; min-height: 100px;">
            <span style="color:var(--fg-muted);">Checking Last.fm live status...</span>
        </div>
        
        <div id="liked-songs-section">
            <h2 style="margin-bottom:20px;">Liked Songs / Top Tracks</h2>
            <div style="border:1px solid var(--border); overflow:hidden;">
                <iframe src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0" width="100%" height="600" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            </div>
        </div>
    `;
    
    const fetchStatus = async () => {
        const statusBox = document.getElementById('spotify-status');
        if(!statusBox) return;

        if (!lastFmUser) {
            statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">Last.fm username not configured.</div>`;
            return;
        }

        try {
            const res = await fetch(`https://lastfm-last-played.biancarosa.com.br/${lastFmUser}/latest-song`);
            const data = await res.json();
            
            if (data && data.track && data.track['@attr'] && data.track['@attr'].nowplaying) {
                const sp = data.track;
                statusBox.innerHTML = `
                    <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border);">
                        <div style="font-size:12px; color:var(--accent); margin-bottom:12px; font-weight:bold; letter-spacing:1px;">NOW PLAYING (LAST.FM)</div>
                        <div style="font-size:24px; font-weight:bold; color:var(--fg-main);">${sp.name}</div>
                        <div style="color:var(--fg-muted); font-size:16px; margin-top:8px;">by ${sp.artist['#text']}</div>
                        <div style="margin-top: 12px; font-size: 13px; color: var(--fg-muted);">Album: ${sp.album['#text']}</div>
                    </div>
                `;
            } else {
                statusBox.innerHTML = `
                    <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border);">
                        <div style="font-size:12px; color:var(--fg-muted); font-weight:bold; letter-spacing:1px;">NOW PLAYING</div>
                        <div style="color:var(--fg-muted); font-size:16px; margin-top:12px;">Offline / Not playing right now</div>
                    </div>
                `;
            }
        } catch(e) {
            statusBox.innerHTML = `<span style="color:var(--destructive);">Error fetching Last.fm status.</span>`;
        }
    };

    window.saveLastFmUser = function() {
        lastFmUser = document.getElementById('lastfm-input').value.trim();
        localStorage.setItem('lastfm_user', lastFmUser);
        fetchStatus();
    };

    await fetchStatus();
    spotifyInterval = setInterval(fetchStatus, 10000);
};