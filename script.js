document.addEventListener('DOMContentLoaded', () => {
    fetchLiveData();
});

async function fetchLiveData() {
    try {
        const placeIds = await fetchPlaceIds();
        if (!placeIds || placeIds.length === 0) throw new Error('No place IDs found');

        const placeDetails = await fetchPlaceDetails(placeIds);
        const universeIds = placeDetails.map(p => p.universeId);
        const universeIdToPlaceId = Object.fromEntries(placeDetails.map(p => [p.universeId, p.placeId]));

        const [gamesData, thumbnailsData] = await Promise.all([
            fetchGameStats(universeIds),
            fetchThumbnails(universeIds),
        ]);

        const thumbnailsMap = Object.fromEntries(thumbnailsData.map(t => [t.targetId, t.imageUrl]));

        let totalPlaying = 0;
        let totalVisits = 0;

        const games = gamesData.map(game => {
            totalPlaying += game.playing || 0;
            totalVisits += game.visits || 0;
            return {
                id: game.id,
                placeId: universeIdToPlaceId[game.id],
                name: game.name,
                playing: game.playing || 0,
                visits: game.visits || 0,
                thumbnailUrl: thumbnailsMap[game.id],
                description: game.description,
            };
        });

        games.sort((a, b) => b.playing - a.playing);

        updateUI({ lastUpdated: new Date().toISOString(), totalPlaying, totalVisits, games });
    } catch (error) {
        console.warn('Live fetch failed, falling back to cached data:', error);
        fetchCachedData();
    }
}

async function fetchPlaceIds() {
    const response = await fetch('games.json');
    if (!response.ok) throw new Error('Failed to load games.json');
    return response.json();
}

async function fetchPlaceDetails(placeIds) {
    const query = placeIds.join(',');
    const response = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${query}`);
    if (!response.ok) throw new Error('Failed to fetch place details');
    return response.json();
}

async function fetchGameStats(universeIds) {
    const query = universeIds.join(',');
    const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${query}`);
    if (!response.ok) throw new Error('Failed to fetch game stats');
    const json = await response.json();
    return json.data;
}

async function fetchThumbnails(universeIds) {
    const query = universeIds.join(',');
    const response = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${query}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
    if (!response.ok) throw new Error('Failed to fetch thumbnails');
    const json = await response.json();
    return json.data;
}

async function fetchCachedData() {
    try {
        const response = await fetch('data.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Cached data not available');
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Error fetching cached data:', error);
        document.getElementById('total-playing').innerText = 'Error';
        document.getElementById('total-visits').innerText = 'Error';
    }
}

function updateUI(data) {
    // Update total stats
    const totalPlaying = data.totalPlaying.toLocaleString();
    const totalVisits = data.totalVisits.toLocaleString();
    
    document.getElementById('total-playing').innerText = totalPlaying;
    document.getElementById('total-visits').innerText = totalVisits;
    
    // Update timestamp
    if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        document.getElementById('last-updated').innerText = date.toLocaleString();
    }

    // Render games list
    const gamesGrid = document.getElementById('games-grid');
    gamesGrid.innerHTML = ''; // Clear current content

    data.games.forEach(game => {
        const card = createGameCard(game);
        gamesGrid.appendChild(card);
    });
}

function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';

    // Fallback image if thumbnail is missing
    const thumbnailSrc = game.thumbnailUrl || 'https://via.placeholder.com/420x236?text=No+Image';

    card.innerHTML = `
        <a href="https://www.roblox.com/games/${game.placeId}" target="_blank" style="text-decoration: none; color: inherit;">
            <img src="${thumbnailSrc}" alt="${game.name}" class="game-thumbnail">
            <div class="game-info">
                <h3 class="game-title" title="${game.name}">${game.name}</h3>
                <div class="game-stats">
                    <div class="stat-item" title="Active Players">
                        <span>👥</span>
                        <span class="stat-value">${game.playing.toLocaleString()}</span>
                    </div>
                    <div class="stat-item" title="Total Visits">
                        <span>👣</span>
                        <span class="stat-value">${formatNumber(game.visits)}</span>
                    </div>
                </div>
            </div>
        </a>
    `;

    return card;
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}
