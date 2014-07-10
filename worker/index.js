var Events = require('events');
var Util = require('util');
var Async = require('async');
var Nt = require('nt');
var Log = require('../log')(module);
var Dump = require('./dump');
var TorrentClient = require('./torrent_client');
var Type = require('type-of-is');

function Worker(server, job, file, dump) {
    if (!Type(server, Object))
        throw  Error('Error type of param "server" must be "Object", can\'t add Worker');
    if (!Type(job, Object))
        throw  Error('Error type of param "job" must be "Object", can\'t add Worker');
    if (!Type(file, String))
        throw  Error('Error type of param "file" must be "String", can\'t add Worker');
    if (!Type.any(dump, [Object,undefined]))
        throw  Error('Error type of param "dump" must be "Object" or "Undefined", can\'t add Worker');

    Log.debug('Creating object Worker with arguments:', arguments);

    var Worker = this;

    Events.EventEmitter.call(Worker);

    Worker.infoHash = null;
    Worker.file = file;
    Worker.torrentClient = new TorrentClient(server);

    // Emit error Event
    Worker.Error = function(err) {
        Log.debug("Error function called, emitting Error event with argument = ", arguments);
        Worker.emit('Error', err);
    };

    // Emit ChangedDefDir Event
    Worker.ChangedDefDir = function(dir) {
        Log.debug("ChangedDefDir function called, emitting ChangedDefDir event with argument = ", arguments);
        Worker.emit('ChangedDefDir', dir);
    };

    // Emit AddedFile Event
    Worker.AddedFile = function(file) {
        Log.debug("AddedFile function called, emitting AddedFile event with argument = ", arguments);
        Worker.emit('AddedFile', file);
    };

    // Emit AddedFile Event
    Worker.DownloadCompleted = function(file) {
        Log.debug("DownloadCompleted function called, emitting DownloadCompleted event with argument = ", arguments);
        Worker.emit('DownloadCompleted', file);
    };

    // CompletesActionsDone Event
    Worker.CompletesActionsDone = function(file) {
        Log.debug("CompletesActionsDone function called, emitting CompletesActionsDone event with argument = ", arguments);
        Worker.emit('CompletesActionsDone', file);
    };


    Worker.StartCompletesActions = function(){
 /*       if (job.completes_actions.length){
            Async.eachSeries(job.completesActions,
                function(action, callback) {
                    var Actor = require('./completes_actions/'+action.moduleName);

                    var actor = new Actor(transmission, dump, action.condition, action.actions);

                    actor.exec(callback);
                },
                function(err){
                    if (err)  Worker.Error(Util.format('Error with completes_actions: %j', err));

                    Dump.removeDumpByHash(Worker.infoHash, function(err){
                        if (err) return Worker.Error(err);
                        Worker.CompletesActionsDone(Worker.file);
                    });
                }
            );
        }*/
        Worker.CompletesActionsDone(Worker.file);
    };

    // Check download state of current torrent
    Worker.CheckDownloadState = function(){
        var state = null;

        Async.doUntil(
            function(callback) { // Work function
                Worker.torrentClient.CheckDownloadState(Worker.infoHash, function(err, stateParams){
                    if (err) return callback(err);

                    state = stateParams;
                    setTimeout(callback, 30000);
                });
            },
            function() {// test function
                if (!Type(state,Object)) return false;
                if (!Type(state.isFinished,Boolean)) return false;
                if (!Type(state.percentDone,Number)) return false;

                if (state.isFinished || state.percentDone == 1) return true;
            },
            function(err) {
                if (err)  return Worker.Error(Util.format('Error with checkDownloadState: %j', err));

                Dump.changeStep(Worker.infoHash, 3, function(err, obj) {
                    if (err) return Worker.Error(Util.format('Error with saving dump: %j', err));
                    dump = obj;
                    Worker.DownloadCompleted(Worker.file);
                    Worker.StartCompletesActions();
                });
            }
        );
    };

    // Creating torrent and add it to download
    Async.waterfall([
        function(callback) { // step = 1; check torrent and get it's infoHash
            if (dump) return callback(null, dump.hash);

            Nt.read(Worker.file, function(err,torrent) {
                //log.debug('Response to checking torrent:', arguments);
                if (err) return callback(err);

                var infoHash = torrent.infoHash();
                Log.debug('infoHash =',infoHash); // 51881f6e9546e6e6bba1a4a797c3dab3c07b655c

                Dump.push(1, Worker.file, infoHash, function(err,obj) {
                    if (err) return callback(err);
                    dump = obj;
                    callback(null, infoHash);
                });
            });
        },
        function(infoHash, callback) { //Create torrent client
            Worker.torrentClient.Init(function(err){
                callback(err, infoHash);
            })
        },
        function(infoHash, callback){ //step = 2; add torrent ot download
            if (dump && dump.step >= 2 ) return callback(null, infoHash);

            Worker.torrentClient.AddTorrent(Worker.file, job.downloadDir, function(err,hash,id){
                if (err) return callback(err);
                if (infoHash != hash) return callback(new Error('AddTorrent error: local and returned hashes is not equal'));

                Dump.changeStep(Worker.infoHash, 2, function(err, obj) {
                    dump = obj;
                    Worker.AddedFile(Worker.file);

                    callback(null, infoHash);
                });
            });
        }
    ],
        function(err, infoHash) { //step = 3; in the end set timer and wait while torrent will be download
            if (err) return Worker.Error(err);

            Worker.infoHash = infoHash;

            if (dump && dump.step >= 3 ) return Worker.StartCompletesActions();

            Worker.CheckDownloadState();
        }
    );



}

Worker.prototype.__proto__ = Events.EventEmitter.prototype;

module.exports = Worker;