const Schema = require('mongoose').Schema;
const versionHistory = require('../index');

let Customer = new Schema({
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
Customer.plugin(versionHistory);

module.exports = exports = mongoose.model('Customer', Customer);