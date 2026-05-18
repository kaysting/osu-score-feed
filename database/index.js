const Database = require('./Database');

class OsuScoreFeedDatabase extends Database {
    /**
     * Add an item to the API cache.
     * @param {string} type Data type.
     * @param {string} id Entry ID.
     * @param {Object} data Entry data (will be stringified).
     * @returns Run result.
     */
    addToCache(type, id, data) {
        return this.run(
            `INSERT OR REPLACE INTO api_cache (type, id, data, time_saved)
            VALUES (?, ?, ?, ?)`,
            [type, id, JSON.stringify(data), Date.now()]
        );
    }

    /**
     * Delete API cache entries saved before a certain threshold.
     * @param {string} type Data type.
     * @param {number} maxAgeMs Delete entries older than this number of milliseconds.
     * @returns Run result.
     */
    purgeCache(type, maxAgeMs = 1000 * 60 * 60 * 24) {
        const minTimestamp = Date.now() - maxAgeMs;
        return this.run(`DELETE FROM api_cache WHERE type = ? AND time_saved < ?`, [type, minTimestamp]);
    }

    /**
     * Get an item from the API cache.
     * @param {string} type Data type.
     * @param {string} id Entry ID.
     * @returns {Object|null} Entry data or `null` on error or nonexistence.
     */
    readFromCache(type, id) {
        try {
            const json = this.get(`SELECT data FROM api_cache WHERE type = ? AND id = ?`, [type, id])?.data;
            const data = JSON.parse(json);
            return data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Filter IDs of a single type that aren't in the cache.
     * @param {string} type Data type.
     * @param {(string|number)[]} ids List of IDs.
     */
    filterUncachedIds(type, ids) {
        const cachedIds = this.all(
            `SELECT id FROM api_cache
            WHERE type = ? AND id IN (${ids.map(id => '?').join(', ')})`,
            [type, ...ids]
        ).map(e => e.id);
        const cachedIdsSet = new Set(cachedIds);
        return ids.filter(id => !cachedIdsSet.has(id));
    }
}

/** @type {OsuScoreFeedDatabase} */
module.exports = OsuScoreFeedDatabase.open({
    databaseFile: 'osuScoreFeed.db'
});
