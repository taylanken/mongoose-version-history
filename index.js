var mongoose = require('mongoose');
var diffToPatch = require('diff-to-patch');
var jsonPatch = require('json-patch');

module.exports = exports = function(schema, options) {
    var versionKey = (options && options.versionKey) ? options.versionKey : 'documentVersion';
    var versionDateKey = (options && options.versionDateKey) ? options.versionDateKey : 'documentVersionDate';
    var connection = (options && options.connection) ? options.connection : mongoose;
    var trackDate = (options && options.trackDate) ? true : false;
    var addDateToDocument = (options && options.addDateToDocument) ? true : false;

    function getVersionModel(collectionName) {

        if (connection.models[collectionName]) {
            return connection.model(collectionName);
        }

        var schemaConfig = {
            parent: mongoose.SchemaTypes.ObjectId,
            version: Number,
            patches: [{
                op: String,
                path: String,
                value: mongoose.SchemaTypes.Mixed
            }]
        };

        if (trackDate) {
            schemaConfig.date = Date;
        }

        var ChangeSet = new mongoose.Schema(schemaConfig);

        return connection.model(collectionName, ChangeSet);
    }

    schemaMod = {};
    schemaMod[versionKey] = Number;
    if (addDateToDocument) {
        schemaMod[versionDateKey] = Date;
    }
    schema.add(schemaMod);

    schema.pre('save', function(next) {
        var historyModel = getVersionModel((options && options.collection) ? options.collection : this.collection.name + '_h');
        var date = new Date();

        if (this.isNew) {
            this[versionKey] = 1;
            if (trackDate && addDateToDocument) {
                this[versionDateKey] = date;
            }
            var patches = diffToPatch({}, this.toObject());

            var versionObject = {
                parent: this._id,
                version: this[versionKey],
                patches: patches
            }

            if (trackDate) {
                versionObject.date = date;
            }

            var version = new historyModel(versionObject);

            version.save(next);
        } else {
            this[versionKey]++;
            if (trackDate && addDateToDocument) {
                this[versionDateKey] = date;
            }
            var newVersion = this.toObject();

            historyModel.find({ parent: this._id }).sort({ version: 1 }).then(function(versions) {
                var patches = [];
                for (var i = 0; i < versions.length; i++) {
                    patches = patches.concat(versions[i].patches);
                }

                var previousVersion = jsonPatch.apply({}, patches);

                var patches = diffToPatch(previousVersion, newVersion);

                var versionObject = {
                    parent: newVersion._id,
                    version: newVersion[versionKey],
                    patches: patches
                };

                if (trackDate) {
                    versionObject.date = date;
                }

                var version = new historyModel(versionObject);

                version.save(next);
            }.bind(this));
        }
    });

    schema.pre('update', function(next) {
        var historyModel = getVersionModel((options && options.collection) ? options.collection : this.collection.name + '_h');
        var date = new Date();

        this[versionKey]++;
        if (trackDate && addDateToDocument) {
            this[versionDateKey] = date;
        }
        var newVersion = this.toObject();

        historyModel.find({ parent: this._id }).sort({ version: 1 }).then(function(versions) {
            var patches = [];
            for (var i = 0; i < versions.length; i++) {
                patches = patches.concat(versions[i].patches);
            }

            var previousVersion = jsonPatch.apply({}, patches);

            var patches = diffToPatch(previousVersion, newVersion);

            var versionObject = {
                parent: newVersion._id,
                version: newVersion[versionKey],
                patches: patches
            };

            if (trackDate) {
                versionObject.date = date;
            }

            var version = new historyModel(versionObject);

            version.save(next);
        }.bind(this));
    });

    /**
     * Returns the specified version number of a document
     * @param {number} versionNumber - The version number to return
     * @param {Function} cb - The callback-function
     * @returns {Promise} - A promise resolving to the specified version of the document
     */
    schema.methods.getVersion = function(versionNumber, cb) {
        if (versionNumber < 1 ||  versionNumber > this[versionKey]) {
            var vErr = new Error('The version number cannot be smaller than 1 or larger than ' + this[versionKey]);
            if (cb instanceof Function) {
                cb(vErr);
            }
            throw vErr;
        }

        var historyModel = getVersionModel((options && options.collection) ? options.collection : this.collection.name + '_h');
        return historyModel
            .where('parent').equals(this._id)
            .where('version').lte(versionNumber)
            .select('patches')
            .sort({ version: 1 })
            .exec()
            .then(function(results) {
                var patches = [];
                for (var i = 0; i < results.length; i++) {
                    patches = patches.concat(results[i].patches);
                }
                
                if (cb instanceof Function) {
                    cb(null, jsonPatch.apply({}, patches));
                }
            
                return jsonPatch.apply({}, patches);
            }).catch(function(err) {
                if (cb instanceof Function) {
                    cb(err);
                }

                throw err;
            });
    }

    /**
     * Returns the mongoose model for the version collection
     * @returns {mongoose.Model} - The mongoose model for the schema's version collection
     */
    schema.statics.getHistoryModel = function() {
        return getVersionModel((options && options.collection) ? options.collection : this.collection.name + '_h');
    }

}
