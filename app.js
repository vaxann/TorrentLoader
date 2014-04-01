var Watcher = require('./watcher');
var Worker = require('./worker');
var Dump = require('./worker/dump');
var log = require('./log')(module);
var config = require('./config');

var fileMask = /\.torrent$/gi;  // finding only torrent files

log.info('Starting app');

var jobs = config.get('jobs');

function addWorker(watcher, transmission, job, newFile, dump) {
    watcher.LocFile(newFile);

    var worker = new Worker(transmission, job, newFile);

    worker.on('Error', function (err) {
        log.error('Error with executing command in transmission:', err);
        watcher.UnlocFile(newFile);
    });

    worker.on('AddedFile', function (file) {
        //удалить торрент
        watcher.RemoveFile(file);
        watcher.UnlocFile(file);
        log.info('Torrent %s started', file);
    });

    worker.on('DownloadCompleted', function (file) {
        log.info('Torrent %s downloaded', file);
        worker = null;
    });
}

//restore dumpHash
Dump.init();

//set configured watchers
jobs.forEach(function(job) {
    var watcher = new Watcher(job, fileMask);
    var transmission = null;

    if (job.transmission != null)
        transmission = job.transmission;
    else
        transmission = config.get('transmission');

    // add works from old session
    var dumpList = Dump.getDumpListByDir(job.watchDir);
    if (dumpList) {
        dumpList.forEach(function(dump) {
            addWorker(watcher, transmission, job, dump.file, dump);
        });
    }


    // if error reading dir
    watcher.on('Error', function(err){
        log.error('Error in watching for dir:', err);
    });

    // if added new file
    watcher.on('NewFile', function(newFile){
        log.info('Add new download:',newFile);
        addWorker(watcher, transmission, job, newFile, null);
    });
});