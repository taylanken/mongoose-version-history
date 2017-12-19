const mongoose = require('mongoose');
const Customer = require('./customer.model');

mongoose.connect('mongodb://localhost:27017/dbversion-e2e', {
    useMongoClient: true
});

let customer = new Customer({
    name: {
        first: 'Wright',
        last: 'Mcknight'
    },
    address: {
        street: 'Richardson Street',
        no: 'Richardson Street',
        zipCode: '611',
        city: 'Lorraine',
        country: 'us'
    },
    birthdate: new Date('2001-11-09T07:56:00.000Z'),
    email: 'mcknight.wright@darwinium.io',
    phone: '+1 (831) 418-3122'
});

customer.save().then((customer) => {
    console.log('V1 created!');

    customer.phone = '+1 (872) 735-9954';
    customer.address.no = '78';
    customer.name.last = 'McKnight';

    return customer.save();
}).then(() => {
    console.log('V2 created!');
});