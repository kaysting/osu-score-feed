/**
 *
 * A reusable SQLite database class with built in migration logic and abstracted database access methods.
 * Easily extendable to build in domain-specific data methods.
 *
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class Database {
    /** better-sqlite3 database instance. */
    db;
    /** Cache for reusing prepared statements. */
    #prepareCache = new Map();

    /** Please use the `Database.open()` method. */
    constructor() {
        // Nothing happens here
    }

    /**
     * Internal: Execute newly available database migrations.
     * @param {string} migrationsDir A path to a directory containing migration files.
     */
    #migrate(migrationsDir) {
        // Try to create migrations table
        this.run(
            `CREATE TABLE IF NOT EXISTS migrations (
                k TEXT PRIMARY KEY,
                v TEXT NOT NULL
            );`
        );

        // Attempt to get the last applied migration file name from the database
        // It's okay if this is null or undefined since we check for a true value below
        const latestAppliedMigration = this.get(`SELECT v FROM migrations WHERE k = 'latest_file_name'`, [], 'v');

        // Scan for migration files
        const sqlFiles = fs
            .readdirSync(migrationsDir)
            .filter(f => f.toLowerCase().endsWith('.sql'))
            .sort();

        // Apply migrations inside transaction
        this.transaction(() => {
            for (const fileName of sqlFiles) {
                try {
                    // Skip this migration if migrations have been applied and this one
                    // is less than the latest applied via string comparison
                    if (latestAppliedMigration && fileName <= latestAppliedMigration) continue;

                    // Read and execute sql
                    const sql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf-8');
                    this.exec(sql);

                    // Update latest applied migration
                    this.run(`INSERT OR REPLACE INTO migrations (k, v) VALUES (?, ?)`, ['latest_file_name', fileName]);
                } catch (error) {
                    throw new Error(`Error applying migration ${fileName}: ${error}. Changes have been rolled back.`);
                }
            }
        })();
    }

    /**
     * Open a SQLite database and execute migrations.
     *
     * A `migrations` table is created automatically to track applied migrations.
     * @param {Object} [options] Database options.
     * @param {string} [options.databaseFile] A path to the SQLite database file, relative to `Database.js`.
     *
     * A new database is created if it doesn't already exist at this location.
     *
     * Defaults to `storage.db`.
     * @param {string} [options.migrationsDir] A path to a folder containing database migration `.sql` files, relative to `Database.js`.
     *
     * These files are expected to be sortable, ideally starting with 0-padded numbers (`0001`, `0002`, `0013`, etc.).
     *
     * Defaults to `migrations`.
     *
     * @template T
     * @this {new () => T}
     * @returns {T}
     */
    static open(options = {}) {
        // Collect options
        const opts = {
            databaseFile: 'storage.db',
            migrationsDir: 'migrations',
            ...options
        };
        const dbFile = path.join(__dirname, opts.databaseFile);
        const migrationsDir = path.join(__dirname, opts.migrationsDir);

        // Create new instance
        const instance = new this();

        // Open database
        instance.db = sqlite3(dbFile);

        // Set pragmas
        instance.db.pragma('journal_mode = WAL');
        instance.db.pragma('busy_timeout = 15000');
        instance.db.pragma('synchronous = NORMAL');
        instance.db.pragma('auto_vacuum = INCREMENTAL');

        // Execute migrations
        instance.#migrate(migrationsDir);

        // Return
        return instance;
    }

    /**
     * Internal: Get a cached prepared statement or compile it.
     */
    #getStmt(sql) {
        if (!this.#prepareCache.has(sql)) {
            this.#prepareCache.set(sql, this.db.prepare(sql));
        }
        return this.#prepareCache.get(sql);
    }

    /**
     * Fetch a single row or value.
     * @param {string} sql Statement SQL
     * @param {Object|Array} params Prepared parameters.
     * @param {string} [col] Return the value of this column from the result or null if no result.
     */
    get(sql, params = {}, col) {
        const res = this.#getStmt(sql).get(params);
        if (col) return res?.[col] ?? null;
        return res;
    }

    /**
     * Fetch all matching rows.
     * @param {string} sql
     * @param {Object|Array} params
     */
    all(sql, params = {}) {
        return this.#getStmt(sql).all(params);
    }

    /**
     * Execute a query with no output.
     * @param {string} sql
     * @param {Object|Array} params
     * @returns {import('better-sqlite3').RunResult}
     */
    run(sql, params = {}) {
        return this.#getStmt(sql).run(params);
    }

    /**
     * Execute raw SQL.
     * @param {string} sql
     */
    exec(sql) {
        return this.db.exec(sql);
    }

    /**
     * Create a reusable transaction function.
     * @param {Function} fn The function to wrap in a transaction.
     * @returns {Function} A callable function that executes the transaction.
     */
    transaction(fn) {
        return this.db.transaction(fn);
    }
}

module.exports = Database;
