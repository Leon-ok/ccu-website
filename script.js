// This script handles fetching the data.json and updating the UI

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        // Add a timestamp to prevent caching
        const response = await fetch('data.json?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Error fetching data:', error);
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
