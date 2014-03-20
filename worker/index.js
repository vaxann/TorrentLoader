var events = require('events');
var exec = require('child_process').exec;
var util = require('util');
var async = require('async');
var nt = require('nt');
var log = require('../log')(module);

function Worker(transmission, job, file) {
    log.debug('Creating object Worker with arguments:', arguments);

    var Worker = this;

    events.EventEmitter.call(Worker);

    // Генерируем событие ошибки
    Worker.Error = function(err) {
        log.debug("Error function called, emitting Error event with argument = ", arguments);
        Worker.emit('Error', err);
    };

    // Генерируем событие смены каталога по умолчанию
    Worker.ChangeDefDir = function(dir) {
        log.debug("ChangeDefDir function called, emitting ChangeDefDir event with argument = ", arguments);
        Worker.emit('ChangeDefDir', dir);
    };

    // Генерируем событие добавления файла
    Worker.AddedFile = function(file) {
        log.debug("AddedFile function called, emitting AddedFile event with argument = ", arguments);
        Worker.emit('AddedFile', file);
    };

    async.waterfall([
        function(callback) { // проверяем торрент, получаем его хеш
            nt.read(file, function(err,torrent) {
                log.debug('Response to checking torrent:', arguments);
                if (err) return callback(err);

                var infoHash = torrent.infoHash();
                log.debug('infoHash =',infoHash);
                callback(null, infoHash);
            });
        },
        function(infoHash, callback){ //меняем путь для загрузки по умалчанию на job.downloadDir
            var changeDefDirReq = util.format('transmission-remote %s:%d --auth=%s --download-dir "%s"',
                                                transmission.host,
                                                transmission.port,
                                                transmission.auth,
                                                job.downloadDir);
            log.debug("changeDefDirReq =", changeDefDirReq);

            var changeDefDirRes = /responded: "(\w*)"/gi ;


            exec(changeDefDirReq,
                function (error, stdout, stderr) {
                    log.debug("Response to changing dir:", arguments);
                    if (error)  return callback(error);
                    if (stderr) return callback(stderr);

                    var match = changeDefDirRes.exec(stdout);
                    log.debug("Results of exec regexp to changeDefDir response: match =", match);

                    if (match != null && match.length > 1 && match[1] == 'success'){
                        Worker.ChangeDefDir(job.downloadDir);
                        callback(null, infoHash);
                    } else {
                        callback('Transmission responded for change download-dir unsuccess');
                    }

                }
            );
        },
        function(infoHash, callback){ //добавляем торрент в загрузку
            var addTorrentReq = util.format('transmission-remote %s:%d --auth=%s --add "%s"',
                                                transmission.host,
                                                transmission.port,
                                                transmission.auth,
                                                file);
            log.debug("addTorrentReq =", addTorrentReq);
            var addTorrentRes = /responded: "(\w*)"/gi; //исправить

            exec(addTorrentReq,
                function (error, stdout, stderr) {
                    log.debug("Response to add torrent:", arguments);
                    if (error)  return callback(error);
                    if (stderr) return callback(stderr);

                    var match = addTorrentRes.exec(stdout);
                    log.debug("Results of exec regexp to addTorrent response: match =", match);

                    if (match != null && match.length > 1 && match[1] == 'success'){
                        Worker.AddedFile(file);
                        callback(null, infoHash);
                    } else {
                        callback('Transmission responded for adding torrent unsuccess');
                    }
                }
            );
        }
    ],
        function(err, result) { // Вконце устанавливаем таймер и ждем когда торрент скачается
            if (err) Worker.Error(err);
        }
    );



}

Worker.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Worker;