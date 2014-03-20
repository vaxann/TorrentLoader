var log = require('../log')(module);

var test_str = 'localhost:9091/transmission/rpc/ responded: "success"';
var expr = /responded: "(\w*)"$/gi ;

var match = expr.exec(test_str);

log.debug(match);