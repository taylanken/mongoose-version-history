var mongoose = require('mongoose');
var diffToPatch = require('diff-to-patch');
var jsonPatch = require('json-patch');

function getVersionModel(collectionName) {

    if (mongoose.models[collectionName]) {
        return mongoose.models[collectionName];
    }

    var ChangeSet = new mongoose.Schema({
        parent: mongoose.SchemaTypes.ObjectId,
        version: Number,
        patches: [{
            op: String,
            path: String,
            value: mongoose.SchemaTypes.Mixed
        }]
    });

    return mongoose.model(collectionName, ChangeSet);
}

module.exports = exports = function(schema, options) {
    var versionKey = (options && options.versionKey) ? options.versionKey : 'documentVersion';

    schemaMod = {};
    schemaMod[versionKey] = Number;
    schema.add(schemaMod);

    schema.pre('save', function(next) {
        var historyModel = getVersionModel((options && options.collection) ? options.collection : this.collection.name + '_h');

        if (this.isNew) {
            this[versionKey] = 1;
            var patches = diffToPatch({}, this.toObject());

            var version = new historyModel({
                parent: this._id,
                version: this[versionKey],
                patches: patches
            });

            version.save(next);
        } else {
            this[versionKey]++;
            var newVersion = this.toObject();

            historyModel.find({ parent: this._id }).sort({ version: 1 }).then(function(versions) {
                var patches = [];
                for (var i = 0; i < versions.length; i++) {
                    patches = patches.concat(versions[i].patches);
                }

                var previousVersion = jsonPatch.apply({}, patches);

                var patches = diffToPatch(previousVersion, newVersion);

                var version = new historyModel({
                    parent: newVersion._id,
                    version: newVersion[versionKey],
                    patches: patches
                });

                version.save(next);
            });
        }
    });

    schema.pre('update', function(next) {
        var historyModel = getVersionModel((options && options.collection) ? options.collection : this.collection.name + '_h');

        this[versionKey]++;
        var newVersion = this.toObject();

        historyModel.find({ parent: this._id }).sort({ version: 1 }).then(function(versions) {
            var patches = [];
            for (var i = 0; i < versions.length; i++) {
                patches = patches.concat(versions[i].patches);
            }

            var previousVersion = jsonPatch.apply({}, patches);

            var patches = diffToPatch(previousVersion, newVersion);

            var version = new historyModel({
                parent: newVersion._id,
                version: newVersion[versionKey],
                patches: patches
            });

            version.save(next);
        });
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
            .asc('version')
            .exec()
            .then(function(results) {
                var patches = [];
                for (var i = 0; i < results.length; i++) {
                    patches = patches.concat(results[i].patches);
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