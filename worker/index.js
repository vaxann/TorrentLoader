var Util = require('util');
var Async = require('async');
var Nt = require('nt');
var Log = require('../log')(module);
var Dump = require('../dump/index');
var Type = require('type-of-is');

function Worker(watcher, file, dump) {
    if (!Type(watcher, 'Watcher'))
        throw  Error('Error type of param "watcher" must be "Watcher", can\'t add Worker');
    if (!Type(file, String))
        throw  Error('Error type of param "file" must be "String", can\'t add Worker');
    if (!Type.any(dump, [Object, null, undefined]))
        throw  Error('Error type of param "dump" must be "Object" or "Undefined", can\'t add Worker');

    var Worker = this;

    Worker.infoHash = null;
    Worker.file = file;
    Worker.torrentClient = watcher.server.torrentClient;
    Worker.isKilling = false;
    Worker.timer = watcher.timer;
    Worker.workerInitCount = 0;
    Worker.maxWorkerInitCount = watcher.maxWorkerInitCount;
    Worker.dump = dump;

    Worker.Kill = function(callback) {
        Worker.isKilling = true;

        // waiting for killing workers
        Async.whilst(
            function() {return Worker.isKilling == false},
            function(callback) {setTimeout(callback, 10)},
            callback
        );
    };

    Worker.Init = function(callback) {
        var ignoreNTCheck = false;
        Worker.workerInitCount += 1;
        Log.debug('Initializing worker for file %s, step %d', Worker.file, Worker.workerInitCount);

        if (Worker.workerInitCount >= Worker.maxWorkerInitCount) ignoreNTCheck = true;

        Async.waterfall([
                function(callback) { // step = 1; check torrent and get it's infoHash
                    if (Worker.isKilling) return callback(new Error('Killed by Worker.Kill'));
                    if (ignoreNTCheck) return callback(null,null);
                    if (Worker.dump) return callback(null, Worker.dump.hash);


                    Nt.read(Worker.file, function(err,torrent) {
                        //log.debug('Response to checking torrent:', arguments);
                        if (err) return callback(err);

                        var infoHash = torrent.infoHash();
                        Log.debug('File = %s infoHash = %s', Worker.file, infoHash); // 51881f6e9546e6e6bba1a4a797c3dab3c07b655c

                        Dump.push(1, Worker.file, infoHash, function(err,obj) {
                            if (err) return callback(err);
                            Worker.dump = obj;
                            callback(null, infoHash);
                        });
                    });
                },
                function(infoHash, callback){ //step = 2; add torrent ot download
                    if (Worker.isKilling) return callback(new Error('Killed by Worker.Kill'));
                    if (!ignoreNTCheck && Worker.dump && Worker.dump.step >= 2 ) return callback(null, infoHash);

                    Worker.torrentClient.AddTorrent(Worker.file, watcher.downloadDir, function(err,hash,id){
                        if (err) return callback(err);

                        if (ignoreNTCheck) {
                            Dump.push(2, Worker.file, hash, function(err,obj) {
                                if (err) return callback(err);
                                Worker.dump = obj;
                                callback(null, hash);
                            });
                        } else {
                            if (infoHash != hash) return callback(new Error('AddTorrent error: local and returned hashes is not equal'));

                            Dump.changeStep(infoHash, 2, function(err, obj) {
                                if (err) return callback(err);

                                Worker.dump = obj;
                                Log.info('File %s added', Worker.file);

                                callback(null, infoHash);
                            });
                        }
                    });
                }
            ],
            function(err, infoHash) { //in the end set timer and wait while torrent will be download
                if (Worker.isKilling) Worker.isKilling = false;
                if (err) return callback(err);

                Worker.infoHash = infoHash;

                if (Worker.dump && Worker.dump.step == 2 ) Worker.CheckDownloadState();
                if (Worker.dump && Worker.dump.step >= 3 ) Worker.StartCompletesActions();

                callback();
            }
        );

    };

    Worker.CheckDownloadState = function(){ //step = 3
        var state = null;

        Async.doUntil(
            function(callback) { // Work function
                if (Worker.isKilling) return callback(new Error('Killed by Worker.Kill'));

                Worker.torrentClient.CheckDownloadState(Worker.infoHash, function(err, stateParams){
                    if (err) return callback(err);

                    state = stateParams;
                    Log.debug('CheckDownloadState:', state);

                    setTimeout(callback, Worker.timer);
                });
            },
            function() {// test function
                if (!Type(state,Object)) return false;
                if (!Type(state.isFinished,Boolean)) return false;
                if (!Type(state.percentDone,Number)) return false;

                if (state.isFinished || state.percentDone == 1) return true;
            },
            function(err) {
                if (Worker.isKilling) Worker.isKilling = false;
                if (err)  return Log.error(Util.format('Error with checkDownloadState: %j', err.message));

                Dump.changeStep(Worker.infoHash, 3, function(err, obj) {
                    if (err) return Log.error(Util.format('Error with saving dump: %j', err.message));
                    Worker.dump = obj;

                    Log.info('File %s downloaded', Worker.file);
                    Worker.StartCompletesActions();
                });
            }
        );
    };

    Worker.StartCompletesActions = function(){
        Worker.RemoveDump(function(err){
            Log.info('Actions for torrent %s completed', Worker.file);
        });

/*        if (job.completes_actions.length){
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
        }

        Worker.CompletesActionsDone(Worker.file);*/
    };

    Worker.RemoveDump = function(callback){
        var hash;
        if (Worker.infoHash)
            hash = Worker.infoHash;
        else if (Worker.dump)
            hash = Worker.dump.hash;
        else
            return callback();

        Dump.removeDumpByHash(hash, function(err){
            if (err) return callback(err);
            Worker.dump = null;
        });

    };



/*
    if (!Type(server, Server))
        throw  Error('Error type of param "server" must be "Server", can\'t add Worker');
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
    Worker.torrentClient = server.torrentClient;

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
 */
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
        }*//*

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
*/



}

module.exports = Worker;