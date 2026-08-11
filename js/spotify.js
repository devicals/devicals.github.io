let spotifyInterval = null;
const LANYARD_USER_ID = '989414384679927838';
const LIKED_PLAYLIST_ID = '3b4R4ByK5BrcVKqK4MpBcp';

window.renderSpotify = async function () {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:30px;">spotify / music</h1>
        <div id="liked-songs-embed-wrap"></div>
    `;

    renderPlaylistEmbed();
    await updateLanyardView();
    spotifyInterval = setInterval(updateLanyardView, 15000);

    if (!window._spotifyThemeObserver) {
        window._spotifyThemeObserver = new MutationObserver(() => {
            if (document.getElementById('liked-songs-embed-wrap')) renderPlaylistEmbed();
        });
        window._spotifyThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
};

function renderPlaylistEmbed() {
    const wrap = document.getElementById('liked-songs-embed-wrap');
    if (!wrap) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'primary';
    const isLight = theme === 'light';
    wrap.innerHTML = `
        <div id="spotify-embed-frame-holder" style="border:1px solid var(--border); background:var(--bg-hover); padding:16px; ${isLight ? 'filter: invert(0.92) hue-rotate(180deg);' : ''}">
            <iframe
                style="border-radius:0; border:none; display:block;"
                src="https://open.spotify.com/embed/playlist/${LIKED_PLAYLIST_ID}?utm_source=generator&theme=0"
                width="100%"
                height="500"
                frameBorder="0"
                allowfullscreen=""
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy">
            </iframe>
        </div>
    `;
}

async function updateLanyardView() {
    const statusBox = document.getElementById('spotify-status');
    if (!statusBox) return;

    try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${LANYARD_USER_ID}`);
        const json = await res.json();

        if (!json.success) throw new Error('lanyard request failed');

        const data = json.data;
        const isOnline = data.discord_status && data.discord_status !== 'offline';

        if (isOnline && data.listening_to_spotify && data.spotify) {
            const track = data.spotify;
            statusBox.innerHTML = `
                <div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); display:flex; align-items:center; gap:20px;">
                    ${track.album_art_url ? `<img src="${track.album_art_url}" style="width:80px; height:80px; border:1px solid var(--border);">` : ''}
                    <div>
                        <div style="font-size:12px; color:var(--accent); margin-bottom:8px; font-weight:bold; letter-spacing:1px;">now playing on spotify</div>
                        <a href="https://open.spotify.com/track/${track.track_id}" target="_blank" rel="noopener" style="font-size:24px; font-weight:bold; color:var(--fg-main); text-decoration:none;">${track.song} ↗</a>
                        <div style="color:var(--fg-muted); font-size:16px; margin-top:6px;">by ${track.artist} &middot; ${track.album || ''}</div>
                    </div>
                </div>
            `;
        } else {
            statusBox.innerHTML = `<div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); color:var(--fg-muted);">unable to show current playing song as i'm offline on discord</div>`;
        }
    } catch (e) {
        statusBox.innerHTML = `<div style="background:var(--bg-hover); padding:30px; border:1px solid var(--border); color:var(--fg-muted);">unable to show current playing song as i'm offline on discord</div>`;
    }
}