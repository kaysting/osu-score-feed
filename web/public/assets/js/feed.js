const rgbToHex = (r, g, b) => {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const starsToColor = stars => {
    const bgPoints = [
        { stars: 0, color: [128, 128, 128] },
        { stars: 0.09, color: [128, 128, 128] },
        { stars: 0.1, color: [64, 146, 250] },
        { stars: 2, color: [78, 255, 214] },
        { stars: 2.5, color: [121, 255, 88] },
        { stars: 3.3, color: [245, 240, 92] },
        { stars: 4, color: [250, 156, 104] },
        { stars: 5, color: [246, 79, 120] },
        { stars: 6, color: [179, 76, 193] },
        { stars: 6.7, color: [99, 98, 220] },
        { stars: 8, color: [0, 0, 0] }
    ];

    const fgPoints = [
        { stars: 0, color: [0, 0, 0] },
        { stars: 6.49999, color: [0, 0, 0] },
        { stars: 6.5, color: [255, 217, 102] },
        { stars: 8.99, color: [255, 217, 102] },
        { stars: 9, color: [246, 246, 85] },
        { stars: 10, color: [255, 127, 102] },
        { stars: 11, color: [235, 71, 153] },
        { stars: 12.5, color: [108, 108, 224] }
    ];

    // Helper to find color based on points range
    const interpolate = (points, val) => {
        // Handle "stars outside of range" by returning min or max color
        if (val <= points[0].stars) return points[0].color;
        if (val >= points[points.length - 1].stars) return points[points.length - 1].color;

        for (let i = 0; i < points.length - 1; i++) {
            const pointA = points[i];
            const pointB = points[i + 1];

            if (val >= pointA.stars && val <= pointB.stars) {
                const ratio = (val - pointA.stars) / (pointB.stars - pointA.stars);
                const r = Math.round(pointA.color[0] + ratio * (pointB.color[0] - pointA.color[0]));
                const g = Math.round(pointA.color[1] + ratio * (pointB.color[1] - pointA.color[1]));
                const b = Math.round(pointA.color[2] + ratio * (pointB.color[2] - pointA.color[2]));
                return [r, g, b];
            }
        }
        return points[0].color; // Fallback
    };

    return {
        bg: rgbToHex(...interpolate(bgPoints, stars)),
        fg: rgbToHex(...interpolate(fgPoints, stars))
    };
};

const filterDefs = [
    {
        key: 'users',
        label: 'Player',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.user.id.toString()) || set.has(score.user.name)
    },
    {
        key: 'modes',
        label: 'Mode',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.mode)
    },
    {
        key: 'statuses',
        label: 'Status',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.beatmap.status)
    },
    {
        key: 'acc_min',
        label: 'Min acc',
        type: 'number',
        default: 0,
        userDefault: 95,
        test: (score, value) => score.accuracy > value
    },
    {
        key: 'acc_max',
        label: 'Max acc',
        type: 'number',
        default: 100,
        test: (score, value) => score.accuracy < value
    },
    {
        key: 'stars_min',
        label: 'Min stars',
        type: 'number',
        default: 0,
        userDefault: 5,
        test: (score, value) => score.beatmap.stars > value
    },
    {
        key: 'stars_max',
        label: 'Max stars',
        type: 'number',
        default: 9999,
        test: (score, value) => score.beatmap.stars < value
    },
    {
        key: 'pp_min',
        label: 'Min pp',
        type: 'number',
        default: 0,
        userDefault: 200,
        test: (score, value) => score.pp > value
    },
    {
        key: 'pp_max',
        label: 'Max pp',
        type: 'number',
        default: 9999,
        test: (score, value) => score.pp < value
    },
    {
        key: 'fcs_only',
        label: 'FCs only',
        type: 'bool',
        default: false,
        test: (score, value) => score.is_fc == value
    }
];

