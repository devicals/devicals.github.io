let spotifyInterval = null;
let spotifyConfig = null;

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:30px;">Spotify / Music</h1>
        <h2 style="margin-bottom:20px;">Currently Playing (Spotify REST API)</h2>
        <div id="spotify-status" style="margin-bottom:40px; min-height: 100px;">
            <span style="color:var(--fg-muted);">Connecting to Spotify API...</span>
        </div>
        
        <h2 style="margin-bottom:20px;">Actual Liked Songs</h2>
        <div id="liked-songs-section" style="display:flex; flex-direction:column; gap:12px;">
            <span style="color:var(--fg-muted);">Loading liked songs...</span>
        </div>
    `;

    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'spotify_config').single();
        if (data && data.data) spotifyConfig = data.data;
    } catch(e) {}

    await updateSpotifyView();
    spotifyInterval = setInterval(updateSpotifyView, 15000);
};

async function getAccessToken() {
    if (!spotifyConfig || !spotifyConfig.client_id || !spotifyConfig.refresh_token) return null;
    try {
        const authHeader = btoa(`${spotifyConfig.client_id}:${spotifyConfig.client_secret}`);
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: spotifyConfig.refresh_token
            })
        });
        const data = await res.json();
        return data.access_token || null;
    } catch(e) {
        return null;
    }
}

async function updateSpotifyView() {
    const statusBox = document.getElementById('spotify-status');
    const likedBox = document.getElementById('liked-songs-section');
    if (!statusBox) return;

    const token = await getAccessToken();

    if (!token) {
        statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">Spotify API credentials not configured. Go to Admin Dashboard -> Spotify API Config to set it up.</div>`;
        likedBox.innerHTML = `<span style="color:var(--fg-muted);">Configure Spotify credentials to display liked songs.</span>`;
        return;
    }

    try {
        const curRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (curRes.status === 200) {
            const curData = await curRes.json();
            if (curData && curData.item) {
                const track = curData.item;
                const artists = track.artists.map(a => a.name).join(', ');
                const cover = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '';
                
                statusBox.innerHTML = `
                    <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); display:flex; align-items:center; gap:20px;">
                        ${cover ? `<img src="${cover}" style="width:80px; height:80px; border:1px solid var(--border);">` : ''}
                        <div>
                            <div style="font-size:12px; color:var(--accent); margin-bottom:8px; font-weight:bold; letter-spacing:1px;">NOW PLAYING ON SPOTIFY</div>
                            <a href="${track.external_urls?.spotify || '#'}" target="_blank" style="font-size:24px; font-weight:bold; color:var(--fg-main); text-decoration:none;">${track.name} ↗</a>
                            <div style="color:var(--fg-muted); font-size:16px; margin-top:6px;">by ${artists} &middot; ${track.album?.name || ''}</div>
                        </div>
                    </div>
                `;
            } else {
                renderRecentlyPlayed(token, statusBox);
            }
        } else {
            renderRecentlyPlayed(token, statusBox);
        }
    } catch(e) {
        statusBox.innerHTML = `<span style="color:var(--destructive);">Error connecting to Spotify.</span>`;
    }

    try {
        const tracksRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tracksRes.ok) {
            const tracksData = await tracksRes.json();
            if (tracksData && tracksData.items) {
                likedBox.innerHTML = tracksData.items.map(entry => {
                    const track = entry.track;
                    const artists = track.artists.map(a => a.name).join(', ');
                    return `
                        <a href="${track.external_urls?.spotify || '#'}" target="_blank" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover); padding:14px 20px; border:1px solid var(--border); text-decoration:none; color:inherit;">
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <span style="font-size:16px; font-weight:bold; color:var(--accent);">${track.name}</span>
                                <span style="font-size:13px; color:var(--fg-muted);">${artists} &middot; ${track.album?.name || ''}</span>
                            </div>
                            <div style="font-size:18px; color:var(--fg-muted);">↗</div>
                        </a>
                    `;
                }).join('');
            }
        }
    } catch(e) {
        likedBox.innerHTML = `<span style="color:var(--destructive);">Error loading Liked Songs.</span>`;
    }
}

async function renderRecentlyPlayed(token, statusBox) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.items && data.items.length > 0) {
                const track = data.items[0].track;
                const artists = track.artists.map(a => a.name).join(', ');
                const cover = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '';
                statusBox.innerHTML = `
                    <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); display:flex; align-items:center; gap:20px;">
                        ${cover ? `<img src="${cover}" style="width:80px; height:80px; border:1px solid var(--border);">` : ''}
                        <div>
                            <div style="font-size:12px; color:var(--fg-muted); margin-bottom:8px; font-weight:bold; letter-spacing:1px;">LAST PLAYED</div>
                            <a href="${track.external_urls?.spotify || '#'}" target="_blank" style="font-size:24px; font-weight:bold; color:var(--fg-main); text-decoration:none;">${track.name} ↗</a>
                            <div style="color:var(--fg-muted); font-size:16px; margin-top:6px;">by ${artists} &middot; ${track.album?.name || ''}</div>
                        </div>
                    </div>
                `;
                return;
            }
        }
    } catch(e) {}
    statusBox.innerHTML = `<div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); color:var(--fg-muted);">Offline / Not playing right now</div>`;
}