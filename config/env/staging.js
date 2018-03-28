'use strict';

var defaultEnvConfig = require('./default');
var developmentConfig = require('./development');

var dbName = (process.env.MONGODB_DATABASE || 'devexStaging');

module.exports = Object.assign({}, developmentConfig, {
    app: {
        title: defaultEnvConfig.app.title + ' - Staging Environment'
    },
    db: {
        uri: process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://' + (process.env.MONGODB_SERVICE_HOST || process.env.DB_DEVEX_PORT_27017_TCP_ADDR || 'localhost') + '/' + dbName,
        hostname: (process.env.MONGODB_PORT_27017_TCP_ADDR || process.env.DB_DEVEX_PORT_27017_TCP_ADDR),
        name: dbName,
        options: {
          user: '',
          pass: ''
        },
        // Enable mongoose debug mode
        debug: process.env.MONGODB_DEBUG || false
      }
});