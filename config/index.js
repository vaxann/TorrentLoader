var nconf = require('nconf');
var path = require('path');

nconf.argv()
    .env()
    .file({file: '/etc/torrentloader/config.json'});
//.file({ file: path.join(__dirname, 'config.json') });
module.exports = nconf;