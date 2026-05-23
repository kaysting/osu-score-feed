import { starsToColor } from '../utils.js';
import mods from '../data/mods.js';

export default (score = {}, useClassicScore = false) => {
    const color = starsToColor(score.beatmap.stars);

    let modsHtml = '';
    if (score.mods.length > 0) {
        for (const mod of score.mods) {
            const acronym = mod.acronym?.toUpperCase();
            const meta = mods[acronym];
            if (!meta) {
                console.warn(`Mod ${acronym} not recognized`);
                continue;
            }
            modsHtml += /*html*/ `
                <img src="/assets/images/mod-icons/${acronym}.svg" alt="${meta.name}" title="${meta.name}">
            `;
        }
        modsHtml = /*html*/ `
            <div class="mods flex gap-4 flex-wrap justify-end">
                ${modsHtml}
            </div>
        `;
    }

    return /*html*/ `
        <div class="entryCont new">
            <a href="${score.url}" target="_blank" class="flex col">
                <div class="map flex row gap-12 align-center justify-center">
                    <div class="inner flex row gap-12 align-center flex-grow">
                        <img src="${score.beatmapset.thumbnail_url}" alt="Beatmap image" class="thumbnail">
                        <div class="flex col gap-4">
                            <div class="flex row gap-8 align-center">
                                <span class="pill status ${score.beatmap.status}">${score.beatmap.status.toUpperCase()}</span>
                                <span class="artist text-12 text-medium">${escapeHTML(score.beatmapset.artist)}</span>
                            </div>
                            <span class="title text-14 text-medium text-bright">${escapeHTML(score.beatmapset.title)}</span>
                            <div class="flex row gap-8 align-center">
                                <img src="/assets/images/ruleset-icons/${score.mode}.svg" alt="Mode: ${score.mode}" class="mode">
                                <span class="pill stars flex row gap-4 align-center" style="--bg: ${color.bg}; --fg: ${color.fg}">
                                    <span class="symbol filled">star</span>
                                    <span>${score.beatmap.stars.toFixed(2)}</span>
                                </span>
                                <span class="version text-12 text-semibold" style="color: ${score.beatmap.stars > 6.7 ? color.fg : color.bg}">
                                    ${escapeHTML(score.beatmap.version)}
                                </span>
                            </div>
                        </div>
                    </div>
                    ${modsHtml}
                </div>
                <div class="score flex gap-24 align-center">
                    <div class="user flex gap-12 align-center flex-grow">
                        <img src="${score.user.avatar_url}" alt="${score.user.name}'s profile picture" class="avatar">
                        <div class="flex col gap-4 justify-center flex-grow">
                            <span class="username text-medium text-15">${escapeHTML(score.user.name)}</span>
                            <div class="flex gap-4 flags">
                                <img
                                    src="/assets/images/flags/${score.user.country.code.toUpperCase()}.png"
                                    alt="${escapeHTML(score.user.country.name)} flag"
                                    class="flag country"
                                    title="${escapeHTML(score.user.country.name)}">
                                <img
                                    src="${score.user.team?.flag_url ?? ''}"
                                    alt="${score.user.team?.name} team flag"
                                    class="flag team"
                                    style="${score.user.team?.flag_url ? '' : 'display: none'}"
                                    title="${score.user.team?.name}">
                            </div>
                        </div>
                    </div>
                    <div class="stats flex" style="gap: 8px 24px">
                        <div class="stat">
                            <div class="name">${useClassicScore ? 'Classic score' : 'Score'}</div>
                            <div class="value">${(useClassicScore ? score.score_classic : score.score_standardized).toLocaleString()}</div>
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
                    <div class="rankCont flex justify-center">
                        <img src="/assets/images/ranks/${score.rank}.svg" alt="${score.rank} rank" class="rank">
                    </div>
                </div>
            </a>
        </div>
    `;
};
