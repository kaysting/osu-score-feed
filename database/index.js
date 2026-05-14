const Database = require('./Database');

class OsuScoreFeedDatabase extends Database {}

module.exports = OsuScoreFeedDatabase.open({
    databaseFile: 'osuScoreFeed.db'
});
