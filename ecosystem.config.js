module.exports = {
    apps: [
        {
            name: 'osf',
            script: 'npm',
            args: 'start',
            cwd: './',
            watch: ['web/*.js', 'lib']
        }
    ]
};
