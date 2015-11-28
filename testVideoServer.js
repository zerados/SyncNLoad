var controlClient = null;
var clientsWaitingForUpdate = [];
var WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({ port: 8000 });

wss.broadcast = function broadcast(data, messageClient) {
    wss.clients.forEach(function each(client) {
        if(messageClient != client){
            client.send(data);
        }

    });
};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        var message = JSON.parse(message);
        //checks for the command to take  control or surrender it
        if(message.command === "changeControl"){
            //gives up control if client = server held varriable
            if(controlClient === ws){
                controlClient = null;
                ws.send(JSON.stringify({"command" : "changeControl", "control" : false}))
            }
            //takes control if the server side held control is null
            else if(controlClient === null){
                controlClient = ws;
                ws.send(JSON.stringify({"command" : "changeControl", "control" : true}))
            }
        } else if(message.command === "join"){
            if(controlClient !== null){
                try{
                    controlClient.send(JSON.stringify({"command" : "join"}))
                } catch(err){
                    controlClient = null;
                    console.log(err)
                }

            }

        } else if(message.command === "update"){
            clientsWaitingForUpdate.forEach(function each(client){
                client.send(JSON.stringify(message));
                console.log("trying to update joining clients")
            })
            clientsWaitingForUpdate =[];
        }
        else{
            //normal broadcasts only broadcasts if user have control
            //TODO: use same server for chat this needs to be changed
            if(ws === controlClient){
                wss.broadcast(JSON.stringify(message), ws);
            }
        }

    });

    ws.send('something');
});