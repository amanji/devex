'use strict';

var defaultEnvConfig = require('./default');
var testConfig = require('./test');

module.exports = Object.assign({}, testConfig, {
    app: {
        title: defaultEnvConfig.app.title + ' - Staging Environment'
    },
    db: {
        uri: process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://' + (process.env.MONGODB_SERVICE_HOST || process.env.DB_DEVEX_PORT_27017_TCP_ADDR || 'localhost') + '/' + (process.env.MONGODB_DATABASE || 'staging'),
        options: {
          user: '',
          pass: ''
        },
        // Enable mongoose debug mode
        debug: process.env.MONGODB_DEBUG || false,
        prod: {
            uri: process.env.MONGOHQ_PROD_URL || process.env.MONGODB_PROD_URI || 'mongodb://' + (process.env.MONGODB_PROD_SERVICE_HOST || process.env.DB_DEVEX_PORT_27017_TCP_ADDR || 'localhost') + '/' + (process.env.MONGODB_PROD_DATABASE || 'mean'),
            options: {
              user: process.env.MONGODB_PROD_USER || '',
              pass: process.env.MONGODB_PROD_PASSWORD || ''
              /**
                * Uncomment to enable ssl certificate based authentication to mongodb
                * servers. Adjust the settings below for your specific certificate
                * setup.
              server: {
                ssl: true,
                sslValidate: false,
                checkServerIdentity: false,
                sslCA: fs.readFileSync('./config/sslcerts/ssl-ca.pem'),
                sslCert: fs.readFileSync('./config/sslcerts/ssl-cert.pem'),
                sslKey: fs.readFileSync('./config/sslcerts/ssl-key.pem'),
                sslPass: '1234'
              }
              */
            },
        }
      }
});