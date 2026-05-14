CREATE TABLE
    IF NOT EXISTS 'api_cache' (
        type TEXT, -- user, beatmap, beatmapset, etc.
        id INTEGER, -- resource id for deduplication
        time_saved INTEGER NOT NULL, -- time saved so we can delete it later
        data BLOB NOT NULL, -- raw data
        PRIMARY KEY (type, id)
    )