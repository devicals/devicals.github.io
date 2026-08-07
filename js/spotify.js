let spotifyInterval = null;

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:20px;">Spotify</h1>
        <div id="spotify-status">Checking live Spotify status...</div>
        
        <div id="liked-songs-section" style="margin-top:40px;">
            <h2>Public Liked Songs</h2>
            <p style="font-size:12px; color:var(--fg-muted); margin-bottom:16px;">
                Replace the URL in the iframe source inside js/spotify.js with your public Spotify playlist link to display your songs.
            </p>
            <iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0" width="100%" height="450" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
    `;
    
    const fetchStatus = async () => {
        try {
            const res = await fetch('https://api.lanyard.rest/v1/users/989414384679927838');
            const json = await res.json();
            const data = json.data;
            
            const statusBox = document.getElementById('spotify-status');
            if(!statusBox) return; // Unmounted

            if (data && data.listening_to_spotify && data.spotify) {
                const sp = data.spotify;
                statusBox.innerHTML = `
                    <div class="spotify-container" style="border-radius:12px !important;">
                        <div class="spotify-title">CURRENTLY PLAYING ON SPOTIFY</div>
                        <div class="spotify-track">${sp.song}</div>
                        <div class="spotify-artist">by ${sp.artist}</div>
                        <div style="margin-top: 8px; font-size: 11px; color: var(--fg-muted);">Album: ${sp.album}</div>
                    </div>
                `;
            } else {
                statusBox.innerHTML = `
                    <div class="spotify-container" style="border-radius:12px !important;">
                        <div class="spotify-title">CURRENTLY PLAYING ON SPOTIFY</div>
                        <div class="spotify-track" style="color:var(--fg-muted);">Offline / Not playing right now</div>
                    </div>
                `;
            }
        } catch(e) {
            const statusBox = document.getElementById('spotify-status');
            if(statusBox) statusBox.textContent = 'Live Spotify presence unavailable.';
        }
    };

    await fetchStatus();
    spotifyInterval = setInterval(fetchStatus, 5000);
};