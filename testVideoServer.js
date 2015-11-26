
var WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({ port: 8000 });

wss.broadcast = function broadcast(data) {
    console.log('test')
    wss.clients.forEach(function each(client) {
        console.log('sending message')
        client.send(data);
    });
};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        wss.broadcast(message);
    });

    ws.send('something');
});