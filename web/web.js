/**
 * web.js
 *
 * The webserver's Express routes.
 */

const path = require('path');
const express = require('express');
const layouts = require('express-ejs-layouts');
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

    // Set locals
    app.locals.title = 'Feed';
    app.locals.metaSiteName = 'osu!feed';
    app.locals.metaTitle = 'Real-time osu! score feed';
    app.locals.metaDescription = `View and filter a live feed of new osu! scores. Limit your feed to certain modes, mods, pp, players, maps, and more.`;
    app.locals.metaThemeColor = '#ebadcc';
    app.locals.metaImage = '/assets/images/social.png';

    // Log requests
    app.use((req, res, next) => {
        utils.log(req.ip, req.method, req.originalUrl);
        next();
    });

    // Use global middleware
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(layouts);

    // Handle main page
    app.get('/', (req, res) => {
        res.render('pages/feed');
    });

    // Handle 404
    app.use((req, res) => {
        res.status(404).end(`404 Not Found`);
    });

    // Handle errors
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).end(`500 Internal Server Error`);
    });
};
