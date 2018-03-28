'use strict';

var config = require('../config'),
    MongoClient = require('mongodb').MongoClient;

var dbUrl = config.db.uri;
var dbHostname = config.db.hostname;
var dbName = config.db.name;

/**
 * Collections that don't contain sensitive info.
 */
var collectionWhitelist = [
    'capabilities',
    'capabilityskills',
    'configuration',
    'notifications',
    'projects',
    'sessions',
    'skills',
    'subscriptions',
    'teams'
];

var removableFields = {
    'opportunities': [
        'proposalEmail'
    ],
    'orgs': [
        'name',
        'dba',
        'address',
        'address2',
        'city',
        'province',
        'postalcode',
        'fullAddress',
        'contactName',
        'contactEmail',
        'contactPhone',
        'website',
        'orgImageURL'
    ],
    'profiles': [
        'github',
        'stackOverflow',
        'stackExchange',
        'linkedIn',
        'website'
    ],
    'programs': [
        'owner'
    ],
    'proposals': [
        'businessName',
        'businessAddress',
        'businessContactName',
        'businessContactEmail',
        'businessContactPhone'
    ],
    'users': [
        'firstName',
        'lastName',
        'displayName',
        'username',
        'email',
        'address',
        'phone',
        'businessName',
        'businessAddress',
        'businessAddress2',
        'businessCity',
        'businessProvince',
        'businessCode',
        'businessContactName',
        'businessContactEmail',
        'businessContactPhone',
        // Removed the following since they may contain personal information
        'profileImageURL',
        'providerData',
        'github',
	    'stackOverflow',
	    'stackExchange',
        'linkedIn',
        'website'
    ]
};

var defaults = {
    'province': 'BC',
    'businessProvince': 'BC'
};

var indexes = {
    'users': {
        'email': { unique: true },
        'username': { unique: true }
    }
};

var _client;

var connectDB = function() {
    return new Promise(function(resolve, reject) {
        MongoClient.connect(dbUrl, {
            replicaSet: null
        }, function(error, client) {
            if (error) {
                return reject(error);
            }
            _client = client;
            console.log('Scrubbing database: ' + dbName);
            return resolve();
        });
    });
}

var dropDB = function() {
    return _client.db(dbName)
        .dropDatabase();
}

var copyProdDB = function() {
    var copyCommand = {
        copydb: 1,
        fromhost: dbHostname,
        fromdb: '' /* Pass in the name of the DB to copy from */,
        todb: dbName
    };

    return _client.db(dbName)
        .admin()
        .command(copyCommand)
}

/**
* Get list of all collections.
*/
var getDBCollections = function() {
    return _client.db(dbName)
        .collections();
}

var scrubDB = function(collections) {
    /**
     * Get list of sensitive collections.
     */
    var sensitiveCollections = collections.filter(function(collection) {
        return collectionWhitelist.indexOf(collection.collectionName) === -1;
    });
    console.log('Found ' + sensitiveCollections.length + ' sensitive collections.');

    var promise = Promise.resolve();

    sensitiveCollections.forEach(function(collection) {
        /**
         * Setup filter query for updateMany
         */
        var existsOrQuery = removableFields[collection.collectionName].map(function(field) {
            var queryObject = {};
            queryObject[field] = { $exists: true};
            return queryObject;
        });

        var filterQuery = { $or: existsOrQuery };

        if (collection.collectionName === 'users') {
            var notQuery = ['admin', 'dev', 'gov', 'user'].map(function(username) {
                return { 'username': { $ne: username } };
            });
            filterQuery.$and = notQuery;
        }

        /**
         * Setup update obects for updateMany
         */
        var updateParameters = removableFields[collection.collectionName]
            .reduce(function(updates, field) {
                updates[field] = defaults[field] || '';
                return updates;
            }, {});


        if (indexes.hasOwnProperty(collection.collectionName)) {
            /**
             * TODO: Need to figure out a better way to deal with overwriting unique indexes.
             * For now simply dropping the indexes so that an empty string value can be written.
             */
            promise.then(function() {
                return collection.dropIndexes();
            });
        }

        promise.then(function(result) {
            /**
            * Attempt updateMany
            */
            return collection.updateMany(filterQuery, { $set: updateParameters });
        }).then(function(result) {
            console.log('Found ' + result.matchedCount + ' entries in ' + collection.collectionName +
            ' with sensitive fields...scrubbed ' + result.modifiedCount + ' entries clean');
        });
    });

    return promise;
}

var closeClient = function() {
    if (_client) {
        _client.close();
    }
}

module.exports.scrub = function() {
    return connectDB()
        /**
         * Comment the following lines out to drop the DB and copy it from the specified
         * `fromdb` parameter in `copyProdDB()`.
         */
        // .then(function() {
        //     return dropDB();
        // })
        // .then(function() {
        //     return copyProdDB();
        // })
        .then(function() {
            return getDBCollections();
        })
        .then(function(collections) {
            if (!collections.length) {
                return Promise.reject('No collections in db: ' + dbName);
            }
            console.log('Found ' + collections.length + ' collections.');
            return scrubDB(collections);
        })
        .then(function() {
            closeClient();
        })
        .catch(function(error) {
            console.error(error);
            closeClient();
        });
};
