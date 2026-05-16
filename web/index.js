/**
 * index.js
 *
 * The entrypoint for the webserver process that registers its
 * components and starts listening for requests.
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const utils = require('../lib/utils');

// Initialize server and components
const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
    cors: {
        origin: '*'
    }
});

// Register Express routes
require('./web')(app);

// Start score relay
require('./relay')(io);

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    utils.log(`Server listening on port ${PORT}`);
});
