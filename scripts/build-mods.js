const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Paths
const SVG_OVERLAYS_DIR = path.join(__dirname, 'mods');
const SVG_BASE_PATH = path.join(__dirname, `mods/blanks/mod-icon.svg`);
const OUTPUT_DIR = path.join(__dirname, '../web/public/assets/images/mod-icons');

// Colors
const COLOR_HUES = {
    DifficultyReduction: 90,
    DifficultyIncrease: 0,
    Automation: 200,
    Conversion: 255,
    System: 45
};
const COLOR_SATURATION = 100;
const COLOR_BG_LIGHTNESS = 70;
const COLOR_FG_LIGHTNESS = 23;

// Make sure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Read mod data
const modData = require('../web/public/assets/data/mods.json');
const mods = {};

for (const mode of modData) {
    for (const mod of mode.Mods) {
        if (mods[mod.Acronym]) continue;

        const svgName = `mod-${mod.Name.toLowerCase().replace(/ /g, '-')}.svg`;
        const svgPath = path.join(SVG_OVERLAYS_DIR, svgName);

        if (!fs.existsSync(svgPath)) {
            console.warn(`Can't find ${svgPath}, skipping`);
            continue;
        }

        mods[mod.Acronym] = {
            acronym: mod.Acronym,
            type: mod.Type,
            svg: fs.readFileSync(svgPath, 'utf-8')
        };
    }
}

// Read the base layer
const baseSvgRaw = fs.readFileSync(SVG_BASE_PATH, 'utf-8');
let generateCount = 0;

for (const mod of Object.values(mods)) {
    const hue = COLOR_HUES[mod.type] ?? 0;
    const bgColor = `hsl(${hue}, ${COLOR_SATURATION}%, ${COLOR_BG_LIGHTNESS}%)`;
    const fgColor = `hsl(${hue}, ${COLOR_SATURATION}%, ${COLOR_FG_LIGHTNESS}%)`;

    // Everything below this point was written by Gemini
    // I can't be bothered to deal in raw SVG lol

    // 1. Load and color the Base Hexagon
    const $base = cheerio.load(baseSvgRaw, { xmlMode: true });
    $base('path, polygon, rect').attr('fill', bgColor);

    // 2. Load the Overlay Icon
    const $overlay = cheerio.load(mod.svg, { xmlMode: true });

    // 3. Target ONLY visible structural shapes (Ignore the internal mechanics of masks/defs)
    $overlay('path, rect, circle, polygon, polyline, line').each((_, el) => {
        const $el = $overlay(el);

        // LEAVE IT ALONE if it's inside a mask or defs!
        if ($el.closest('mask, defs, clipPath').length > 0) return;

        const fill = $el.attr('fill');
        const stroke = $el.attr('stroke');

        // Color it if it has an explicit fill
        if (fill && fill !== 'none' && fill !== 'transparent') {
            $el.attr('fill', fgColor);
        }
        // If it has NO fill and NO stroke, standard SVG behavior renders it solid black.
        // We catch that here and explicitly color it our foreground color.
        else if (!fill && (!stroke || stroke === 'none')) {
            $el.attr('fill', fgColor);
        }

        // Color the stroke if it has one
        if (stroke && stroke !== 'none' && stroke !== 'transparent') {
            $el.attr('stroke', fgColor);
        }
    });

    // 4. Strip hardcoded dimensions from the overlay so it scales to fit the base
    const $overlaySvg = $overlay('svg');
    $overlaySvg.removeAttr('width').removeAttr('height');

    // 5. Inject the overlay straight into the base SVG and save!
    $base('svg').append($overlaySvg);
    const outPath = path.join(OUTPUT_DIR, `${mod.acronym}.svg`);
    fs.writeFileSync(outPath, $base.xml());

    generateCount++;
}

console.log(`Successfully generated ${generateCount} perfectly transparent mod icons!`);
