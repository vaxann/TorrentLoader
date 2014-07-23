var Events = require('events');
var Fs = require('fs');
var Log = require('../log')(module);
var Path = require('path');
var Type = require('type-of-is');

function Watcher(job, fileMask) {
    if (!Type(job, Object))
        throw  Error('Error type of param "job" must be "Object", can\'t add Watcher');
    if (!Type(fileMask, RegExp))
        throw  Error('Error type of param "fileMask" must be "RegExp", can\'t add Watcher');

    Log.debug('Creating object Watcher with arguments', arguments);

    var Watcher = this;

    Watcher.dir = job.watchDir;
    Watcher.fileMask = fileMask;
    Watcher.timer = job.checkFrequency * 1000;
    Watcher.locketFiles = [];
    Watcher.workers = [];

    Events.EventEmitter.call(Watcher);

    // Emit error Event
    Watcher.Error = function(err) {
        Log.debug("Error function called, emitting Error event with argument = ", arguments);
        Watcher.emit('Error', err);
    };

    // Emit NewFile Event
    Watcher.NewFile = function(file) {
        Log.debug("NewFile function called, emitting NewFile event with argument = ", arguments);
        Watcher.emit('NewFile', file);
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
    Watcher.RemoveFile = function(file) {
        Log.debug('Removing file:', file);
        Fs.unlinkSync(file);
    };

    // Read dir and check in for new torrent files
    Watcher.CheckFolder = function() {
        Log.debug('Checking folder:', Watcher.dir);
        Fs.readdir(Watcher.dir, function(err, files) {
            if (err) return Watcher.Error(err);
            if (files.length == 0) return;

            files.forEach(function(file) {
                if (Watcher.fileMask.test(file) && Watcher.locketFiles.indexOf(file) == -1) {
                    Watcher.NewFile(Path.join(Watcher.dir, file));
                }
            });
        });
    };

    Log.debug('Setting timer for CheckFolder each', Watcher.timer, 'ms');
    setInterval(Watcher.CheckFolder, Watcher.timer);
}

Watcher.prototype.__proto__ = Events.EventEmitter.prototype;

module.exports = Watcher;