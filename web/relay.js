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
        // Get batch of scores
        const scores = pendingScores.splice(0, 50);

        // Stop if there aren't any scores or if there aren't any connected clients
        if (scores.length == 0 || io.engine.clientsCount == 0) {
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

            // Only log if there's stuff we need to fetch
            if (missingUserIds.length > 0 && missingMapIds.length > 0) {
                const userCachePercent = 100 - Math.round((missingUserIds.length / uniqueUserIds.size) * 100);
                const mapCachePercent = 100 - Math.round((missingMapIds.length / uniqueMapIds.size) * 100);
                utils.log(
                    `Fetching data for ${missingUserIds.length} users and ${missingMapIds.length} beatmaps (${userCachePercent}% of users and ${mapCachePercent}% of maps are cached)...`
                );
            }

            // Get users
            if (missingUserIds.length > 0) {
                const resUsers = await osu.get('/users', { ids: missingUserIds });
                for (const user of resUsers.users) {
                    db.addToCache('user', user.id, user);
                }
            }

            // Get maps
            if (missingMapIds.length > 0) {
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

                const modeString = {
                    0: 'osu',
                    1: 'taiko',
                    2: 'fruits',
                    3: 'mania'
                }[score.ruleset_id];
                const scoreMinimal = {
                    url: `https://osu.ppy.sh/scores/${score.id}`,
                    id: score.id,
                    time_ended: new Date(score.ended_at).toISOString(), // just to ensure consistent formatting
                    mode: modeString,
                    accuracy: utils.num(score.accuracy * 100, 2),
                    rank: score.rank, // by lazer standards
                    pp: utils.num(score.pp, 2) ?? null,
                    score_standardized: score.total_score, // lazer standardized
                    score_classic: score.classic_total_score, // lazer classic
                    combo: score.max_combo,
                    is_fc: score.is_perfect_combo, // by lazer standards
                    mods: score.mods,
                    hitcount: {
                        perfect: score.statistics.perfect ?? 0,
                        great: score.statistics.great ?? 0,
                        good: score.statistics.good ?? 0,
                        ok: score.statistics.ok ?? 0,
                        meh: score.statistics.meh ?? 0,
                        miss: score.statistics.miss ?? 0
                    },
                    user: {
                        url: `https://osu.ppy.sh/users/${user.id}`,
                        id: user.id,
                        name: user.username,
                        country: user.country,
                        avatar_url: user.avatar_url,
                        cover_url: user.cover.url,
                        team: user.team
                    },
                    beatmap: {
                        url: `https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset.id}#${modeString}/${beatmap.id}`,
                        id: beatmap.id,
                        version: beatmap.version,
                        status: beatmap.status,
                        cs: utils.num(beatmap.cs, 2),
                        ar: utils.num(beatmap.ar, 2),
                        od: utils.num(beatmap.accuracy, 2),
                        hp: utils.num(beatmap.drain, 2),
                        bpm: utils.num(beatmap.bpm, 2),
                        length: beatmap.total_length,
                        max_combo: beatmap.max_combo,
                        stars: utils.num(beatmap.difficulty_rating, 2)
                    },
                    beatmapset: {
                        url: `https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset.id}`,
                        id: beatmap.beatmapset.id,
                        title: beatmap.beatmapset.title,
                        artist: beatmap.beatmapset.artist,
                        mapper: beatmap.beatmapset.creator,
                        cover_url: beatmap.beatmapset.covers['cover@2x'],
                        thumbnail_url: beatmap.beatmapset.covers['list@2x']
                    }
                };
                scoresMinimal.push(scoreMinimal);

                // debug
                if (user.username == 'kaysting') {
                    console.log(JSON.stringify(scoreMinimal, null, 2));
                }
            }

            // Broadcast scores
            io.emit('scores', scoresMinimal);
            utils.log(`Broadcasted ${scores.length} scores to ${io.engine.clientsCount} clients`);
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
