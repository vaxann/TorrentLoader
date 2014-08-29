var socket = io.connect();
var logTable = $('#log ul');

socket.on('log', function (data) {
    //console.log(data);
    //socket.emit('my other event', { my: 'data' });
    $('<li>',{text: data.msg}).appendTo(logTable);
});
