import mods from '../data/mods.js';

/**
 * Filter test callback.
 * @callback FilterTestCallback
 * @param {Object} score The score object to test.
 * @param {any} value The value to test the score against. This is the value currently set for the filter.
 * @returns {boolean} Test result, where `true` is passing.
 */

/**
 * Filter get display value callback.
 * @callback FilterDisplayValueCallback
 * @param {any} value The current filter value.
 * @returns {any} The formatted value.
 */

/**
 * Filter validate input callback.
 * @callback FilterValidateInputCallback
 * @param {string} input The user-inputted string.
 * @returns {string|null|void|false} The validated value or a falsy value to indicate an invalid value.
 */

/**
 * Filter value option.
 * @typedef {Object} FilterValueOption
 * @property {string} label The display text for this value.
 * @property {string} icon A URL of an icon to use on this option.
 * @property {boolean} iconOnly Whether or not only the icon should be shown for this option in the filter editor.
 * @property {any} value The actual value.
 */

/**
 * Score feed filter definition. Accepts a user-provided value to filter specific scores.
 * @typedef {Object} FilterDefinition
 * @property {string} key The ID of this filter, used in the query string and internally.
 * @property {string} label The label for this filter in the UI pills. For `set` filter types, this label is placed next to each individual value and should be singular.
 * @property {type} type The type of value that this filter accepts. Can be `number`, `boolean`, or `set`. Set types use a JavaScript `Set` to store a list of unique values.
 * @property {FilterTestCallback} test A callback function that tests a score against the current filter value, returning a boolean where `true` means the score passes the filter.
 * @property {any} default The default value to use for this filter when one isn't provided by the user. This must be the same datatype as the set `type`.
 * @property {string} [header] The header for this filter's section in the filter editor popup. Defaults to the value of `label`.
 * @property {FilterDisplayValueCallback} [getDisplayValue] A callback function that formats the current filter value for display. If not provided, the value is displayed as-is.
 * @property {FilterValueOption[]} [options] An array of objects with `label` and `value` properties representing the valid values for this filter.
 *
 * These options will be explicitly selectable in the filter editor instead of a textbox when provided.
 * @property {string} [placeholder] A placeholder for the input textbox if one exists.
 * @property {string} [validateInput] A callback function that accepts a user-inputted filter value and validates it, returning the validated (and sanitized) value, or a falsy value indicating the input is invalid.
 * @property {boolean} [gridOptions] Whether or not the checkbox/radio options in the filter editor should be placed in a fixed grid instead of flowing naturally, if `options` is specified.
 *
 * Defaults to `false`.
 */

/** @type {FilterValueOption[]} */
const modes = [
    { label: 'osu!standard', value: 'osu', icon: '/assets/images/ruleset-icons/osu.svg' },
    { label: 'osu!taiko', value: 'taiko', icon: '/assets/images/ruleset-icons/taiko.svg' },
    { label: 'osu!catch', value: 'fruits', icon: '/assets/images/ruleset-icons/fruits.svg' },
    { label: 'osu!mania', value: 'mania', icon: '/assets/images/ruleset-icons/mania.svg' }
];

/** @type {FilterValueOption[]} */
const statuses = [
    { label: 'Ranked', value: 'ranked' },
    { label: 'Approved', value: 'approved' },
    { label: 'Loved', value: 'loved' },
    { label: 'Qualified', value: 'qualified' },
    { label: 'Pending', value: 'pending' },
    { label: 'WIP', value: 'wip' },
    { label: 'Graveyard', value: 'graveyard' }
];

/** @type {FilterValueOption[]} */
const ranks = [
    { label: 'SS', value: 'X', icon: '/assets/images/ranks/X.svg', iconOnly: true },
    { label: 'Silver SS', value: 'XH', icon: '/assets/images/ranks/XH.svg', iconOnly: true },
    { label: 'Silver S', value: 'SH', icon: '/assets/images/ranks/SH.svg', iconOnly: true },
    { label: 'S', value: 'S', icon: '/assets/images/ranks/S.svg', iconOnly: true },
    { label: 'A', value: 'A', icon: '/assets/images/ranks/A.svg', iconOnly: true },
    { label: 'B', value: 'B', icon: '/assets/images/ranks/B.svg', iconOnly: true },
    { label: 'C', value: 'C', icon: '/assets/images/ranks/C.svg', iconOnly: true },
    { label: 'D', value: 'D', icon: '/assets/images/ranks/D.svg', iconOnly: true }
];

/**
 * Score feed filter definitions.
 * @type {FilterDefinition[]}
 */
