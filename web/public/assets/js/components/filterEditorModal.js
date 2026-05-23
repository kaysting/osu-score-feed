import filterDefs from '../config/feedFilterDefinitions.js';
import { extractFormData, areSetsEqual } from '../utils.js';

export default userFiltersOld =>
    new Promise(resolve => {
        // Copy the incoming filters
        const userFiltersNew = { ...userFiltersOld };

        // Create the element to contain all filters
        const elForm = createElement('form#filterEditor');

        // Loop through filter definitions
        for (const def of filterDefs) {
            // Get the current value of the filter
            // Either the value set by the user or the default
            const value = userFiltersOld[def.key] || def.default;

            // Append the filter's section card with header
            elForm.insertAdjacentHTML(
                'beforeend',
                /*html*/ `
                <section id="filterEditor-${def.key}" class="card gap-12" style="padding: 16px 12px">
                    <h3 class="no-margin text-16 text-medium text-secondary flex-grow">${def.header || def.label}</h3>
                </section>
            `
            );
            const elSection = $(`#filterEditor-${def.key}`, elForm);

            // Make certain types take up the full width
            if (['set', 'string'].includes(def.type)) {
                elSection.classList.add('fullWidth', 'grid');
            } else {
                elSection.classList.add('flex', 'row', 'align-center', 'flex-wrap');
            }

            // Function to handle changes within checkbox containers
            const handleCheckboxChanges = e => {
                // Get input elements
                const targetInput = $('input', e.target.closest('label'));
                const targetIsAll = targetInput.dataset.isAll === 'true';
                const checkedInputs = $$('input:checked:not([data-is-all="true"])', elCheckboxes);
                const uncheckedInputs = $$('input:not(:checked):not([data-is-all="true"])', elCheckboxes);
                const allInput = $('input[data-is-all="true"]', elCheckboxes);

                // Never allow the all input to be directly unchecked
                if (targetIsAll) {
                    allInput.checked = true;
                }

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
                if ((uncheckedInputs.length == 0 && def.options?.length) || checkedInputs.length == 0) {
                    allInput.checked = true;
                    checkedInputs.forEach(el => (el.checked = false));
                }
            };

            // If options are defined or will be used, show checkboxes/radios
            // Always initialize checkboxes for set and bool types, or if
            // the definition explicitly provides a list of valid options
            const elCheckboxes = document.createElement('div');
            if (def.type == 'set' || def.options) {
                const opts = def.options ? [...def.options] : [];

                // Add all option to sets
                if (def.type == 'set') {
                    opts.unshift({ label: def.allOptionLabel || 'All', value: '', isAllOption: true });
                }

                // Create checkbox container
                elCheckboxes.classList.add('grid-dynamic');
                const defaultGridSize = def.type == 'bool' ? 80 : 250;
                elCheckboxes.style.setProperty('--size', `${def.optionGridSize || defaultGridSize}px`);
                elCheckboxes.style.setProperty('--gap', '4px');
                elCheckboxes.style.width = 'auto';
                elCheckboxes.style.maxWidth = 'auto';

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

                // Function to handle hiding some/showing all options
                let areAllOptionsVisible = false;
                const toggleShowAllOptions = (showAllOptions = null) => {
                    // Invert existing state or force specified state
                    areAllOptionsVisible = showAllOptions ?? !areAllOptionsVisible;
                    console.log(`Toggling visibility of all options in filter ${def.key} to ${areAllOptionsVisible}`);

                    // Update option visibility
                    const els = $$('label', elCheckboxes);
                    if (!areAllOptionsVisible) {
                        // Hide options that aren't checked and that aren't the all option
                        for (const el of els) {
                            const input = $('input', el);
                            const shouldHide = !input.checked && input.dataset.isAll !== 'true';
                            el.style.display = shouldHide ? 'none' : '';
                        }
                    } else {
                        for (const el of els) {
                            el.style.display = '';
                        }
                    }

                    // Update button
                    const btn = $('.expandCollapseButton', elSection);
                    if (btn) {
                        $('.symbol', btn).innerText = !areAllOptionsVisible
                            ? 'keyboard_arrow_down'
                            : 'keyboard_arrow_up';
                        $('.label', btn).innerText = !areAllOptionsVisible
                            ? `Show all ${els.length} options`
                            : 'Show fewer options';
                    }
                };

                // Filter visible options
                const filterOptions = input => {
                    input = input.trim().toLowerCase();
                    if (!input) {
                        // Restore all visible state when the user clears the filter box
                        toggleShowAllOptions(areAllOptionsVisible);
                        return;
                    }

                    // Filter options
                    // Check text components of each option against the input and
                    // make the element visible if any components match
                    const els = $$('label', elCheckboxes);
                    for (const el of els) {
                        let matches = false;
                        const sources = [el.title, $('input', el).value];
                        for (const str of sources) {
                            if (str.toLowerCase().includes(input)) {
                                matches = true;
                            }
                        }
                        el.style.display = matches ? '' : 'none';
                    }
                };

                // Add extra UI when there are a lot of items
                // This UI allows showing all/hiding some items as well as filtering them
                if (opts.length > 15) {
                    // Add filter textbox
                    elCheckboxes.insertAdjacentHTML(
                        'beforebegin',
                        /*html*/ `
                            <div class="textbox medium" style="width: 300px; padding-right: 6px">
                                <input type="text" class="filterTextbox" placeholder="Type to filter options...">
                                <button type="button" class="btn tertiary small circle clearButton" title="Clear">
                                    <span class="symbol">close</span>
                                </button>
                            </div>
                        `
                    );

                    // Add show/hide all button
                    elCheckboxes.insertAdjacentHTML(
                        'afterend',
                        /*html*/ `
                            <div class="flex justify-center">
                                <button type="button" class="btn text expandCollapseButton" style="width: 500px">
                                    <span class="symbol"></span>
                                    <span class="label"></span>
                                </button>
                            </div>
                        `
                    );

                    // Handle filtering visible options
                    const textbox = $('.filterTextbox', elSection);
                    const btnClear = $('.clearButton', elSection);
                    textbox.addEventListener('input', e => {
                        filterOptions(textbox.value || '');
                    });
                    btnClear.addEventListener('click', e => {
                        filterOptions('');
                        textbox.value = '';
                        textbox.focus();
                    });

                    // Toggle showing all options with button
                    const btn = $('.expandCollapseButton', elSection);
                    btn.addEventListener('click', () => toggleShowAllOptions());

                    // Toggle show all options to off to start with
                    toggleShowAllOptions(false);
                }
            } else if (def.type == 'bool') {
                // Append toggle switch
                elSection.insertAdjacentHTML(
                    'beforeend',
                    /*html */ `
                        <input type="checkbox" class="toggle" name="${def.key}" ${value ? 'checked' : ''}>
                    `
                );
            } else if (['string', 'number'].includes(def.type)) {
                // String and number types both use a textbox
                // Define differences ahead of time and use them in the HTML
                const inputType = def.type == 'number' ? 'number' : 'text';
                const width = def.type == 'number' ? 120 : 300;
                const textAlign = def.type == 'number' ? 'center' : 'left';
                const placeholder = escapeHTML(def.placeholder || def.default);
                const value = escapeHTML(userFiltersOld[def.key] || '');

                // Append textbox
                elSection.insertAdjacentHTML(
                    'beforeend',
                    /*html */ `
                        <div class="textbox medium" style="width: ${width}px; padding-right: 6px">
                            <input type="${inputType}" name="${def.key}" placeholder="${placeholder}" value="${value}" style="text-align: ${textAlign}">
                            <button type="button" class="btn tertiary small circle" title="Clear">
                                <span class="symbol">close</span>
                            </button>
                        </div>
                    `
                );

                // Handle clear button
                const textbox = $('input', elSection);
                const btnClear = $('.btn', elSection);
                btnClear.addEventListener('click', () => {
                    textbox.value = '';
                });
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
                            <input type="text" class="search" placeholder="${def.placeholder}">
                        </div>
                        <button type="button" class="btn circle searchAdd" title="Add option (Enter)" disabled>
                            <span class="symbol">add</span>
                        </button>
                    </div>
                `
                );
                const textbox = $(`.search`, elSection);
                const btnAdd = $(`.searchAdd`, elSection);

                const appendCheckbox = valueEscaped => {
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
                    return input;
                };

                for (const v of value) {
                    const input = appendCheckbox(escapeHTML(v));
                }

                const add = () => {
                    // Get validated value
                    if (!def.validateInput) console.warn(`Filter ${def.key} has no input validation callback`);
                    const valueFinal = def.validateInput ? def.validateInput(textbox.value) : textbox.value;
                    if (!valueFinal) return;

                    // Reset state
                    textbox.value = '';
                    btnAdd.disabled = true;
                    textbox.focus();

                    // Append checkbox
                    const input = appendCheckbox(escapeHTML(valueFinal));
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
            // Extract data from form
            const data = extractFormData(elForm);

            for (const def of filterDefs) {
                // Parse value
                let value;
                let isValueDefault = false;
                switch (def.type) {
                    case 'set':
                        value = new Set(data[def.key].filter(Boolean));
                        isValueDefault = areSetsEqual(value, def.default);
                        break;
                    case 'bool':
                        value = data[def.key].includes('on');
                        isValueDefault = value === def.default;
                        break;
                    case 'number':
                    case 'string':
                        value = data[def.key];
                        isValueDefault = value === def.default;
                        break;
                }

                // Unset value if it matches the default
                if (isValueDefault || value === null) {
                    delete userFiltersNew[def.key];
                    continue;
                }

                // Update the set value
                userFiltersNew[def.key] = value;
                console.log(`Set filter ${def.key} to`, value);
            }

            // Resolve with updated userFilters object
            resolve(userFiltersNew);
        };

        // Function to cancel and return old filters
        const cancel = () => resolve(userFiltersOld);

        // Show modal
        const modal = showModal(
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
                    class: 'text',
                    onClick: cancel
                },
                {
                    label: 'Apply',
                    onClick: apply
                }
            ],
            {
                width: 900,
                height: 1000,
                expandWidth: true,
                fullscreenable: true,
                onCancel: cancel
            }
        );
    });
