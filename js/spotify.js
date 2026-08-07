let spotifyInterval = null;
let lastFmUser = ''; 
let spotifyMusicData = [];

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:30px;">Spotify / Music</h1>
        <h2 style="margin-bottom:20px;">Currently Listening (Last.fm)</h2>
        <div id="spotify-status" style="margin-bottom:40px; min-height: 100px;">
            <span style="color:var(--fg-muted);">Loading status...</span>
        </div>
        
        <h2 style="margin-bottom:20px;">Actual Liked Songs</h2>
        <div id="liked-songs-section" style="display:flex; flex-direction:column; gap:12px;">
            <span style="color:var(--fg-muted);">Loading liked songs...</span>
        </div>
    `;

    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'lastfm_config').single();
        if (data && data.data) lastFmUser = data.data.username || '';
    } catch(e) {}

    await fetchStatus();
    spotifyInterval = setInterval(fetchStatus, 15000);

    try {
        const res = await fetch('/music.json');
        if(res.ok) {
            const rawJson = await res.json();
            if (rawJson && rawJson[0] && rawJson[0].tracks) {
                spotifyMusicData = rawJson[0].tracks;
                renderLikedSongs();
            }
        }
    } catch(e) {
        document.getElementById('liked-songs-section').innerHTML = '<span style="color:var(--destructive);">Failed to load music.json</span>';
    }
};

async function fetchStatus() {
    const statusBox = document.getElementById('spotify-status');
    if(!statusBox) return;

    if (!lastFmUser) {
        statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">Last.fm username not configured. Admins can configure this via database or settings.</div>`;
        return;
    }

    try {
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lastFmUser}&api_key=4a9f5581a9cdf20a699f540ac52a95c9&format=json&limit=1`);
        const data = await res.json();
        
        if (data && data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
            const sp = data.recenttracks.track[0];
            const isPlaying = sp['@attr'] && sp['@attr'].nowplaying === 'true';
            
            statusBox.innerHTML = `
                <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); display:flex; align-items:center; gap:20px;">
                    ${sp.image && sp.image[2] && sp.image[2]['#text'] ? `<img src="${sp.image[2]['#text']}" style="width:80px; height:80px; border:1px solid var(--border);">` : ''}
                    <div>
                        <div style="font-size:12px; color:${isPlaying ? 'var(--accent)' : 'var(--fg-muted)'}; margin-bottom:12px; font-weight:bold; letter-spacing:1px;">
                            ${isPlaying ? 'NOW PLAYING' : 'LAST PLAYED'}
                        </div>
                        <div style="font-size:24px; font-weight:bold; color:var(--fg-main);">${sp.name}</div>
                        <div style="color:var(--fg-muted); font-size:16px; margin-top:8px;">by ${sp.artist['#text']}</div>
                    </div>
                </div>
            `;
        } else {
            statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">No recent tracks found for user ${lastFmUser}.</div>`;
        }
    } catch(e) {
        statusBox.innerHTML = `<span style="color:var(--destructive);">Error fetching Last.fm API.</span>`;
    }
}

function renderLikedSongs() {
    const list = document.getElementById('liked-songs-section');
    if (!spotifyMusicData || spotifyMusicData.length === 0) {
        list.innerHTML = '<span style="color:var(--fg-muted);">No songs found.</span>';
        return;
    }

    const html = spotifyMusicData.map(track => {
        const artists = Array.isArray(track.artists) ? track.artists.join(', ') : track.artists;
        return `
            <a href="https://open.spotify.com/track/${track.id}" target="_blank" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover); padding:12px 20px; border:1px solid var(--border); text-decoration:none; color:inherit;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:15px; font-weight:bold; color:var(--accent);">${track.title}</span>
                    <span style="font-size:12px; color:var(--fg-muted);">${artists} &middot; ${track.album}</span>
                </div>
                <div style="font-size:20px; color:var(--fg-muted);">▶</div>
            </a>
        `;
    }).join('');

    list.innerHTML = html;
}