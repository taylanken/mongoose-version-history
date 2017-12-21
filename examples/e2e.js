const mongoose = require('mongoose');
const User = require('./customer.model');

mongoose.connect('mongodb://localhost:27017/dbversion-e2e', {
    useMongoClient: true
});

let user = new User({
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

user.save().then((user) => {
    console.log('V1 created!');

    user.phone = '+1 (872) 735-9954';
    user.address.no = '78';
    user.name.last = 'McKnight';

    return user.save();
}).then(() => {
    console.log('V2 created!');
});