var winston = require('winston');
var dateFormat = require('dateformat');
var ENV = process.env.NODE_ENV;

// can be much more flexible than that O_o
function getLogger(module) {

    var path = module.filename.split('/').slice(-2).join('/');

    return new winston.Logger({
        transports: [
            new winston.transports.Console({
                colorize: true,
                prettyPrint: true,
                silent: false,
                timestamp: function(){
                    return dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss.L");
                },
                //level: (ENV == 'development') ? 'debug' : 'error',
                level: 'debug',
                label: path
            })
        ]
    });
}

module.exports = getLogger;