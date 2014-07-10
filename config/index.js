var nconf = require('nconf');
var path = require('path');

nconf.argv()
    .env()
    .file({ file: path.join(__dirname, 'config.json') });
//    .file({file: '/etc/torrentloader/config.json'});
module.exports = nconf;