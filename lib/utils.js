const dayjs = require('dayjs');

const utils = {
    log: (...args) => {
        console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]`, ...args);
    },
    num: (num, decs = 0) => (typeof num === 'number' ? Number(num.toFixed(decs)) : num)
};

module.exports = utils;
