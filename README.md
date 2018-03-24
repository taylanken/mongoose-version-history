# mongoose-version-history

Mongoose plugin that tracks version history of documents by storing diffs in JSON Patch format.

## Install

```bash
npm install mongoose-version-history
```

## Usage

To use the plugin, simply ```require``` it and add it to the mongoose-schemas you want versioning activated for:

```javascript
const Schema = require('mongoose').Schema;
const versionHistory = require('mongoose-version-history');

let User = new Schema({
    name: {
        first: String,
        last: String
    },
    address: {
        street: String,
        no: String,
        zipCode: String,
        city: String,
        country: String
    },
    birthdate: Date,
    email: String,
    phone: String
});

User.plugin(versionHistory [, options]);
```

The plugin will add a new number-field indicating the current version of the document to your schema.
It will store the history as JSON Patch diffs in a separate collection. Each changeset is directly bound to a specific version number, enabling you to track every change made for each version and to reconsruct a specific version of your document.

The version number gets incremented on each save/update.

## Options

### versionKey

The name of the version-field that gets added to the schema. Defaults to ```documentVersion```.

### collection

The name of the collection the history gets stored to. Defaults to the name of the schema's collection with an ```_h``` appended to it.

### connection

The database connection object. This option is required if the database is being connected via ```mongoose.createConnection``` instead of ```mongoose.connect```.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const versionHistory = require('mongoose-version-history');

let db = mongoose.createConnection('mongodb://my-database');

let User = new Schema({
    name: {
        first: String,
        last: String
    },
    address: {
        street: String,
        no: String,
        zipCode: String,
        city: String,
        country: String
    },
    birthdate: Date,
    email: String,
    phone: String
});

User.plugin(versionHistory, {
    connection: db
});
```

### trackDate

If set to ```true```, the date of creation will be tracked for each version, causing the __history-collection__ to have an additional field ```date```. If you want to redundantly store the date of the current version in the document itself aswell, additionally enable the ```addDateToDocument```-option.

### addDateToDocument

If set to ```true```, and if the ```trackDate```-option is enabled, the date of the current version will be reduntantly stored in the actual document aswell.

### versionDateKey

The name of the versionDate-field that gets added to the schema if the ```addDateToDocument```-option is enabled. Defaults to ```documentVersionDate```.

## Retrieving specific document version

To retrieve a specific version of your document, you can use the ```getVersion``` function, passing the version number you want to access.

The ```getVersion``` returns a promise resolving to the desired document version, but it also supports callbacks:

```javascript
// Promises
User.findOne({...}).then(user => {
    return user.getVersion(2);
}).then(userV2 => {
    ...
});

// Callbacks
User.findOne({...}, (err, user) => {
    if(err) {
        ...
    }

    user.getVersion(2, (err, userV2) => {
        ...
    });
});
```

## Accessing the history collection directly

To access the history collection directy, you can call the ```getHistoryModel`` function on a model.
It will return a mongoose-model of the history collection:

```javascript
let UserHistory = User.getHistoryModel();
UserHistory.find({...});
...
```

Each entry in the history collection represents a changeset (= one or more JSON Patches) and has the following schema:

```javascript
var ChangeSet = new mongoose.Schema({
    parent: mongoose.SchemaTypes.ObjectId, // The ID of the source-document this changeset is attached to
    version: Number, // The version this changeset was created for
    patches: [{ // Array of JSON-Patches representing the change
        op: String, // Patch-operation
        path: String, // Patch-patch
        value: mongoose.SchemaTypes.Mixed // Patch-value
    }],
    date: Date // Only if the trackDate-option is enabled
});
```