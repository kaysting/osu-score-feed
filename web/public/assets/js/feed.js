import mods from './data/mods.js';
import filterDefs from './config/feedFilterDefinitions.js';
import buildScoreHTML from './components/scoreCard.js';

// Get elements
const btnEditFilters = $('#editFilters');
const elFilters = $('#filters');
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
    if (def.userDefault !== undefined && !query.get('filtered')) userFilters[def.key] = def.userDefault;

    // Collect query params
    switch (def.type) {
        case 'set': {
            const value = query.get(def.key);
            if (!value) break;
            userFilters[def.key] = new Set(value.split(','));
            break;
        }
        case 'number': {
            const valueStr = query.get(def.key);
            const value = Number(valueStr);
            if (!valueStr || isNaN(value)) break;
            userFilters[def.key] = value;
            break;
        }
        case 'string': {
            const value = query.get(def.key);
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
const updateFilters = () => {
    // Wipe filter UI
    elFilters.innerHTML = '';
    elFilters.append(btnEditFilters);

    // Update query param in address bar
    const params = { filtered: true };
    for (const def of filterDefs) {
        const value = userFilters[def.key];
        if (value === undefined) continue;
        if (def.type == 'set') {
            params[def.key] = Array.from(value).join(',');
        } else {
            params[def.key] = value.toString();
        }
    }
    const newQuery = new URLSearchParams(params).toString();
    window.history.replaceState(null, '', `?${newQuery}`);

    const getFilterButton = (label, onClick) => {
        const btn = document.createElement('button');
        btn.classList.add('btn', 'small', 'tertiary', 'outline');
        btn.title = `Click to remove`;
        btn.innerHTML = /*html*/ `
                <span class="label">${escapeHTML(label)}</span>
                <span class="symbol">close</span>
            `;
        btn.addEventListener('click', onClick);
        return btn;
    };

    // Render new filter buttons
    for (const def of filterDefs) {
        const value = userFilters[def.key];
        if (value === undefined) continue;
        const getDisplayValue = def.getDisplayValue ? def.getDisplayValue : v => v;
        let btn;
        if (def.type == 'set') {
            for (const v of value) {
                elFilters.append(
                    getFilterButton(`${def.label}: ${getDisplayValue(v) || v}`, () => {
                        value.delete(v);
                        if (value.size == 0) delete userFilters[def.key];
                        updateFilters();
                    })
                );
            }
        } else {
            elFilters.append(
                getFilterButton(`${def.label}: ${getDisplayValue(value) || value}`, () => {
                    delete userFilters[def.key];
                    updateFilters();
                })
            );
        }
    }
};
updateFilters();

btnEditFilters.addEventListener('click', () => {
    const el = createElement('div.flex.col.gap-8#filterForm');
    for (const def of filterDefs) {
        el.insertAdjacentHTML(
            'beforeend',
            /*html*/ `
                <section class="card flex col gap-8" style="padding: 12px">
                    <h3 class="no-margin text-16 text-semibold text-bright">${def.header || def.label}</h3>
                </section>
            `
        );
    }
    showModal('Feed Filters', el, [
        {
            label: 'Cancel',
            class: 'text'
        },
        {
            label: 'Apply',
            onClick: () => {}
        }
    ]);
});

// Function to recursively add scores to the UI from the pending array
const scoresPendingDisplay = [];
let delayBetweenScores = 0;
let isScoreQueueEmpty = true;
const displayNextScore = () => {
    // Try again in 500ms if the window is hidden
    if (document.hidden) return setTimeout(displayNextScore, 500);

    // Get the next score
    const score = scoresPendingDisplay.shift();
    if (score) {
        // Remove the empty element
        elEmpty.remove();
        // Append the score and init image loading states
        elFeed.insertAdjacentHTML('afterbegin', buildScoreHTML(score));
        const el = elFeed.firstElementChild;
        initImageLoadStates(el);

        // Force reflow and animate in
        void el.offsetHeight;
        el.classList.remove('new');

        // If the queue was empty before this score,
        // set the delay between score displays so all queued scores
        // are displayed within 500ms
        if (isScoreQueueEmpty) {
            delayBetweenScores = 500 / scoresPendingDisplay.length;
            isScoreQueueEmpty = false;
        }
        setTimeout(displayNextScore, delayBetweenScores);
    } else {
        isScoreQueueEmpty = true;
        setTimeout(displayNextScore, 500);
        while (elFeed.children.length > 100) {
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
