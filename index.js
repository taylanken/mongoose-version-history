var mongoose = require('mongoose');
var diffToPatch = require('diff-to-patch');
var jsonPatch = require('json-patch');

function getVersionModel(collectionName) {

    if (mongoose.models[collectionName]) {
        return mongoose.models[collectionName];
    }

    var Version = new mongoose.Schema({
        parent: mongoose.SchemaTypes.ObjectId,
        version: Number,
        patches: [{
            op: String,
            path: String,
            value: mongoose.SchemaTypes.Mixed
        }]
    });

    return mongoose.model(collectionName, Version);
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
}