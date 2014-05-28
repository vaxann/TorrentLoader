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

                var res = new RegExp(actionData.actions[action].res, 'gi');


                exec(req,
                    function (error, stdout, stderr) {
                        log.debug("Execked command:", arguments);
                        if (error)  return callback(util.format('Error with action: %j', error));
                        if (stderr) return callback(util.format('Error with action: %j', stderr));

                        var match = res.exec(stdout);
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
        if (!actions) return callback('Error: nothing to do');

        if (condition) {
            var paramValue = null;
            async.doUntil(
                function(callback) { // Work function
                    Actor.getParam(condition.param, function(err, value){
                        if (err) return callbak(err);

                        paramValue = value;
                        setTimeout(callback, 30000);
                    });
                },
                function() { // Check function
                    if (condition.operation == '='){
                        return (paramValue == condition.value);
                    } else if (condition.operation == '>') {
                        return (paramValue > condition.value);
                    } else if (condition.operation == '>=') {
                        return (paramValue >= condition.value);
                    } else if (condition.operation == '<') {
                        return (paramValue < condition.value);
                    } else if (condition.operation == '<=') {
                        return (paramValue <= condition.value);
                    } else if (condition.operation == '!=') {
                        return (paramValue != condition.value);
                    } else {
                        return false;
                    }
                },
                function(err){
                    if (err) return callback(err);

                    Actor.execCommands(actions, callback);
                }
            );
        } else {
            Actor.execCommands(actions, callback);
        }
    };
}

module.exports = Actor;