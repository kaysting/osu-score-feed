/**
 * web.js
 *
 * The webserver's Express routes.
 */

const path = require('path');
const express = require('express');
const utils = require('../lib/utils');

/**
 * Set up the Express app.
 * @param {express.Application} app
 */
module.exports = app => {
    // Set up EJS for templating
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Trust proxy if behind one
    app.set('trust proxy', 1);

    // Log requests
    app.use((req, res, next) => {
        utils.log(`[${req.ip}]`, req.method, req.originalUrl);
        next();
    });

    // Handle static assets
    app.use(express.static('public'));

    // Handle main page
    app.get('/', (req, res) => {});

    // Handle 404
    app.use((req, res) => {});

    // Handle errors
    app.use((err, req, res, next) => {});
};
