var events = require('events');
var fs = require('fs');
var log = require('../log')(module);
var path = require('path');

function Watcher(job, fileMask) {
    log.debug('Creating object Watcher with arguments', arguments);

    var Watcher = this;

    Watcher.dir = job.watchDir;
    Watcher.fileMask = fileMask;
    Watcher.timer = job.checkFrequency * 1000;
    Watcher.locketFiles = [];

    events.EventEmitter.call(Watcher);

    // Генерируем событие ошибки
    Watcher.Error = function(err) {
        log.debug("Error function called, emitting Error event with argument = ", arguments);
        Watcher.emit('Error', err);
    };

    // Генерируем событи о наличии нового файла
    Watcher.NewFile = function(file) {
        log.debug("NewFile function called, emitting NewFile event with argument = ", arguments);
        Watcher.emit('NewFile', file);
    };

    // После генерации события NewFile, новый файл нужно залочить, чтобы
    // он не был обработан идобавленн несколько раз, когда файл успешно поставлен на закачку
    // необходимо сделать ему UnlocFile
    Watcher.LocFile = function(file){
        log.debug('Locking file:', file);
        Watcher.locketFiles.push(file);
        log.debug('File locked:', file);
    };

    // Разлочить файл
    Watcher.UnlocFile = function(file){
        log.debug('Unlocking file:', file);
        var index = Watcher.locketFiles.indexOf(file);
        if (index >= 0) {
            Watcher.locketFiles.splice(index, 1);
            log.debug('File unlocked:', file);
        }
    };

    Watcher.RemoveFile = function(file) {
        log.debug('Removing file:', file);
        fs.unlinkSync(file);
    };

    // Читаем каталог на и проверям на наличие в нем файлов
    Watcher.CheckFolder = function() {
        log.debug('Checking folder:', Watcher.dir);
        fs.readdir(Watcher.dir, function(err, files) {
            if (err) return Watcher.Error(err);
            if (files.length == 0) return;

            files.forEach(function(file) {
                if (Watcher.fileMask.test(file) && Watcher.locketFiles.indexOf(file) == -1) {
                    Watcher.NewFile(path.join(Watcher.dir, file));
                }
            });
        });
    };

    log.debug('Setting timer for CheckFolder each', Watcher.timer, 'ms');
    setInterval(Watcher.CheckFolder, Watcher.timer);
}

Watcher.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = Watcher;