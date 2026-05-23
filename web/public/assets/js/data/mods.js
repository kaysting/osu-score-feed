import data from './mods.json' with { type: 'json' };

const mods = {};
for (const mode of data) {
    for (const mod of mode.Mods) {
        if (!mods[mod.Acronym])
            mods[mod.Acronym] = {
                acronym: mod.Acronym,
                name: mod.Name,
                type: mod.Type,
                isPlayable: mod.UserPlayable,
                settings: {}
            };
        for (const setting of mod.Settings) {
            mods[mod.Acronym].settings[setting.Name] = {
                key: setting.Name,
                label: setting.Label
            };
        }
    }
}

console.log({ mods });

export default mods;
