# osu-score-feed

A live feed of newly submitted osu! scores with advanced filtering capabilities.

![Social Image](/web/public/assets/images/social.png)

This project builds on top of [osu-score-cache](https://osc.kaysting.dev), a real-time WebSocket that broadcasts raw data for newly submitted osu! scores. osu-score-feed takes the raw data feed from oSC, fetches additional user/beatmap metadata, and rebroadcasts it on its own socket for consumption by the webapp or devs needing a dead simple score feed solution.

Documentation for the socket's broadcast format will be added soon.

## Contributing

Feel free to make small changes and submit pull requests, but if you'd like to make larger architectural changes, please reach out to <kayla@kaysting.dev> or @kaysting on Discord first.

Suspected vibe-coded contributions will be rejected without question. If you use AI to assist with writing code, please thoroughly review its output.

## AI disclosure

This codebase is 99.9% human-written and 100% human reviewed.

Google Gemini assisted in database optimization, UI layout brainstorming, and complex UI bugfixes, but contributed little to no code to this project.
