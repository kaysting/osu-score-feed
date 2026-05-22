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
            if (['set', 'bool'].includes(def.type) || def.options) {
                const boolOpts = [
                    { label: 'No', value: false },
                    { label: 'Yes', value: true }
                ];
                const opts = def.options ? [...def.options] : def.type == 'bool' ? boolOpts : [];

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
                const width = def.type == 'number' ? 100 : 300;
                const textAlign = def.type == 'number' ? 'center' : 'left';
                const placeholder = def.placeholder || def.default;
                const value = escapeHTML(userFiltersOld[def.key] || '');

                // Append textbox
                elSection.insertAdjacentHTML(
                    'beforeend',
                    /*html */ `
                    <div class="textbox medium" style="width: ${width}px">
                        <input type="${inputType}" name="${def.key}" placeholder="${placeholder}" value="${value}" style="text-align: ${textAlign}">
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

                    // Reset textbox and button
                    textbox.value = '';
                    btnAdd.disabled = true;

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
                        value = data[def.key] === 'true' ? true : false;
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
