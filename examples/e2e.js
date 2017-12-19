const mongoose = require('mongoose');
const Customer = require('./customer.model');

mongoose.connect('mongodb://localhost:27017/dbversion-e2e', {
    useMongoClient: true
});