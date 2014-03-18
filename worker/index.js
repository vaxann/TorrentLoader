var events = require('events');
var exec = require('child_process').exec;
var util = require('util');
var async = require('async');
var log = require('../log')(module);

function Worker(transmission, job, file) {
    log.debug('Создаем объект работник Worker с параметрами: transmission-remote=%j, job=%j, file=%s', transmission, job, file);
    var Worker = this;

    events.EventEmitter.call(Worker);

    // Генерируем событие ошибки
    Worker.Error = function(err) {
        Worker.emit('Error', err);
    };

    // Генерируем событие ошибки
    Worker.Error = function(err) {
        Worker.emit('Error', err);
    };

    // Генерируем событие смены каталога по умолчанию
    Worker.ChangeDefDir = function(dir) {
        Worker.emit('ChangeDefDir', dir);
    };

    // Генерируем событие добавления файла
    Worker.AddedFile = function(file) {
        Worker.emit('AddedFile', file);
    };

    async.waterfall([
        function(callback){ //меняем путь для загрузки по умалчанию на job.downloadDir
            var changeDefDirReq = util.format('transmission-remote %s:%d --auth=%s --download-dir "%s"',
                                                transmission.host,
                                                transmission.port,
                                                transmission.auth,
                                                job.downloadDir);
            var changeDefDirRes = /responded: "(\w*)"/gi ;

            exec(changeDefDirReq,
                function (error, stdout, stderr) {
                    if (error)  return callback(error);
                    if (stderr) return callback(stderr);

                    var match = changeDefDirRes.exec(stdout);

                    if (match != null && match.length > 1 && match[1] == 'success'){
                        Worker.ChangeDefDir(job.downloadDir);
                        callback(null);
                    } else {
                        callback('Transmission responded for change download-dir unsuccess');
                    }

                }
            );
        },
        function(callback){ //добавляем торрент в загрузку
            var addTorrentReq = util.format('transmission-remote %s:%d --auth=%s --add "%s"',
                                                transmission.host,
                                                transmission.port,
                                                transmission.auth,
                                                file);
            var addTorrentRes = /responded: "(\w*)"/gi; //исправить

            exec(addTorrentReq,
                function (error, stdout, stderr) {
                    if (error)  return callback(error);
                    if (stderr) return callback(stderr);

                    var match = addTorrentRes.exec(stdout);

                    if (match != null && match.length > 1 && match[1] == 'success'){
                        Worker.AddedFile(file);
                        callback(null);
                    } else {
                        callback('Transmission responded for adding torrent unsuccess');
                    }
                }
            );
        }
    ],
        function(err, result) {
            if (err) Worker.Error(err);
        }
    );



}

Worker.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Worker;