document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const btnAddFilter = $('#addFilter');
    const btnClearFeed = $('#clearFeed');
    const elStatusCont = $('#statusCont');
    const elStatusSymbol = $('#statusSymbol');
    const elStatusText = $('#statusText');
    const elFeed = $('#scores');
    const elEmpty = $('#scores .empty');

    // Define filter objects
    const defaultFilters = {};
    const userFilters = {};

    // Parse query params into applied filters
    const query = new URLSearchParams(window.location.search);
    for (const def of filterDefs) {
        // Set defaults
        if (def.default !== undefined) defaultFilters[def.key] = def.default;
        if (def.userDefault !== undefined) userFilters[def.key] = def.userDefault;

        // Collect query params
        switch (def.type) {
            case 'set': {
                const value = query.get(def.key);
                if (!value) break;
                userFilters[def.key] = new Set(value.split(','));
                break;
            }
            case 'number': {
                const value = Number(query.get(def.key));
                if (!value) break;
                userFilters[def.key] = value;
                break;
            }
            case 'bool': {
                const value = query.get(def.key);
                if (value !== 'true' && value !== 'false') break;
                userFilters[def.key] = value === 'true' ? true : false;
                break;
            }
        }
    }

    // Function to render new filters and update the query string
    const updateFilters = () => {};

    // Function to build an element from score data
    const buildScoreHTML = score => {
        const color = starsToColor(score.beatmap.stars);
        return /*html*/ `
            <a href="${score.url}" target="_blank" class="entry">
                <div class="map flex row gap-12">
                    <img src="${score.beatmapset.thumbnail_url}" alt="Beatmap image" class="thumbnail">
                    <div class="flex col gap-4">
                        <div class="flex row gap-8 align-center">
                            <span class="pill status ${score.beatmap.status}">${score.beatmap.status.toUpperCase()}</span>
                            <span class="artist text-12 text-medium">${score.beatmapset.artist}</span>
                        </div>
                        <span class="title text-14 text-medium text-bright">${score.beatmapset.title}</span>
                        <div class="flex row gap-8 align-center">
                            <img src="/assets/images/ruleset-icons/${score.mode}.svg" alt="Mode: ${score.mode}" class="mode">
                            <span class="pill stars flex row gap-4 align-center" style="--bg: ${color.bg}; --fg: ${color.fg}">
                                <span class="symbol filled">star</span>
                                <span>${score.beatmap.stars.toFixed(2)}</span>
                            </span>
                            <span class="version text-12 text-semibold" style="color: ${score.beatmap.stars > 6.7 ? color.fg : color.bg}">
                                ${score.beatmap.version}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="score flex gap-24 align-center">
                    <div class="flex gap-12 align-center flex-grow">
                        <img src="${score.user.avatar_url}" alt="${score.user.name}'s profile picture" class="avatar">
                        <div class="flex col gap-4 justify-center">
                            <span class="username text-medium text-15">${score.user.name}</span>
                            <div class="flex gap-4 flags">
                                <img
                                    src="/assets/images/flags/${score.user.country.code.toUpperCase()}.png"
                                    alt="${score.user.country.name} flag"
                                    class="flag country"
                                    title="${score.user.country.name}">
                                <img
                                    src="${score.user.team?.flag_url ?? ''}"
                                    alt="${score.user.team?.name} team flag"
                                    class="flag team"
                                    style="${score.user.team?.id ? '' : 'display: none'}"
                                    title="${score.user.team?.name}">
                            </div>
                        </div>
                    </div>
                    <div class="stats flex gap-24">
                        <div class="stat">
                            <div class="name">Score</div>
                            <div class="value">${score.score_standardized.toLocaleString()}</div>
                        </div>
                        <div class="stat">
                            <div class="name">Accuracy</div>
                            <div class="value ${score.accuracy == 100 ? 'max' : ''}">${score.accuracy.toLocaleString(
                                undefined,
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}%</div>
                        </div>
                        <div class="stat">
                            <div class="name">Max Combo</div>
                            <div class="value ${score.is_fc ? 'max' : ''}">
                                ${score.combo.toLocaleString()}x ${!score.is_fc ? /*html*/ `<span class="text-muted">/ ${score.beatmap.max_combo.toLocaleString()}x</span>` : ''}
                            </div>
                        </div>
                        <div class="stat">
                            <div class="name">pp</div>
                            <div class="value ${!score.pp ? 'na' : ''}">${Math.round(score.pp ?? 0).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="flex justify-center">
                        <img src="/assets/images/ranks/${score.rank}.svg" alt="${score.rank} rank" class="rank">
                    </div>
                </div>
            </a>
        `;
    };

    // Function to recursively add scores to the UI from the pending array
    const scoresPendingDisplay = [];
    const displayNextScore = () => {
        if (document.hidden) return setTimeout(displayNextScore, 500);
        const score = scoresPendingDisplay.shift();
        if (score) {
            elEmpty.remove();
            elFeed.insertAdjacentHTML('afterbegin', buildScoreHTML(score));
            initImageLoadStates(elFeed.firstElementChild);
            setTimeout(displayNextScore, 25);
        } else {
            setTimeout(displayNextScore, 500);
            while (elFeed.children.length > 500) {
                elFeed.lastElementChild.remove();
            }
        }
    };
    displayNextScore();

    // Connect to the socket and update live status based on connection status
    const client = io();
    client.on('connect', conn => {
        console.log(`Connected to socket!`);
        elStatusCont.style.color = 'var(--c-action-success)';
        elStatusSymbol.innerText = 'language';
        elStatusText.innerText = 'Live';
    });
    client.on('disconnect', conn => {
        console.log(`Disconnected from socket!`);
        elStatusCont.style.color = 'var(--c-action-danger)';
        elStatusSymbol.innerText = 'warning';
        elStatusText.innerText = 'Offline';
    });

    // Listen for incoming scores
    let lastScoreSpeedCheck = Date.now();
    let scoreSpeedCheckCount = 0;
    client.on('scores', scores => {
        // Update scores/sec display
        scoreSpeedCheckCount += scores.length;
        const secsSinceLastSpeedCheck = (Date.now() - lastScoreSpeedCheck) / 1000;
        if (secsSinceLastSpeedCheck > 30) {
            const scoresPerSec = Math.floor(scoreSpeedCheckCount / secsSinceLastSpeedCheck);
            elStatusText.innerText = `Live - ${scoresPerSec} scores/sec`;
            scoreSpeedCheckCount = 0;
            lastScoreSpeedCheck = Date.now();
        }

        // Check each score against applied filters
        // Scores must pass all filters to be displayed
        const activeFilters = { ...defaultFilters, ...userFilters };
        let passCount = 0;
        for (const score of scores) {
            let passed = true;
            for (const filter of filterDefs) {
                const value = activeFilters[filter.key];
                if (!filter.test(score, value)) {
                    passed = false;
                    break;
                }
            }
            if (!passed) continue;
            scoresPendingDisplay.push(score);
            passCount++;
        }
        console.log(`${passCount} new scores passed active filters:`, activeFilters);

        // Remove old scores from queue if the queue is too long
        while (scoresPendingDisplay.length > 75) {
            scoresPendingDisplay.shift();
        }
    });

    // Empty the score feed and add back the empty element on clear
    const clearFeed = () => {
        elFeed.innerHTML = '';
        elFeed.append(elEmpty);
    };

    btnClearFeed.addEventListener('click', clearFeed);
});
