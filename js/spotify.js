window.renderSpotify = async function() {
    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1>Spotify</h1>
        <div id="spotify-status">Checking live playback presence...</div>
        <div id="liked-songs-section" style="margin-top:24px;"></div>
    `;
    
    try {
        const res = await fetch('https://api.lanyard.rest/v1/users/989414384679927838');
        const json = await res.json();
        const data = json.data;
        
        if (data && data.listening_to_spotify && data.spotify) {
            const sp = data.spotify;
            document.getElementById('spotify-status').innerHTML = `
                <div class="spotify-container">
                    <div class="spotify-title">CURRENTLY PLAYING</div>
                    <div class="spotify-track">${sp.song}</div>
                    <div class="spotify-artist">by ${sp.artist}</div>
                    <div style="margin-top: 10px; font-size: 11px; color: var(--fg-muted);">Album: ${sp.album}</div>
                </div>
            `;
        } else {
            document.getElementById('spotify-status').innerHTML = `
                <div class="spotify-container">
                    <div class="spotify-title">CURRENTLY PLAYING</div>
                    <div class="spotify-track">Offline / No active playback</div>
                </div>
            `;
        }
    } catch(e) {
        document.getElementById('spotify-status').textContent = 'Live presence unavailable.';
    }

    try {
        const resMusic = await fetch('music.json');
        const musicData = await resMusic.json();
        if (musicData && musicData[0] && musicData[0].tracks) {
            const tracks = musicData[0].tracks;
            const likedSection = document.getElementById('liked-songs-section');
            likedSection.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3>Liked Songs (${tracks.length})</h3>
                    <input type="text" id="spotify-search" class="ui-input" placeholder="Search track, artist, album..." style="width:250px; margin:0;">
                </div>
                <div class="track-grid" id="track-grid-list"></div>
            `;
            
            const grid = document.getElementById('track-grid-list');
            const renderTracks = (filtered) => {
                grid.innerHTML = filtered.map(t => `
                    <div class="track-row">
                        <span><strong>${t.title}</strong> &mdash; ${t.artists.join(', ')}</span>
                        <span style="color:var(--fg-muted)">${t.album}</span>
                    </div>
                `).join('');
            };
            
            renderTracks(tracks);
            
            document.getElementById('spotify-search').oninput = (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = tracks.filter(t => 
                    t.title.toLowerCase().includes(query) ||
                    t.album.toLowerCase().includes(query) ||
                    t.artists.some(a => a.toLowerCase().includes(query))
                );
                renderTracks(filtered);
            };
        }
    } catch(e) {}
};