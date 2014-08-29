var util = require('util'),
    winston = require('winston');
var Type = require('type-of-is');
var dateFormat = require('dateformat');

var storage = require('./web_logger_storage').storage;
var webServer = require('./web_logger_storage').webServer;

var WebLogger = winston.transports.CustomerLogger = function (options) {

    var self = this;

    self.name = 'WebLogger';

    self.level = options.level || 'info';

    if (Type(options.timestamp, 'Function'))
        self.timestamp = options.timestamp;
    else
        self.timestamp = function(){
            return dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss.L");
        };

    self.label = options.label || '';
};

util.inherits(WebLogger, winston.Transport);

WebLogger.prototype.log = function (level, msg, meta, callback) {
    var self = this;

    var obj = {
        time: new Date(),
        timestamp: self.timestamp(),
        level: level,
        label: self.label,
        msg: msg
    };

    storage.push(obj);
    storage.webServer.push(obj);

    callback(null, true);
};

module.exports = WebLogger;