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

module.exports = async io => {};
