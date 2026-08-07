let spotifyInterval = null;

window.renderSpotify = async function() {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const container = document.getElementById('spotify-inject');
    container.innerHTML = `
        <h1 style="margin-bottom:20px;">Spotify</h1>
        <p style="font-size:12px; color:var(--fg-muted); margin-bottom:24px;">
            Because direct third-party presence without an API is disabled, please replace the playlist ID below in your source code to show your public Spotify tracks!
        </p>
        
        <div id="liked-songs-section" style="margin-top:10px;">
            <h2>Liked Songs / Top Tracks</h2>
            <div style="margin-top:20px; border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                <iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0" width="100%" height="600" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            </div>
        </div>
    `;
};