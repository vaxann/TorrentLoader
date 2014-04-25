var exec = require('child_process').exec;
var util = require('util');
var async = require('async');
var actionData = require('transfer_action.json');

function Actor(transmission, dump, condition, actions) {
    log.debug('Creating object Actor with arguments:', arguments);

    var Actor = this;

    Actor.execCommands = function(actions, callback) {
        async.eachSeries(actions,
            function(action, callback){
                if (!actionData.actions[action]) return callback('Error: can\'t find action');

                var req = util.format(actionData.actions[action].req,
                    transmission.host,
                    transmission.port,
                    transmission.auth,
                    dump.hash);

                // TODO: load mask
                var res = actionData.actions[action].res;

                exec(req,
                    function (error, stdout, stderr) {
                        log.debug("Response to changing dir:", arguments);
                        if (error)  return callback(util.format('Error with action: %j', error));
                        if (stderr) return callback(util.format('Error with action: %j', stderr));

                        var match = checkDownloadStateRes.exec(stdout);
                        log.debug("Results of exec regexp to action response: match =", match);

                        if (match != null && match.length > 1 && match[1] == actionData.actions[action].success){
                            callback(null, match[1]);
                        } else {
                            callback('Error with action res not success:', match[1]);
                        }
                    });
            },callback);
    };

    Actor.getParam = function(param, callback) {

    };

    Actor.exec = function(callback){
        if (condition) {


        } else {
            Actor.execCommands(actions, callback);
        }

        //var setInterval(Worker.CheckDownloadState, 30000);

        //setInterval
        for (var i=0; i < params.length; i++){
            if (params[i] == 'if') {

            }
        }
    };
}

module.exports = Actor;