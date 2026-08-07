window.renderSpotify = async function() {
    const container = document.getElementById('spotify-inject');
    container.innerHTML = '<h2>My Spotify</h2><div id="spotify-status">Loading live status...</div><div id="liked-songs"></div>';
    
    try {
        const res = await fetch('https://api.lanyard.rest/v1/users/989414384679927838');
        const json = await res.json();
        const data = json.data;
        
        if (data && data.listening_to_spotify && data.spotify) {
            const sp = data.spotify;
            document.getElementById('spotify-status').innerHTML = `
                <div class="spotify-container">
                    <div class="spotify-title">CURRENTLY LISTENING</div>
                    <div class="spotify-track">${sp.song}</div>
                    <div class="spotify-artist">by ${sp.artist}</div>
                    <div style="margin-top: 10px; font-size: 11px; color: var(--fg-muted);">on ${sp.album}</div>
                </div>
            `;
        } else {
            document.getElementById('spotify-status').innerHTML = `
                <div class="spotify-container">
                    <div class="spotify-title">CURRENTLY LISTENING</div>
                    <div class="spotify-track">Offline / Not playing right now</div>
                </div>
            `;
        }
    } catch(e) {
        document.getElementById('spotify-status').textContent = 'Live Spotify presence unavailable.';
    }

    try {
        const resMusic = await fetch('music.json');
        const musicData = await resMusic.json();
        if (musicData && musicData[0] && musicData[0].tracks) {
            const tracks = musicData[0].tracks;
            const likedContainer = document.getElementById('liked-songs');
            likedContainer.innerHTML = '<h3>Liked Songs Archive</h3><div class="track-grid"></div>';
            const grid = likedContainer.querySelector('.track-grid');
            
            tracks.slice(0, 50).forEach(t => {
                const row = document.createElement('div');
                row.className = 'track-row';
                row.innerHTML = `<span><strong>${t.title}</strong> - ${t.artists.join(', ')}</span><span style="color:var(--fg-muted)">${t.album}</span>`;
                grid.appendChild(row);
            });
        }
    } catch(e) {}
};