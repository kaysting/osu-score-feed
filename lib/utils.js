const dayjs = require('dayjs');

const utils = {
    log: (...args) => {
        console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]`, ...args);
    }
};

module.exports = utils;
