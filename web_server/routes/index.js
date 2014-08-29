var WebLoggerStorage = require('../../log/web_logger_storage');

module.exports = function(WebServer) {
    WebServer.app.get('/', function(req, res, next){
        //res.send(JSON.stringify(WebLoggerStorage.storage,null,4));
        res.render('index');
    });
};