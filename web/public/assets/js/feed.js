document.addEventListener('DOMContentLoaded', () => {
    const btnAddFilter = $('#addFilter');
    const btnClearFeed = $('#clearFeed');
    const elStatusCont = $('#statusCont');
    const elStatusSymbol = $('#statusSymbol');
    const elStatusText = $('#statusText');
    const elFeed = $('#scores');

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

    const renderScoreHTML = score => {
        return /*html*/ `
            <a href="${score.url}" class="entry">
                <div class="map flex col gap-4">
                    <div class="flex row gap-8 align-center">
                        <span class="pill status ${score.beatmap.status}">${score.beatmap.status.toUpperCase()}</span>
                        <span class="artist text-12">${score.beatmapset.artist}</span>
                    </div>
                    <span class="title text-14 text-medium text-bright">${score.beatmapset.title}</span>
                    <div class="flex row gap-8 align-center">
                        <img src="/assets/images/ruleset-icons/${score.mode}.svg" class="mode">
                        <span class="pill stars flex row gap-4 align-center">
                            <span class="symbol filled">star</span>
                            <span>${score.beatmap.stars.toFixed(2)}</span>
                        </span>
                        <span class="version text-12">${score.beatmap.version}</span>
                    </div>
                </div>
                <div class="score flex row gap-16">
                    <img src="${score.user.avatar_url}" class="avatar">
                    <div class="flex col gap-4 flex-grow justify-center">
                        <span class="username text-medium text-15">${score.user.name}</span>
                        <div class="flex row gap-4 flags">
                            <img src="/assets/images/flags/${score.user.country.code.toUpperCase()}.png" class="flag country">
                            <img src="${score.user.team?.flag_url}" class="flag team" style="${score.user.team?.id ? 'display: none' : ''}">
                        </div>
                    </div>
                </div>
            </a>
        `;
    };

    const pendingScores = [];
    const appendScores = () => {
        if (document.hidden) return setTimeout(appendScores, 500);
        const score = pendingScores.shift();
        if (score) {
            elFeed.insertAdjacentHTML('afterbegin', renderScoreHTML(score));
            initImageLoadStates(elFeed.firstElementChild);
            setTimeout(appendScores, 25);
        } else {
            setTimeout(appendScores, 500);
            while (elFeed.children.length > 500) {
                elFeed.lastElementChild.remove();
            }
        }
    };
    appendScores();

    let lastScoreSpeedCheck = Date.now();
    let scoreSpeedCheckCount = 0;
    client.on('scores', scores => {
        // Update scores/sec display
        scoreSpeedCheckCount += scores.length;
        const secsSinceLastSpeedCheck = (Date.now() - lastScoreSpeedCheck) / 1000;
        if (secsSinceLastSpeedCheck > 30) {
            const scoresPerSec = Math.floor(scoreSpeedCheckCount / secsSinceLastSpeedCheck);
            elStatusText.innerText = `Live - ${scoresPerSec} scores/sec`;
        }

        // Filter scores
        for (const score of scores) {
            // Test filters
            if (score.pp < 100) continue;
            if (score.mode !== 'osu') continue;

            // Passed all filters, push to display queue
            pendingScores.push(score);
        }

        // Remove old scores from queue if the queue is too long
        while (pendingScores.length > 100) {
            pendingScores.shift();
        }
    });
});
