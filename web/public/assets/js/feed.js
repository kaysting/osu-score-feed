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

    // Function to get a filter button element
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
        // If no value is set for this filter, skip
        const value = userFilters[def.key];
        if (value === undefined) continue;

        // Get the display value
        const getDisplayValue = def.getDisplayValue ? def.getDisplayValue : v => v;

        // Render filter button(s)
        // In either case, unset the filter on click and re-render the buttons
        if (def.type == 'set') {
            // If the filter type is set, render a filter button for each individual value
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
            // Otherwise just render one
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
    // Create the element to contain all filters
    const elForm = createElement('form#filterEditor');

    // Loop through filter definitions
    for (const def of filterDefs) {
        // Get the current value of the filter
        // Either the value set by the user or the default
        const value = userFilters[def.key] || def.default;

        // Append the filter's section card with header
        elForm.insertAdjacentHTML(
            'beforeend',
            /*html*/ `
                <section id="filterEditor-${def.key}" class="card flex row align-center flex-wrap gap-12" style="padding: 16px 12px">
                    <h3 class="no-margin text-16 text-medium text-secondary flex-grow">${def.header || def.label}</h3>
                </section>
            `
        );
        const elSection = $(`#filterEditor-${def.key}`, elForm);

        // Make certain types take up the full width
        if (['set', 'string'].includes(def.type)) {
            elSection.classList.remove('align-center');
            elSection.classList.add('fullWidth', 'col');
        }

        // Function to handle changes within checkbox containers
        const handleCheckboxChanges = e => {
            // Get input elements
            const targetInput = $('input', e.target.closest('label'));
            const targetIsAll = targetInput.dataset.isAll === 'true';
            const checkedInputs = $$('input:checked:not([data-is-all="true"])', elCheckboxes);
            const uncheckedInputs = $$('input:not(:checked):not([data-is-all="true"])', elCheckboxes);
            const allInput = $('input[data-is-all="true"]', elCheckboxes);

            // Uncheck all other inputs when all input is checked
            if (targetIsAll && targetInput.checked) {
                checkedInputs.forEach(el => (el.checked = false));
            }

            // Uncheck all input when another input is checked
            if (!targetIsAll && targetInput.checked && allInput) {
                allInput.checked = false;
            }

            // Check all input and uncheck all other inputs if other inputs are either all checked or all unchecked
            // In the event all other inputs are checked, only uncheck them all if there's a defined list of valid values
            // This constraint prevents all user-added options from being unchecked if they're all selected
            if ((uncheckedInputs.length == 0 && def.options.length) || checkedInputs.length == 0) {
                allInput.checked = true;
                checkedInputs.forEach(el => (el.checked = false));
            }
        };

        // If options are defined or will be used, show checkboxes/radios
        // Always initialize checkboxes for set and bool types, or if
        // the definition explicitly provides a list of valid options
        const elCheckboxes = document.createElement('div');
        if (['set', 'bool'].includes(def.type) || def.options) {
            const boolOpts = [
                { label: 'No', value: false },
                { label: 'Yes', value: true }
            ];
            const opts = def.options ?? (def.type == 'bool' ? boolOpts : null) ?? [];

            // Add all option to sets
            if (def.type == 'set') {
                opts.unshift({ label: 'All', value: '', isAllOption: true });
            }

            // Create checkbox container
            if (def.gridOptions) {
                elCheckboxes.classList.add('grid-dynamic');
                elCheckboxes.style.setProperty('--size', '250px');
                elCheckboxes.style.setProperty('--gap', '4px');
            } else {
                elCheckboxes.classList.add('flex', 'gap-4', 'flex-wrap');
            }

            // Loop through options
            const inputType = def.type == 'set' ? 'checkbox' : 'radio';
            for (const opt of opts) {
                // Define input variables
                const image = opt.icon ? `<img src="${opt.icon}" style="height: 20px">` : '';
                const text = opt.iconOnly ? '' : opt.label;
                const isSelected =
                    def.type == 'set'
                        ? value.has(opt.value) || (opt.isAllOption && value.size == 0)
                        : value === opt.value;

                // Append input
                elCheckboxes.insertAdjacentHTML(
                    'beforeend',
                    /*html*/ `
                        <label class="control contained" title="${opt.label}" >
                            <input
                                type="${inputType}"
                                name="${def.key}"
                                value="${opt.value}"
                                ${isSelected ? 'checked' : ''}
                                data-is-all="${opt.isAllOption ? 'true' : 'false'}">
                            ${image} ${text}
                        </label>
                    `
                );
            }

            // Listen for input changes if these are checkboxes
            if (inputType == 'checkbox') elCheckboxes.addEventListener('change', handleCheckboxChanges);

            // Add the checkbox container to the section card
            elSection.append(elCheckboxes);
            initImageLoadStates(elCheckboxes);
        } else if (['string', 'number'].includes(def.type)) {
            // String and number types both use a textbox
            // Define differences ahead of time and use them in the HTML
            const inputType = def.type == 'number' ? 'number' : 'text';
            const width = def.type == 'number' ? 150 : 300;
            const placeholder = def.placeholder || def.default;
            const value = escapeHTML(userFilters[def.key] || '');

            // Append textbox
            elSection.insertAdjacentHTML(
                'beforeend',
                /*html */ `
                    <div class="textbox medium" style="width: ${width}px">
                        <input type="${inputType}" name="${def.key}" placeholder="${placeholder}" value="${value}">
                    </div>
                `
            );
        }

        // For set types that don't include valid options,
        // add a textbox that lets users add their own options to
        // the list of checkboxes
        if (def.type == 'set' && !def.options) {
            // Insert textbox and add button above the checkboxes
            elCheckboxes.insertAdjacentHTML(
                'beforebegin',
                /*html*/ `
                    <div class="flex gap-8 align-center">
                        <div class="textbox medium" style="width: 400px">
                            <input type="text" id="filterEditor-${def.key}-search" placeholder="${def.placeholder}">
                        </div>
                        <button id="filterEditor-${def.key}-add" class="btn circle" title="Add option (Enter)" disabled>
                            <span class="symbol">add</span>
                        </button>
                    </div>
                `
            );
            const textbox = $(`.textbox input`, elSection);
            const btnAdd = $(`button.btn`, elSection);

            const add = () => {
                // Get validated value
                if (!def.validateInput) console.warn(`Filter ${def.key} has no input validation callback`);
                const valueFinal = def.validateInput ? def.validateInput(textbox.value) : textbox.value;
                if (!valueFinal) return;

                // Reset textbox and button
                textbox.value = '';
                btnAdd.disabled = true;

                // Append checkbox
                const valueEscaped = escapeHTML(valueFinal);
                elCheckboxes.insertAdjacentHTML(
                    'beforeend',
                    /*html*/ `
                        <label class="control contained" title="${valueEscaped}" >
                            <input type="checkbox" name="${def.key}" value="${valueEscaped}" checked>
                            ${valueEscaped}
                        </label>
                    `
                );
                const input = $('input', elCheckboxes.lastElementChild);
                handleCheckboxChanges({ target: input });
            };

            textbox.addEventListener('input', () => {
                const value = textbox.value;
                if (!def.validateInput) {
                    btnAdd.disabled = false;
                }
                btnAdd.disabled = !def.validateInput(value);
            });

            textbox.addEventListener('keydown', e => {
                if (e.key == 'Enter') {
                    add();
                }
            });

            btnAdd.addEventListener('click', add);
        }
    }

    // Function to apply changes
    const apply = () => {
        const data = new FormData(elForm);
        console.log(data);
    };

    // Show modal
    showModal(
        'Feed Filters',
        elForm,
        [
            {
                label: 'Reset',
                class: 'text danger',
                href: '/'
            },
            {
                label: 'Cancel',
                class: 'text'
            },
            {
                label: 'Apply',
                onClick: apply
            }
        ],
        {
            width: 900,
            height: 1000,
            expandWidth: true
        }
    );
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

// Connect to the socket
const client = io();

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
    lastScoreSpeedCheck = Date.now();
    scoreSpeedCheckCount = 0;
});

// Empty the score feed and add back the empty element on clear
const clearFeed = () => {
    elFeed.innerHTML = '';
    elFeed.append(elEmpty);
};

btnClearFeed.addEventListener('click', clearFeed);
