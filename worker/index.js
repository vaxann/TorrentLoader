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

    // Emit error Event
    Worker.Error = function(err) {
        log.debug("Error function called, emitting Error event with argument = ", arguments);
        Worker.emit('Error', err);
    };

    // Emit ChangeDefDir Event
    Worker.ChangeDefDir = function(dir) {
        log.debug("ChangeDefDir function called, emitting ChangeDefDir event with argument = ", arguments);
        Worker.emit('ChangeDefDir', dir);
    };

    // Emit AddedFile Event
    Worker.AddedFile = function(file) {
        log.debug("AddedFile function called, emitting AddedFile event with argument = ", arguments);
        Worker.emit('AddedFile', file);
    };

    async.waterfall([
        function(callback) { // check torrent and get it's infoHash
            nt.read(file, function(err,torrent) {
                log.debug('Response to checking torrent:', arguments);
                if (err) return callback(err);

                var infoHash = torrent.infoHash();
                log.debug('infoHash =',infoHash); // c2e3fdbe1d187a26c3835f4f4cbe3df62acbb987
                callback(null, infoHash);
            });
        },
        function(infoHash, callback){ //changing defDownloadDor to job.downloadDir
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
        function(infoHash, callback){ //add torrent ot download
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
        function(err, result) { // in the end set timer and wait while torrent will be download
            if (err) Worker.Error(err);
        }
    );



}

Worker.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Worker;