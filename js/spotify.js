let spotifyInterval = null;
let nowPlayingApiUrl = ''; 
let likedPlaylistId = '';
let spotifyMusicData = [];

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:30px;">Spotify / Music</h1>
        
        <h2 style="margin-bottom:20px;">Currently Listening</h2>
        <div id="spotify-status" style="margin-bottom:40px; min-height: 100px;">
            <span style="color:var(--fg-muted);">Loading status...</span>
        </div>
        
        <h2 style="margin-bottom:20px;">Liked Songs</h2>
        <div id="liked-songs-section" style="display:flex; flex-direction:column; gap:12px;">
            <span style="color:var(--fg-muted);">Loading liked songs...</span>
        </div>
    `;

    try {
        const { data } = await window.parent.supabaseClient.from('site_content').select('data').eq('key', 'spotify_config').single();
        if (data && data.data) {
            nowPlayingApiUrl = data.data.nowPlayingApiUrl || '';
            likedPlaylistId = data.data.likedPlaylistId || '';
        }
    } catch(e) {}

    await fetchStatus();
    spotifyInterval = setInterval(fetchStatus, 15000);

    try {
        const res = await fetch('music.json');
        if(res.ok) {
            const rawJson = await res.json();
            if (rawJson && rawJson[0] && rawJson[0].tracks) {
                spotifyMusicData = rawJson[0].tracks;
                renderLikedSongsList();
            }
        } else {
            renderLikedSongsEmbed();
        }
    } catch(e) {
        renderLikedSongsEmbed();
    }
};

async function fetchStatus() {
    const statusBox = document.getElementById('spotify-status');
    if(!statusBox) return;

    if (!nowPlayingApiUrl) {
        statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">Now Playing API not configured. Admins can configure this via the Admin Dashboard.</div>`;
        return;
    }

    try {
        const res = await fetch(nowPlayingApiUrl);
        const data = await res.json();
        
        if (data && data.isPlaying) {
            statusBox.innerHTML = `
                <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); display:flex; align-items:center; gap:20px;">
                    ${data.albumImageUrl ? `<img src="${data.albumImageUrl}" style="width:80px; height:80px; border:1px solid var(--border);">` : ''}
                    <div>
                        <div style="font-size:12px; color:var(--accent); margin-bottom:12px; font-weight:bold; letter-spacing:1px;">
                            NOW PLAYING
                        </div>
                        <div style="font-size:24px; font-weight:bold; color:var(--fg-main);">${data.title}</div>
                        <div style="color:var(--fg-muted); font-size:16px; margin-top:8px;">by ${data.artist}</div>
                    </div>
                </div>
            `;
        } else {
            statusBox.innerHTML = `<div style="color:var(--fg-muted); padding:20px; border:1px solid var(--border);">Offline / Not playing right now</div>`;
        }
    } catch(e) {
        statusBox.innerHTML = `<span style="color:var(--destructive);">Error fetching Spotify status from API.</span>`;
    }
}

function renderLikedSongsList() {
    const list = document.getElementById('liked-songs-section');
    if (!spotifyMusicData || spotifyMusicData.length === 0) {
        renderLikedSongsEmbed();
        return;
    }

    const html = spotifyMusicData.map(track => {
        const artists = Array.isArray(track.artists) ? track.artists.join(', ') : track.artists;
        return `
            <a href="https://open.spotify.com/track/${track.id}" target="_blank" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-hover); padding:12px 20px; border:1px solid var(--border); text-decoration:none; color:inherit; transition:border-color 0.2s;">
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

function renderLikedSongsEmbed() {
    const list = document.getElementById('liked-songs-section');
    if (!likedPlaylistId) {
        list.innerHTML = '<span style="color:var(--fg-muted);">Liked Songs Playlist ID not configured.</span>';
        return;
    }

    list.innerHTML = `
        <div style="border:1px solid var(--border); overflow:hidden;">
            <iframe src="https://open.spotify.com/embed/playlist/${likedPlaylistId}?utm_source=generator&theme=0" width="100%" height="600" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
    `;
}