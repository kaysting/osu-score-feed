/**
 * relay.js
 *
 * This file handles receiving events from osu-score-cache, fetching
 * user/beatmap data from the osu! API (or cache), and broadcasting minimal
 * JSON objects for each score containing only the data needed to display
 * them on the website.
 */

require('dotenv').config({ quiet: true });
const OSC_BASE_URL = process.env.OSC_BASE_URL ?? 'https://osc.kaysting.dev';

const socketIoClient = require('socket.io-client');
const osuApi = require('../lib/OsuAPIv2');
const utils = require('../lib/utils');
const db = require('../database');

module.exports = async io => {
    // Initialize osu API
    const osu = new osuApi({
        clientId: process.env.OSU_CLIENT_ID,
        clientSecret: process.env.OSU_CLIENT_SECRET
    });

    // Initialize client
    const socket = socketIoClient(OSC_BASE_URL, {
        path: '/ws',
        transports: ['websocket'] // avoid http polling
    });

    // Connect to socket
    socket.on('connect', () => {
        socket.emit('subscribe', 'scores');
        utils.log(`Connected to oSC`);
    });

    // Queue incoming scores for processing
    const pendingScores = [];
    socket.on('scores', scores => {
        pendingScores.push(...scores);
    });

    // Process scores in batches of 50
    // We use this batch size to ensure we aren't fetching more than the max
    // number of users/maps at once from the osu api
    const processScores = async () => {
        const scores = pendingScores.splice(0, 50);
        if (!scores.length) {
            setTimeout(processScores, 250);
            return;
        }

        try {
            // Get unique user and map ids in this batch
            const uniqueUserIds = new Set();
            const uniqueMapIds = new Set();
            for (const score of scores) {
                uniqueUserIds.add(score.user_id);
                uniqueMapIds.add(score.beatmap_id);
            }

            // Filter just the ids we don't already have cached
            const missingUserIds = db.filterUncachedIds('user', Array.from(uniqueUserIds));
            const missingMapIds = db.filterUncachedIds('beatmap', Array.from(uniqueMapIds));

            // Get users
            utils.log(`Fetching data for ${missingUserIds.length} users...`);
            const resUsers = await osu.get('/users', { ids: missingUserIds });
            for (const user of resUsers.users) {
                db.addToCache('user', user.id, user);
            }

            // Get maps
            utils.log(`Fetching data for ${missingMapIds.length} beatmaps...`);
            const resMaps = await osu.get('/beatmaps', { ids: missingMapIds });
            for (const map of resMaps.beatmaps) {
                db.addToCache('beatmap', map.id, map);
            }

            // Assign props to scores
            for (const score of scores) {
                score.user = db.readFromCache('user', score.user_id);
                score.beatmap = db.readFromCache('beatmap', score.beatmap_id);

                const modes = {
                    0: 'osu!',
                    1: 'osu!taiko',
                    2: 'osu!catch',
                    3: 'osu!mania'
                };
                console.log(
                    `User ${score.user.username} just got a ${(score.accuracy * 100).toFixed(2)}% ${score.rank} rank on map ${score.beatmap.beatmapset.artist} - ${score.beatmap.beatmapset.title} [${score.beatmap.beatmapset.title}] (${modes[score.ruleset_id]})`
                );
            }
        } catch (error) {
            utils.log(`Error processing scores:`, error);
        }

        setTimeout(processScores, 1000);
    };
    processScores();
};
