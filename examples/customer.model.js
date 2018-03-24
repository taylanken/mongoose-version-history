const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const versionHistory = require('../index');


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
    trackDate: true
});

module.exports = exports = mongoose.model('User', User);