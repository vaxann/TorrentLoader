var Fs = require('fs');
var Log = require('../log')(module);
var Path = require('path');
var Type = require('type-of-is');
var Lib = require('../lib');
var Async = require('async');
var Dump = require('../dump/index');
var Worker = require('../worker');


var fileMask = /\.torrent$/gi;  // finding only torrent files

function Watcher(server, jobData) {
    if (!Type(server, 'Server'))
        throw  Error('Error type of param "sever" must be "Sever", can\'t create Watcher');
    if (!Type(jobData, Object))
        throw  Error('Error type of param "jobData" must be "Object", can\'t create Watcher');

    var Watcher = this;

    Watcher.server = server;

    if (!Lib.clone(Watcher, jobData, [
                {'name':'String'},
                {'checkFrequency':'Number'},
                {'watchDir':'String'},
                {'downloadDir': 'String'},
                {'completesActions': 'Array'}
            ]))
        throw Error('Error can\'t clone jobData to Watcher');

    Watcher.timer = Watcher.checkFrequency * 1000;
    Watcher.locketFiles = [];
    Watcher.workers = [];
    Watcher.timeoutId = null;
    Watcher.maxWorkerInitCount = 3;

    Watcher.watchDir = Lib.simplePath(Watcher.watchDir);


    Watcher.Start = function(callback) {
        Log.debug('Starting job:', Watcher.name);
        if (!Watcher.server.isOnline) {
            Log.info('Server %d is offline -> can\'t start watching', Watcher.server.name);
            return callback();
        }

        Watcher.CheckFolder();

        var dumpList = Dump.getDumpListByDir(Watcher.watchDir);
        if (dumpList) {
            Async.each(dumpList,
                function(dump, callback){
                    Watcher.addWorker(dump.file, dump, callback);
                },
                callback
            );
        } else {
            callback();
        }
    };


    Watcher.Stop = function(callback) {
        Log.debug('Stopping job:', Watcher.name);
        if (Watcher.timeoutId)
            clearTimeout(Watcher.timeoutId);

        Async.each(Watcher.workers,
            function(worker, callback){
                worker.Kill(callback);
                worker = null;
            },
            function(err) {
                Watcher.workers = [];
                callback(err);
            }

        );
    };


    // Read dir and check in for new torrent files
    Watcher.CheckFolder = function() {
        if (!Watcher.server.isOnline) {
            Log.info('Server %d is offline -> turnoff CheckFolder loop', Watcher.server.name);
            return;
        }

        Log.debug('Checking folder:', Watcher.watchDir);
        Fs.readdir(Watcher.watchDir, function(err, files) {
            if (err) return Log.error(err.message);
            //if (files.length == 0) return;
            var addedFiles = 0;

            Async.each(files,
                function(file, callback){ // add each file
                    if (fileMask.test(file) && Watcher.locketFiles.indexOf(file) == -1) {
                        addedFiles += 1;
                        Watcher.addWorker(Path.join(Watcher.watchDir, file), null, callback);
                    } else callback();
                },
                function(err){
                    if (err) Log.error(err.message);

                    Watcher.timeoutId = setTimeout(Watcher.CheckFolder, Watcher.timer);

                    Log.debug('Added %d workers', addedFiles);
                }
            );
        });
    };

    // Lock file, when file locked function CheckFolder does not Emit NewFile event
    // with this file
    Watcher.LocFile = function(file){
        Log.debug('Locking file:', file);
        Watcher.locketFiles.push(file);
        Log.debug('File locked:', file);
    };

    // Unlocking file
    Watcher.UnlocFile = function(file){
        Log.debug('Unlocking file:', file);
        var index = Watcher.locketFiles.indexOf(file);
        if (index >= 0) {
            Watcher.locketFiles.splice(index, 1);
            Log.debug('File unlocked:', file);
        }
    };

    // Remove file from disk
    Watcher.MoveFile = function(file, dir) {
        if (Fs.existsSync(file)) {
            Log.info('Moving file %s to ./%s:', file, dir);
            var newDir = Path.join(Watcher.watchDir, dir);

            if (!Fs.existsSync(newDir))
                Fs.mkdirSync(newDir);

            var newFile = Path.join(newDir, file.split('/')[file.split('/').length-1]);
            Fs.renameSync(file, newFile);
        } else {
            Log.info('File %s already moved to ./%s or does not exist:', file, dir);
        }

    };


    Watcher.addWorker = function(newFile, dump, callback) {
        if (!Type(newFile, String))
            return callback(new Error('Error type of param "newFile" must be "String", can\'t add Worker'));
        if (!Type.any(dump, [Object,null, undefined]))
            return callback(new Error('Error type of param "dump" must be "Object" or "Undefined", can\'t add Worker'));


        var worker = new Worker(Watcher, newFile, dump);
        Watcher.workers.push(worker);

        var afterInit = function(err){
            if (err) {
                if (worker.workerInitCount < Watcher.maxWorkerInitCount) {
                    Log.error(err.message);
                    setTimeout(worker.Init, Watcher.timer, afterInit);
                    return;
                } else {
                    Watcher.MoveFile(newFile, 'errors');
                    worker.RemoveDump(function (err1){
                        if (err1) Log.error(err1.message);
                        callback(err);
                        return;
                    });
                }
            }

            // Move if well done
            Watcher.MoveFile(newFile, 'added');

            callback();
        };

        worker.Init(afterInit);
    }

}

module.exports = Watcher;