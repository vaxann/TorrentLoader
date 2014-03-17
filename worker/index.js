var events = require('events');
var log = require('../log')(module);
var exec = require('child_process').exec;

function Worker(transmission, job, file) {
    log.info('Создаем объект работник Worker с параметрами: transmission-remote=%j, job=%j file=%s', transmission, job, file);
    var Worker = this;

    exec('transmission-remote localhost:9091 --auth=ivanabramenko:frtgbfrtgb -si',
        function (error, stdout, stderr) {
            log.info(stdout);
            log.error(stderr);
        }
    );

}

Worker.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Worker;