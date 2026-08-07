window.renderSpotify = async function() {
    const container = document.getElementById('spotify-inject');
    container.innerHTML = '<h2>My Spotify</h2><div id="spotify-status">Loading live status...</div>';
    
    try {
        const res = await fetch('https://api.lanyard.rest/v1/users/989414384679927838');
        const json = await res.json();
        const data = json.data;
        
        if (data && data.listening_to_spotify && data.spotify) {
            const sp = data.spotify;
            container.innerHTML += `
                <div class="spotify-container">
                    <div class="spotify-title">CURRENTLY LISTENING</div>
                    <div class="spotify-track">${sp.song}</div>
                    <div class="spotify-artist">by ${sp.artist}</div>
                    <div style="margin-top: 10px; font-size: 11px; color: var(--fg-muted);">on ${sp.album}</div>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="spotify-container">
                    <div class="spotify-title">CURRENTLY LISTENING</div>
                    <div class="spotify-track">Nothing playing right now</div>
                </div>
            `;
        }
        document.getElementById('spotify-status').style.display = 'none';
    } catch(e) {
        document.getElementById('spotify-status').textContent = 'Failed to load Spotify data.';
    }
};