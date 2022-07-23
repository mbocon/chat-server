const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = Schema ({
    username: {type: String, unique: true},
    password: String
});

const Users = mongoose.model('User', userSchema);

module.exports = Users;