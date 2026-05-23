import { starsToColor } from '../utils.js';
import mods from '../data/mods.js';

export default score => {
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
            <div class="mods flex gap-4 flex-wrap justify-end" style="min-width: 40px">
                ${modsHtml}
            </div>
        `;
    }

    return /*html*/ `
        <div class="entryCont new">
            <a href="${score.url}" target="_blank" class="minimal flex row gap-8 align-center">
                <img src="/assets/images/ruleset-icons/${score.mode}.svg" alt="Mode: ${score.mode}" class="mode">
                <img src="/assets/images/ranks/${score.rank}.svg" alt="${score.rank} rank" class="rank">
                <div class="inner flex row gap-8 align-center flex-grow">
                    <span class="map flex-grow">
                        <span>
                            <span class="text-medium">${escapeHTML(score.beatmapset.title)}</span>
                            <span class="text-12">by ${escapeHTML(score.beatmapset.artist)}</span>
                        </span>
                        <br><span class="text-12 text-medium" style="color: ${score.beatmap.stars > 6.7 ? color.fg : color.bg}">${escapeHTML(score.beatmap.version)}</span>
                        <br><span class="text-12">Set by <span class="text-semibold">${escapeHTML(score.user.name)}</span></span>
                    </span>
                    ${modsHtml}
                    <div class="score flex text-16 flex-no-shrink" style="gap: 8px 16px;">
                        <div class="flex-no-shrink text-right acc">${score.accuracy.toFixed(2)}%</div>
                        <div class="flex-no-shrink text-medium text-accent pp">${Math.round(score.pp).toLocaleString()}pp</div>
                    </div>
                </div>
            </a>
        </div>
    `;
};
