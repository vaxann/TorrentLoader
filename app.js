var Watcher = require('./watcher');
var Worker = require('./worker');
var Dump = require('./worker/dump');
var Log = require('./log')(module);
var Config = require('./config');
var Type = require('type-of-is');
var Fs = require('fs');

var fileMask = /\.torrent$/gi;  // finding only torrent files

Log.info('Starting app');

// Loading Config
var jobs = Config.get('jobs');

if (Type(jobs, Array)) {
    //restore dumpHash
    Dump.init(function(err) {
        if (err) Log.error('Init dump error:', err);

        //set configured watchers
        jobs.forEach(function(job) {
            // Check config types
            if (!Type(job.name, String))
                return Log.error('Error type of param "name" must be "String", can\'t add job:',job);
            if (!Type(job.checkFrequency, Number))
                return Log.error('Error type of param "checkFrequency" must be "Number", can\'t add job:',job.name);
            if (!Type(job.watchDir, String))
                return Log.error('Error type of param "watchDir" must be "String", can\'t add job:',job.name);
            if (!Fs.existsSync(job.watchDir))
                return Log.error('Error Dir in param "watchDir" must be exists, can\'t add job:',job.name);
            if (!Type(job.downloadDir, String))
                return Log.error('Error type of param "downloadDir" must be "String", can\'t add job:',job.name);
            if (!Type.any(job.completesActions, [Array,undefined]))
                return Log.error('Error type of param "completesActions" must be "Array" or "Undefined", can\'t add job:',job.name);
            if (!Type.any(job.server, [Object,undefined]))
                return Log.error('Error type of param "server" must be "Object" or "Undefined", can\'t add job:',job.name);


            var server = null;
            if (Type(job.server,Object))
                server = job.server;
            else
                server = Config.get('server');

            if(!Type(server, Object))
                return Log.error('Error type of param "server.application" must be "Object", can\'t add job:',job.name);
            if(!Type(server.application, String))
                return Log.error('Error type of param "server.application" must be "String", can\'t add job:',job.name);
            if(!Type(server.host, String))
                return Log.error('Error type of param "server.host" must be "String", can\'t add job:',job.name);
            if(!Type.any(server.port, [Number,undefined]))
                return Log.error('Error type of param "server.port" must be "Number" or "Undefined", can\'t add job:',job.name);
            if(!Type.any(server.user, [String,undefined]))
                return Log.error('Error type of param "server.user" must be "String" or "Undefined", can\'t add job:',job.name);
            if(!Type.any(server.password, [String,undefined]))
                return Log.error('Error type of param "server.password" must be "String" or "Undefined", can\'t add job:',job.name);


            var watcher = new Watcher(job, fileMask);

            // add works from old session
            var dumpList = Dump.getDumpListByDir(job.watchDir);
            if (dumpList) {
                dumpList.forEach(function(dump) {
                    addWorker(watcher, server, job, dump.file, dump);
                });
            }

            // if error reading dir
            watcher.on('Error', function(err){
                Log.error('Error in watching for job:', job.name, 'error:', err);
            });

            // if added new file
            watcher.on('NewFile', function(newFile){
                Log.info('Add new download in job:',job.name, 'file:',newFile);
                addWorker(watcher, server, job, newFile);
            });
        });
    });
} else {
    Log.error('Error loading "jobs" form config file');
}



function addWorker(watcher, server, job, newFile, dump) {
    if (!Type(watcher, Watcher))
        return Log.error('Error type of param "watcher" must be "Watcher", can\'t add Worker');
    if (!Type(server, Object))
        return Log.error('Error type of param "server" must be "Object", can\'t add Worker');
    if (!Type(job, Object))
        return Log.error('Error type of param "job" must be "Object", can\'t add Worker');
    if (!Type(newFile, String))
        return Log.error('Error type of param "newFile" must be "String", can\'t add Worker');
    if (!Type.any(dump, [Object,undefined]))
        return Log.error('Error type of param "dump" must be "Object" or "Undefined", can\'t add Worker');

    watcher.LocFile(newFile);

    var worker = new Worker(server, job, newFile, dump);

    worker.on('Error', function (err) {
        Log.error('Error with executing command for file:', newFile, 'error:', err);
        watcher.UnlocFile(newFile);
    });

    worker.on('AddedFile', function (file) {
        //удалить торрент
        watcher.RemoveFile(file);
        watcher.UnlocFile(file);
        Log.info('Torrent %s started', file);
    });

    worker.on('DownloadCompleted', function (file) {
        Log.info('Torrent %s downloaded', file);
    });

    worker.on('CompletesActionsDone', function (file) {
        Log.info('All Actions executed for torrent', file);
        worker = null;
    });
}

