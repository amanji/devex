/**
 * Connect to staging database.
 * This currenty assumes that the staging db will be named `devexStaging`.
 */
var connection = new Mongo();
var db = connection.getDB("devexStaging");

print('Connected to db: ' + db);

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

try {
    /**
    * Get list of all collections.
    */
    var collectionNames = db.getCollectionNames();
    if (!collectionNames.length) {
        throw new Error('No collections in db: ' + db);
    }
    print('Found ' + collectionNames.length + ' collections.');

    /**
     * Get list of sensitive collections.
     */
    var sensitiveCollectionNames = collectionNames.filter(function(collectionName) {
        return !collectionWhitelist.includes(collectionName);
    });
    print('Found ' + sensitiveCollectionNames.length + ' sensitive collections.');

    sensitiveCollectionNames.forEach(collectionName => {
        var collection = db.getCollection(collectionName);

        /**
         * Setup filter query for updateMany
         */
        var existsOrQuery = removableFields[collectionName].map(function(field) {
            return { [field]: { $exists: true} };
        });
        var filterQuery = { $or: existsOrQuery };

        if (collectionName === 'users') {
            var notQuery = ['admin', 'dev', 'gov', 'user'].map(function(username) {
                return { 'username': { $ne: username } };
            });
            filterQuery.$and = notQuery;
        }

        /**
         * Setup update obects for updateMany
         */
        var updateParameters = removableFields[collectionName].reduce(function(updates, field) {
            updates[field] = defaults[field] || '';
            return updates;
        }, {});

        /**
         * Attempt updateMany
         */
        try {
            if (indexes.hasOwnProperty(collectionName)) {
                /**
                 * TODO: Need to figure out a better way to deal with overwriting unique indexes.
                 * For now simply dropping the indexes so that an empty string value can be written.
                 */
                collection.dropIndexes();
            }

            var result = collection.updateMany(filterQuery, { $set: updateParameters });
            print('Found ' + result.matchedCount + ' entries in ' + collectionName +
                ' with sensitive fields...scrubbed ' + result.modifiedCount + ' entries clean');
        } catch (error) {
            throw error;
        }
    });

} catch (error) {
    print(error);
}