const filterDefs = [
    {
        key: 'modes',
        label: 'Mode',
        header: 'Modes',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.mode),
        getDisplayValue: value => modes.find(e => e.value == value)?.label || value,
        options: modes
    },
    {
        key: 'ranks',
        label: 'Rank',
        header: 'Ranks',
        type: 'set',
        default: new Set(),
        getDisplayValue: value => ranks.find(e => e.value == value.toUpperCase())?.label || value,
        test: (score, set) => set.size === 0 || set.has(score.rank.toUpperCase()),
        options: ranks
    },
    {
        key: 'acc_min',
        label: 'Min acc',
        header: 'Min accuracy',
        type: 'number',
        default: 0,
        userDefault: 95,
        test: (score, value) => score.accuracy > value,
        getDisplayValue: value => `${value}%`
    },
    {
        key: 'acc_max',
        label: 'Max acc',
        header: 'Max accuracy',
        type: 'number',
        default: 100,
        test: (score, value) => score.accuracy < value,
        getDisplayValue: value => `${value}%`
    },
    {
        key: 'stars_min',
        label: 'Min stars',
        header: 'Min stars',
        type: 'number',
        default: 0,
        userDefault: 5,
        test: (score, value) => score.beatmap.stars > value
    },
    {
        key: 'stars_max',
        label: 'Max stars',
        header: 'Max stars',
        type: 'number',
        default: 9999,
        test: (score, value) => score.beatmap.stars < value
    },
    {
        key: 'pp_min',
        label: 'Min pp',
        header: 'Min pp',
        type: 'number',
        default: 0,
        userDefault: 200,
        test: (score, value) => {
            if (value <= 0 && score.pp === null) return true;
            return score.pp > value;
        }
    },
    {
        key: 'pp_max',
        label: 'Max pp',
        header: 'Max pp',
        type: 'number',
        default: 9999,
        test: (score, value) => score.pp < value
    },
    {
        key: 'fcs_only',
        label: 'FCs only',
        header: 'Only show FCs',
        type: 'bool',
        default: false,
        test: (score, value) => score.is_fc == value
    },
    {
        key: 'statuses',
        label: 'Status',
        header: 'Map status',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.beatmap.status),
        getDisplayValue: value => statuses.find(e => e.value == value)?.label || value,
        options: statuses
    },
    {
        key: 'users',
        label: 'Player',
        header: 'Players',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.user.id.toString()) || set.has(score.user.name),
        placeholder: 'Enter user profile URL, ID, or name',
        validateInput: input => {
            // Attempt to pull ID out of a profile URL
            // If we get a match, set it to input so we parse it as a number below
            const matches = input.match(/\/users?\/(\d+)($|#)/);
            const urlId = matches?.[1];

            // Attempt to parse input as a number (user ID)
            const num = parseInt(Number(urlId || input));
            if (!isNaN(num) && num > 0) return num;

            // Fall back to player name if it's within length range
            console.log(input);
            if (input.length > 2 && input.length < 32) return input;
        }
    },
    {
        key: 'maps',
        label: 'Map',
        header: 'Beatmaps',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.beatmap.id.toString()),
        placeholder: 'Enter beatmap page URL or ID',
        validateInput: input => {
            // Attempt to pull ID out of a profile URL
            // If we get a match, set it to input so we parse it as a number below
            const matches = input.match(/\/beatmapsets\/\d+#\w+\/(\d+)$/);
            const urlId = matches?.[1];

            // Attempt to parse input as a number (user ID)
            const num = parseInt(Number(urlId || input));
            if (!isNaN(num) && num > 0) return num;
        }
    },
    {
        key: 'mods',
        label: 'Mod',
        header: 'Mod combination',
        type: 'set',
        default: new Set(),
        test: (score, set) => {
            if (set.size == 0) return true;
            for (const mod of score.mods) {
                if (set.has(mod.acronym.toUpperCase())) return true;
            }
            return false;
        },
        getDisplayValue: value => mods[value]?.name || value,
        gridOptions: true,
        options: Object.values(mods)
            .sort((a, b) => {
                const types = [
                    'DifficultyReduction',
                    'DifficultyIncrease',
                    'Fun',
                    'Conversion',
                    'Automation',
                    'System'
                ];
                const typeDiff = types.indexOf(a.type) - types.indexOf(b.type);
                if (typeDiff != 0) return typeDiff;
                return a.acronym > b.acronym ? 1 : -1;
            })
            .map(mod => ({
                label: mod.name,
                value: mod.acronym.toUpperCase(),
                icon: `/assets/images/mod-icons/${mod.acronym.toUpperCase()}.svg`
            }))
    }
];

export default filterDefs;
