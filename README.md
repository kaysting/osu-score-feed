# osu-score-feed

A live osu! score feed that logs newly submitted osu! scores, with a versatile filtering system.

![Social Image](/web/public/assets/images/social.png)

This project builds on top of [osu-score-cache](https://osc.kaysting.dev), a real-time WebSocket that broadcasts raw data for newly submitted osu! scores. osu-score-feed takes the raw data feed from oSC, fetches additional user/beatmap metadata, and rebroadcasts it on its own socket for consumption by the webapp or devs needing a dead simple score feed solution.

Documentation for the socket's broadcast format will be added soon.
