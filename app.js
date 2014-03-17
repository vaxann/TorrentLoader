var Watcher = require('./watcher');
var log = require('./log')(module);
var config = require('./config');


var fileMask = /\.torrent$/gi;  // ищем только торренты

log.info('Запуск приложения');

var jobs = config.get('jobs');

jobs.forEach(function(job) {
    var checkFrequency = job.checkFrequency * 1000;  // раз в 30 сек
    var watcher = new Watcher(job.name ,job.watchDir, fileMask, checkFrequency);

    // При ошибке чтения каталога
    watcher.on('Error', function(err){
        log.error('Ошибка при наблюдении за каталогом: %j', err);
    });

    // при появлении новог файла
    watcher.on('NewFile', function(newFile){
        watcher.LocFile(newFile);
        log.info('Добавляем новую закачку: %s',newFile);
    });
});