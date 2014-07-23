var Watcher = require('./watcher');
var Worker = require('./worker');
var Server = require('./server');
var Dump = require('./worker/dump');
var Log = require('./log')(module);
var Config = require('./config');
var Type = require('type-of-is');
var Fs = require('fs');
var Async = require('async');

var fileMask = /\.torrent$/gi;  // finding only torrent files

Log.info('Starting app');

var servers =[];
var serversData = Config.get('servers');

if (Type(serversData, Array)) {
    Dump.init(function(err) {
        if (err) Log.error('Init dump error:', err);

        Async.each(serversData,
            function(serverData, callback) { //iterator
                if(!Type(serverData, Object))
                    return callback(new Error('Error type of param "server" must be "Object", can\'t add server: '+serverData));
                if(!Type(serverData.name, String))
                    return callback(new Error('Error type of param "server.name" must be "String", can\'t add server: ' + serverData));
                if(!Type(serverData.application, String))
                    return callback(new Error('Error type of param "server.application" must be "String", can\'t add server: ' + serverData.name));
                if(!Type(serverData.host, String))
                    return callback(new Error('Error type of param "server.host" must be "String", can\'t add server: '+ serverData.name));
                if(!Type.any(serverData.port, [Number,undefined]))
                    return callback(new Error('Error type of param "server.port" must be "Number" or "Undefined", can\'t add server: ' + serverData.name));
                if(!Type.any(serverData.user, [String,undefined]))
                    return callback(new Error('Error type of param "server.user" must be "String" or "Undefined", can\'t add server: ' + serverData.name));
                if(!Type.any(serverData.password, [String,undefined]))
                    return callback(new Error('Error type of param "server.password" must be "String" or "Undefined", can\'t add server: ' + serverData.name));

                var server = new Server(serverData);
                servers.push(server);

                Async.waterfall([
                        server.Init, //init server & check availability
                        function(callback) { //add jobs
                            var jobs = serverData.jobs;

                            Async.each(jobs,
                                function(job, callback){
                                    addJob(server, job, callback);
                                },
                                callback
                            );
                        }
                    ],
                    callback
                );
            },
            function(err){ //callback

            }
        );
    });
} else {
    Log.error('Error loading "servers" form config file');
}

function addJob(server, job, callback)
{
    if (!Type(job.name, String))
        return callback(new Error('Error type of param "name" must be "String", can\'t add job: '+job));
    if (!Type(job.checkFrequency, Number))
        return callback(new Error('Error type of param "checkFrequency" must be "Number", can\'t add job: '+ job.name));
    if (!Type(job.watchDir, String))
        return callback(new Error('Error type of param "watchDir" must be "String", can\'t add job: '+ job.name));
    if (!Fs.existsSync(job.watchDir))
        return callback(new Error('Error Dir in param "watchDir" must be exists, can\'t add job: '+job.name));
    if (!Type(job.downloadDir, String))
        return callback(new Error('Error type of param "downloadDir" must be "String", can\'t add job: '+ job.name));
    if (!Type.any(job.completesActions, [Array,undefined]))
        return callback(new Error('Error type of param "completesActions" must be "Array" or "Undefined", can\'t add job: '+job.name));
    if (!Type.any(job.server, [Object,undefined]))
        return callback(new Error('Error type of param "server" must be "Object" or "Undefined", can\'t add job: '+ job.name));

    var watcher = new Watcher(job, fileMask);
    server.jobs.push(watcher);


    // if error reading dir
    watcher.on('Error', function(err){
        Log.error('Error in watching for job:', job.name, 'error:', err);
    });

    // if added new file
    watcher.on('NewFile', function(newFile){
        Log.info('Add new download in job:',job.name, 'file:',newFile);
        addWorker(watcher, server, job, newFile);
    });

    // add works from old session
    var dumpList = Dump.getDumpListByDir(job.watchDir);
    if (dumpList) {
        Async.each(dumpList,
            function(dump, callback){
                addWorker(watcher, server, job, dump.file, dump);
            },
            callback
        );
    }
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
    watcher.workers.push(worker);

    worker.on('Error', function (err) {
        Log.error('Error with executing command for file:', newFile, 'error:', err);
        Log.debug(err.stack);
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

