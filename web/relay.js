/**
 * relay.js
 *
 * This file handles receiving events from osu-score-cache, fetching
 * user/beatmap data from the osu! API (or cache), and broadcasting minimal
 * JSON objects for each score containing only the data needed to display
 * them on the website.
 */

require('dotenv').config({ quiet: true });

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

    // Listen for new clients
    io.on('connection', socket => {
        utils.log(`Socket ${socket.id} connected (${io.engine.clientsCount} clients connected)`);
    });

    // Initialize client
    const socket = socketIoClient(process.env.OSC_BASE_URL ?? 'https://osc.kaysting.dev', {
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
        // Get batch of scores and stop if there are none
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

            const userCachePercent = Math.round((missingUserIds.length / uniqueUserIds.size) * 100);
            const mapCachePercent = Math.round((missingMapIds.length / uniqueMapIds.size) * 100);
            utils.log(
                `Fetching data for ${missingUserIds.length} users and ${missingMapIds.length} beatmaps (${userCachePercent}% of users and ${mapCachePercent}% of maps are cached)...`
            );

            // Get users
            if (missingUserIds.length) {
                const resUsers = await osu.get('/users', { ids: missingUserIds });
                for (const user of resUsers.users) {
                    db.addToCache('user', user.id, user);
                }
            }

            // Get maps
            if (missingMapIds) {
                const resMaps = await osu.get('/beatmaps', { ids: missingMapIds });
                for (const map of resMaps.beatmaps) {
                    db.addToCache('beatmap', map.id, map);
                }
            }

            // Get data from cache and build front-end score object
            const scoresMinimal = [];
            for (const score of scores) {
                const user = db.readFromCache('user', score.user_id);
                const beatmap = db.readFromCache('beatmap', score.beatmap_id);

                const modes = {
                    0: 'osu',
                    1: 'taiko',
                    2: 'catch',
                    3: 'mania'
                };
                scoresMinimal.push({
                    user: {
                        name: user.username,
                        country: user.country,
                        avatar_url: user.avatar_url,
                        cover_url: user.cover.url,
                        team: user.team
                    },
                    beatmap: {
                        version: beatmap.version,
                        cs: beatmap.cs,
                        ar: beatmap.ar,
                        od: beatmap.accuracy,
                        hp: beatmap.drain,
                        length: beatmap.total_length
                    },
                    beatmapset: {
                        title: beatmap.beatmapset.title,
                        artist: beatmap.beatmapset.artist,
                        mapper: beatmap.beatmapset.creator,
                        cover_url: beatmap.beatmapset.covers['cover@2x']
                    },
                    score: {
                        time_ended: new Date(score.ended_at),
                        accuracy: score.accuracy * 100,
                        rank: score.rank,
                        pp: score.pp || null,
                        score_standardized: score.total_score,
                        score_classic: score.classic_total_score,
                        combo: score.max_combo,
                        mods: score.mods,
                        mode: modes[score.ruleset_id]
                    }
                });
            }

            // Broadcast scores
            io.emit('scores', scoresMinimal);
            utils.log(`Broadcasted ${scores.length} scores`);
        } catch (error) {
            utils.log(`Error processing scores:`, error);
        }

        setTimeout(processScores, 250);
    };
    processScores();

    const purgeCache = () => {
        const MAX_AGE = 1000 * 60 * 60 * 24;
        db.purgeCache('user', MAX_AGE);
        db.purgeCache('beatmap', MAX_AGE);
        setTimeout(purgeCache, 1000 * 60);
    };
    purgeCache();
};
