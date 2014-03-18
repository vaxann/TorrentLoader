var events = require('events');
var fs = require('fs');
var log = require('../log')(module);
var path = require('path');

function Watcher(job, fileMask) {
    log.debug('Создаем объект надсмотрцик Watcher с параметрами: job=%j, fileMask=%s', job, fileMask);

    var Watcher = this;

    Watcher.dir = job.watchDir;
    Watcher.fileMask = fileMask;
    Watcher.timer = job.checkFrequency * 1000;
    Watcher.locketFiles = [];

    events.EventEmitter.call(Watcher);

    // Генерируем событие ошибки
    Watcher.Error = function(err) {
        Watcher.emit('Error', err);
    };

    // Генерируем событи о наличии нового файла
    Watcher.NewFile = function(file) {
        Watcher.emit('NewFile', file);
    };

    // После генерации события NewFile, новый файл нужно залочить, чтобы
    // он не был обработан идобавленн несколько раз, когда файл успешно поставлен на закачку
    // необходимо сделать ему UnlocFile
    Watcher.LocFile = function(file){
        Watcher.locketFiles.push(file);
    };

    // Разлочить файл
    Watcher.UnlocFile = function(file){
        var index = Watcher.locketFiles.indexOf(file);
        if (index >= 0) {
            Watcher.locketFiles.splice(index, 1);
        }
    };

    Watcher.RemoveFile = function(file) {
        fs.unlinkSync(file);
    };

    // Читаем каталог на и проверям на наличие в нем файлов
    Watcher.CheckFolder = function() {
        fs.readdir(Watcher.dir, function(err, files) {
            if (err) return Watcher.Error(err);
            if (files.length == 0) return;

            files.forEach(function(file) {
                if (Watcher.fileMask.exec(file) !== null && Watcher.locketFiles.indexOf(file) == -1) {
                    Watcher.NewFile(path.join(Watcher.dir, file));
                }
            });
        });
    };

    setInterval(Watcher.CheckFolder, Watcher.timer);
}

Watcher.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Watcher;