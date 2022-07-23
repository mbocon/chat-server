const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const URI = require('../config/index');
const { MongoClient } = require('mongodb');
const client = new MongoClient(URI, { useUnifiedTopology: true });
const dbName = 'Chat';
const keys = require('./keys');

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = keys.secretOrKey;

module.exports = passport => {
    passport.use (
        new JwtStrategy(opts, async (jwt_payload, done) => {
            try {
                await client.connect();
                console.log('client connected successfully');
                const db = client.db(dbName);

                const col = db.collection('Users');

                const user = await col.findOne({_id: jwt_payload.id});

                if (user) {
                    return done(null, user)
                }
                return done(null, false)
            }
            finally {

            }
        })
    )
}