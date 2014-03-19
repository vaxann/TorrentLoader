var Watcher = require('./watcher');
var Worker = require('./worker');
var log = require('./log')(module);
var config = require('./config');


var fileMask = /\.torrent$/gi;  // ищем только торренты

log.info('Запуск приложения');

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
        log.error('Ошибка при наблюдении за каталогом: %j', err);
    });

    // при появлении новог файла
    watcher.on('NewFile', function(newFile){
        log.info('Добавляем новую закачку: %s',newFile);

        watcher.LocFile(newFile);

        var worker = new Worker(transmission, job, newFile);

        worker.on('Error', function(err){
            log.error('Ошибка команд в transmission: %s', err);
            watcher.UnlocFile(newFile);
        });

        worker.on('AddedFile', function(file){
            //удалить торрент
            watcher.RemoveFile(file);
            watcher.UnlocFile(file);
            log.info('Файл %s загружается', file);
        });



    });
});