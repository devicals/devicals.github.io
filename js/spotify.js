let spotifyInterval = null;
let lastFmUser = ''; 
let spotifyEmbed = '';

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:30px;">Spotify / Music</h1>
        
        <h2 style="margin-bottom:20px;">Currently Listening (Last.fm)</h2>
        <div id="spotify-status" style="margin-bottom:40px; min-height: 100px;">
            <span style="color:var(--fg-muted);">Loading live status...</span>
        </div>
        
        <h2 style="margin-bottom:20px;">Liked Songs / Top Tracks</h2>
        <div id="liked-songs-section">
            <span style="color:var(--fg-muted);">Loading player...</span>
        </div>
    `;

    try {
        const { data } = await supabaseClient.from('site_content').select('data').eq('key', 'spotify_config').single();
        if (data && data.data) {
            lastFmUser = data.data.lastfm || '';
            spotifyEmbed = data.data.embed || '';
        }
    } catch(e) {}

    await fetchStatus();
    spotifyInterval = setInterval(fetchStatus, 15000);
    renderLikedSongsSection();
};

async function fetchStatus() {
    const statusBox = document.getElementById('spotify-status');
    if(!statusBox) return;

    if (!lastFmUser) {
        statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">Last.fm username not configured. Set it in the Admin Dashboard > Music Settings.</div>`;
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

function renderLikedSongsSection() {
    const sec = document.getElementById('liked-songs-section');
    if (!sec) return;
    
    let srcUrl = "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0";
    if (spotifyEmbed) {
        if (spotifyEmbed.startsWith('http')) srcUrl = spotifyEmbed;
        else srcUrl = `https://open.spotify.com/embed/playlist/${spotifyEmbed}?utm_source=generator&theme=0`;
    }

    sec.innerHTML = `
        <div style="border:1px solid var(--border); overflow:hidden;">
            <iframe src="${srcUrl}" width="100%" height="500" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
    `;
}