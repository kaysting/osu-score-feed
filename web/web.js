/**
 * web.js
 *
 * The webserver's Express routes.
 */

const path = require('path');

module.exports = app => {
    // Set up EJS for templating
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Trust proxy if behind one
    app.set('trust proxy', 1);
};
