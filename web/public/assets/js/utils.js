export function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function starsToColor(stars) {
    const bgPoints = [
        { stars: 0, color: [128, 128, 128] },
        { stars: 0.09, color: [128, 128, 128] },
        { stars: 0.1, color: [64, 146, 250] },
        { stars: 2, color: [78, 255, 214] },
        { stars: 2.5, color: [121, 255, 88] },
        { stars: 3.3, color: [245, 240, 92] },
        { stars: 4, color: [250, 156, 104] },
        { stars: 5, color: [246, 79, 120] },
        { stars: 6, color: [179, 76, 193] },
        { stars: 6.7, color: [99, 98, 220] },
        { stars: 8, color: [0, 0, 0] }
    ];

    const fgPoints = [
        { stars: 0, color: [0, 0, 0] },
        { stars: 6.69999, color: [0, 0, 0] },
        { stars: 6.7, color: [255, 217, 102] },
        { stars: 8.99, color: [255, 217, 102] },
        { stars: 9, color: [246, 246, 85] },
        { stars: 10, color: [255, 127, 102] },
        { stars: 11, color: [235, 71, 153] },
        { stars: 12.5, color: [108, 108, 224] }
    ];

    // Helper to find color based on points range
    const interpolate = (points, val) => {
        // Handle "stars outside of range" by returning min or max color
        if (val <= points[0].stars) return points[0].color;
        if (val >= points[points.length - 1].stars) return points[points.length - 1].color;

        for (let i = 0; i < points.length - 1; i++) {
            const pointA = points[i];
            const pointB = points[i + 1];

            if (val >= pointA.stars && val <= pointB.stars) {
                const ratio = (val - pointA.stars) / (pointB.stars - pointA.stars);
                const r = Math.round(pointA.color[0] + ratio * (pointB.color[0] - pointA.color[0]));
                const g = Math.round(pointA.color[1] + ratio * (pointB.color[1] - pointA.color[1]));
                const b = Math.round(pointA.color[2] + ratio * (pointB.color[2] - pointA.color[2]));
                return [r, g, b];
            }
        }
        return points[0].color; // Fallback
    };

    return {
        bg: rgbToHex(...interpolate(bgPoints, stars)),
        fg: rgbToHex(...interpolate(fgPoints, stars))
    };
}

export function extractFormData(formElement) {
    const data = {};
    const namedInputs = formElement.querySelectorAll('[name]');
    for (const input of namedInputs) {
        const name = input.name;
        if (!data[name]) data[name] = null;
        switch (input.type || input.tagName.toLowerCase()) {
            case 'checkbox': {
                if (!data[name]) data[name] = [];
                if (!input.checked) break;
                data[name].push(input.value);
                break;
            }
            case 'radio': {
                if (!input.checked) break;
                data[name] = input.value;
                break;
            }
            case 'number': {
                const value = input.value;
                if (!value) break;
                const num = Number(input.value);
                if (isNaN(num)) break;
                data[name] = num;
                break;
            }
            default: {
                data[name] = input.value;
            }
        }
    }
    return data;
}

export function areSetsEqual(a, b) {
    if (a.size !== b.size) return false;

    for (let item of a) {
        if (!b.has(item)) return false;
    }

    return true;
}

// Thanks Gemini
export function floorToFixed(num, decimals = 0) {
    const flooredNum = Number(`${Math.floor(`${num}e${decimals}`)}e-${decimals}`);
    return flooredNum.toFixed(decimals);
}
