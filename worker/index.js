var events = require('events');
var log = require('../log')(module);
var exec = require('child_process').exec;
var util = require('util');

function Worker(transmission, job, file) {
    log.info('Создаем объект работник Worker с параметрами: transmission-remote=%j, job=%j file=%s', transmission, job, file);
    var Worker = this;

    Worker.addTorrentCommand = util.format('transmission-remote %s:%d --auth=%s -si',
                                                transmission.host,
                                                transmission.port,
                                                transmission.auth);

    exec(Worker.addTorrentCommand,
        function (error, stdout, stderr) {
            log.info(stdout);
            log.error(stderr);
        }
    );

}

Worker.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Worker;