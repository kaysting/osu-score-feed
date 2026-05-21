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
 * Filter value option.
 * @typedef {Object} FilterValueOption
 * @property {string} label The display text for this value.
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
 */

/** @type {FilterValueOption[]} */
const modes = [
    { label: 'osu!', value: 'osu' },
    { label: 'osu!taiko', value: 'taiko' },
    { label: 'osu!catch', value: 'fruits' },
    { label: 'osu!mania', value: 'mania' }
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
    { label: 'SS', value: 'X' },
    { label: 'Silver SS', value: 'XH' },
    { label: 'Silver S', value: 'SH' },
    { label: 'S', value: 'S' },
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' },
    { label: 'D', value: 'D' },
    { label: 'F', value: 'F' }
];

/**
 * Score feed filter definitions.
 * @type {FilterDefinition[]}
 */
const filterDefs = [
    {
        key: 'modes',
        label: 'Mode',
        header: 'Mode',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.mode),
        getDisplayValue: value => modes.find(e => e.value == value)?.label || value,
        options: modes
    },
    {
        key: 'mods',
        label: 'Mod',
        header: 'Mods',
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
        options: Object.values(mods).map(mod => ({
            label: mod.name,
            value: mod.acronym.toUpperCase()
        }))
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
        placeholder: 'Enter user ID, name, or profile URL'
    },
    {
        key: 'maps',
        label: 'Map',
        header: 'Beatmaps',
        type: 'set',
        default: new Set(),
        test: (score, set) => set.size === 0 || set.has(score.beatmap.id.toString()),
        placeholder: 'Enter beatmap ID or URL'
    },
    {
        key: 'ranks',
        label: 'Rank',
        header: 'Ranks',
        type: 'set',
        default: new Set(),
        getDisplayValue: value => ranks.find(e => e.value == value.toUpperCase())?.label || value,
        test: (score, set) => set.size === 0 || set.has(score.rank.toUpperCase())
    },
    {
        key: 'acc_min',
        label: 'Min acc',
        header: 'Minimum accuracy',
        type: 'number',
        default: 0,
        userDefault: 95,
        test: (score, value) => score.accuracy > value,
        getDisplayValue: value => `${value}%`,
        placeholder: '75'
    },
    {
        key: 'acc_max',
        label: 'Max acc',
        header: 'Maximum accuracy',
        type: 'number',
        default: 100,
        test: (score, value) => score.accuracy < value,
        getDisplayValue: value => `${value}%`,
        placeholder: '100'
    },
    {
        key: 'stars_min',
        label: 'Min stars',
        header: 'Minimum stars',
        type: 'number',
        default: 0,
        userDefault: 5,
        test: (score, value) => score.beatmap.stars > value,
        placeholder: '5'
    },
    {
        key: 'stars_max',
        label: 'Max stars',
        header: 'Maximum stars',
        type: 'number',
        default: 9999,
        test: (score, value) => score.beatmap.stars < value,
        placeholder: '999'
    },
    {
        key: 'pp_min',
        label: 'Min pp',
        header: 'Minimum pp',
        type: 'number',
        default: 0,
        userDefault: 200,
        test: (score, value) => {
            if (value <= 0 && score.pp === null) return true;
            return score.pp > value;
        },
        placeholder: '200'
    },
    {
        key: 'pp_max',
        label: 'Max pp',
        header: 'Maximum pp',
        type: 'number',
        default: 9999,
        test: (score, value) => score.pp < value,
        placeholder: '2000'
    },
    {
        key: 'fcs_only',
        label: 'FCs only',
        header: 'Only show FCs',
        type: 'bool',
        default: false,
        test: (score, value) => score.is_fc == value
    }
];

export default filterDefs;
