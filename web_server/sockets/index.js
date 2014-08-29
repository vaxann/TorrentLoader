var Log = require('../../log')(module);

module.exports = function(WebServer) {
    WebServer.io.on('connection', function (socket) {
        socket.emit('news', { hello: 'world' });
        socket.on('my other event', function (data) {
            Log.debug(data);
        });
    });
};