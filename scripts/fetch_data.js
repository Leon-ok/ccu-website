const fs = require('fs');
const axios = require('axios');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '../games.json');
const DATA_FILE = path.join(__dirname, '../data.json');

async function main() {
    try {
        // 1. Read Game IDs
        const gameIds = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));

        if (!gameIds || gameIds.length === 0) {
            console.log('No game IDs found in games.json');
            return;
        }

        console.log(`Processing ${gameIds.length} games...`);

        // 2. Get Universe IDs from Place IDs individually
        // API: https://apis.roblox.com/universes/v1/places/{placeId}/universe
        const universeIds = [];
        const placeIdToUniverseId = {};
        const universeIdToPlaceId = {};

        console.log('Fetching universe IDs...');
        
        await Promise.all(gameIds.map(async (placeId) => {
            try {
                const response = await axios.get(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
                const universeId = response.data.universeId;
                if (universeId) {
                    universeIds.push(universeId);
                    placeIdToUniverseId[placeId] = universeId;
                    universeIdToPlaceId[universeId] = placeId;
                }
            } catch (err) {
                console.error(`Failed to fetch universe ID for place ${placeId}: ${err.message}`);
            }
        }));

        if (universeIds.length === 0) {
            console.log('No valid universe IDs found.');
            return;
        }

        // 3. Get Game Details (Name, Playing, Visits)
        // API: https://games.roblox.com/v1/games?universeIds=...
        const universeIdsQuery = universeIds.join(',');
        const gamesResponse = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universeIdsQuery}`);
        const gamesData = gamesResponse.data.data;

        // 4. Get Thumbnails
        // API: https://thumbnails.roblox.com/v1/games/icons?universeIds=...&size=512x512&format=Png&isCircular=false
        const thumbnailsResponse = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIdsQuery}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
        const thumbnailsData = thumbnailsResponse.data.data;
        
        const thumbnailsMap = {};
        thumbnailsData.forEach(t => {
            thumbnailsMap[t.targetId] = t.imageUrl;
        });

        // 5. Aggregate Data
        let totalPlaying = 0;
        let totalVisits = 0;

        const processedGames = gamesData.map(game => {
            const universeId = game.id;
            const placeId = universeIdToPlaceId[universeId];
            const playing = game.playing || 0;
            const visits = game.visits || 0;
            
            totalPlaying += playing;
            totalVisits += visits;

            return {
                id: universeId,
                placeId: placeId,
                name: game.name,
                playing: playing,
                visits: visits,
                thumbnailUrl: thumbnailsMap[universeId],
                description: game.description
            };
        });

        // Sort by playing count (descending)
        processedGames.sort((a, b) => b.playing - a.playing);

        const output = {
            lastUpdated: new Date().toISOString(),
            totalPlaying: totalPlaying,
            totalVisits: totalVisits,
            games: processedGames
        };

        // 6. Write to data.json
        fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
        console.log('Successfully updated data.json');
        console.log(`Total Players: ${totalPlaying}, Total Visits: ${totalVisits}`);

    } catch (error) {
        console.error('Error fetching data:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

main();
