# osu-score-feed

A live feed logging osu! scores as they're submitted to the osu! servers, with options to filter only scores in a specific mode, with specific mods, from specific users, or worth more than a certain pp value.

This project builds on top of [osu-score-cache](https://osc.kaysting.dev), a real-time WebSocket that broadcasts newly submitted osu! scores. That project intentionally only serves raw score data. osu-score-feed takes the raw data returned by osu-score-cache, fetches additional user/beatmap metadata, and wraps it up into a nice, user-friendly webpage.
