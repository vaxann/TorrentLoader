var Watcher = require('./watcher');
var Worker = require('./worker');
var log = require('./log')(module);
var config = require('./config');


var fileMask = /\.torrent$/gi;  // finding only torrent files

log.info('Starting app');

var jobs = config.get('jobs');

jobs.forEach(function(job) {
    var watcher = new Watcher(job, fileMask);
    var transmission = null;

    if (job.transmission != null)
        transmission = job.transmission;
    else
        transmission = config.get('transmission');

    // При ошибке чтения каталога
    watcher.on('Error', function(err){
        log.error('Error in watching for dir:', err);
    });

    // при появлении нового файла
    watcher.on('NewFile', function(newFile){
        log.info('Add new download:',newFile);

        watcher.LocFile(newFile);

        var worker = new Worker(transmission, job, newFile);

        worker.on('Error', function(err){
            log.error('Error with executing command in transmission:', err);
            watcher.UnlocFile(newFile);
        });

        worker.on('AddedFile', function(file){
            //удалить торрент
            watcher.RemoveFile(file);
            watcher.UnlocFile(file);
            log.info('Torrent %s started', file);
        });



    });
});