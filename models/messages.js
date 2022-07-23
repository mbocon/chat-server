const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = Schema ({
    senderId: String,
    senderName: String,
    text: String,
    room: String
});

const Messages = mongoose.model('Message', messageSchema);

module.exports = Messages;