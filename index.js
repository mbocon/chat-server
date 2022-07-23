const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('./config/keys');
const passport = require('passport');

const validateSignUpInput = require('./input_vaildation/signUp');
const validateSignInInput = require('./input_vaildation/signIn');


const app = express();
const server = http.createServer(app);
const io = socketio(server);

const mongoose = require('mongoose');
const URI = require('./config/index');

const mongoURI = process.env.MONGODB_URI || URI;
// const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat';

const PORT = process.env.PORT || 5000;

const Users = require('./models/users');
const Messages = require('./models/messages');


const { MongoClient } = require('mongodb');
const client = new MongoClient(URI, { useUnifiedTopology: true });
// client.connect();
const dbName = 'Chat';
// const db = client.db(dbName);
// const userCol = db.collection("Users");


// async function run () {
//     try {
//         await client.connect();
//         console.log('Connected correctly');
//     } catch (err) {
//         console.log(err.stack);
//     } finally {
//         await client.close()
//     }
// }

// run().catch(console.dir)

// const app = require('./router');

// app.use(router);


mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    console.log("MongoDB connection made!", mongoURI)
});

app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use(express.json());

mongoose.connection.on('error', err => console.log(err.message));
mongoose.connection.on('disconnected', () => console.log('mongo disconnected'));

app.use(passport.initialize());

require('./config/passport')(passport);

const getRooms = () => {
    let rooms = Object.keys(io.sockets.adapter.rooms);
    // console.log(`^^^^^^^^^^^${Object.keys(io.sockets.adapter.rooms)}`)
    let temp = {};
    for(let i = 0; i < rooms.length; i++) {
        temp[rooms[i]] = io.sockets.adapter.rooms[rooms[i]].length;
    }
    return temp;
}

// app.use(cors({credentials: true, origin: 'http://localhost:3000'}));

io.on('connection', (socket) => {
    console.log('We have a new connection!!!');
    // console.log(io.sockets.clients())
    let sockets = io.sockets.clients();

    socket.on('join', (data) => {


        socket.emit('message', { senderName: 'admin', text: `${data.user.username} has joined ${data.room}`, room: data.room});

        socket.broadcast.to(data.room).emit('message', { senderName: 'admin', text: `${data.user.username} has joined!`, room: data.room})

        // socket.emit('newId', Object.keys(io.sockets.sockets));

        
        socket.join(data.room);
        socket.leave(socket.id);

        console.log(`io.sockets.adapter.rooms['Global'].length after join: ${io.sockets.adapter.rooms[data.room].length}`)

        io.of('/').emit('theRooms', getRooms());
        
        // io.of('/').emit('newId', Object.keys(io.sockets.adapter.rooms));
        // socket.emit('theRooms', sockets)
        console.log(`socket.id: ${socket.id}`)
        console.log(`socket.rooms: ${Object.keys(io.sockets.adapter.rooms)}`)


    });

    socket.on('switchRoom', (data) => {
        socket.leave(data.oldRoom);

        
        socket.emit('message', {senderName: 'admin', text: `${data.user.username}, welcome to ${data.newRoom}`});
        
        socket.broadcast.to(data.newRoom).emit('message', {senderName: 'admin', text: `${data.user.username} has joined ${data.newRoom}`});
        
        socket.broadcast.to(data.oldRoom).emit('message', {senderName: 'admin', text: `${data.user.username} has left ${data.oldRoom}`});
        
        socket.join(data.newRoom);
        
        io.of('/').emit('theRooms', getRooms());


        console.log('========================')

        console.log(`Socket.id: ${socket.id}`)

        console.log(`io.sockets.clients() after room switch: ${io.sockets.clients()}`)

        console.log(`socket.rooms['Global']: ${socket.rooms['Global']}`)

        console.log(`io: ${Object.entries(io)}`)

        console.log(`io.sockets.adapter.rooms: ${Object.entries(io.sockets.adapter.rooms)}`)
        // socket.emit('testData', temp);
    })

    socket.on('getRooms', () => {
        // let rooms = Object.keys(io.sockets.adapter.rooms);
        // console.log(`^^^^^^^^^^^${Object.keys(io.sockets.adapter.rooms)}`)
        // let temp = {};
        // for(let i = 0; i < rooms.length; i++) {
        //     temp[rooms[i]] = io.sockets.adapter.rooms[rooms[i]].length;
        // }
        // console.log(`temp rooms: ${Object.keys(temp)}`)

        socket.emit('theRooms', getRooms())
        // console.log(`===============================`)
        // console.log(Object.keys(io.sockets.sockets))
    })

    socket.on('sendMessage', (message) => {
        io.to(message.room).emit('message', {senderName: message.senderName, text: message.text})
    })

    socket.on('roomMessages', (messages) => {
        socket.emit('message', messages)
    })

    socket.on('disconnect', () => {
        console.log('User disconnected')
    });

});

// app.all('/', function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "https://friendly-williams-a3971a.netlify.app/");
//     res.header("Access-Control-Allow-Headers", "X-Requested-With");
//     next()
// });


app.get('/', (req, res) => {
    res.send('Server is up and running');
});

app.post('/signIn', async (req, res) => {

    const { errors, isValid } = validateSignInInput(req.body);

    if (!isValid) {
        return res.json(errors)
    }

    try {
        await client.connect();
        console.log('client connected successfully');
        const db = client.db(dbName);

        const col = db.collection('Users');

        const user = await col.findOne({username: req.body.username});
        console.log(`p: ${Object.entries(user)}`);
        if (!user) {
            res.json({emailnotfound: 'Username not found'})
        }
        bcrypt.compare(req.body.password, user.password).then(isMatch => {
            if (isMatch) {
                const payload = {
                    id: user._id,
                    name: user.username
                };
                jwt.sign(
                    payload,
                    keys.secretOrKey,
                    {
                        expiresIn: 31556926
                    },
                    (err, token) => {
                        res.json({
                            user: user,
                            room: 'Global',
                            signIn: new Date()
                        });
                    }
                );
            } else {
                return res.json({ passwordincorrect: "Password incorrect"});
            }
        })
    } catch (err) {
        console.log(`err.stack: ${err.stack}`)
    }

    finally {
        // await client.close();
    }

});

app.get('/users', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const col = db.collection('Users');

        const users = col.find({});
        res.send(await users.toArray())
    } catch (err) {
        console.log('*********************************')
        console.log(err.stack)
    }
    finally {

    }
})

app.get('/messages/:room/:signIn', async (req, res) => {
    console.log(req.params)
    const signInDate = new Date(req.params.signIn)
    // console.log('***singInDate*****')
    // console.log(signInDate)
    try {
        await client.connect();
        const db = client.db(dbName);
        const col = db.collection('Messages')

        const messages = col.find({
            room: req.params.room,
            createdAt: {$gt: signInDate}
        })
        console.log('==================')
        // console.log(Object.keys(messages.options.db.s.topology.s))
        res.json(await messages.toArray())
    } catch (err) {
        console.log('==================')
        console.log('==================')
        console.log(err.stack)
    }
    finally {

    }
})

// add new user
app.post('/signUp', async (req, res) => {

    

    const { errors, isValid } = validateSignUpInput(req.body);

    if (!isValid) {
        return res.json(errors)
    }

        try {
            await client.connect();
            console.log('client connected successfully');
            const db = client.db(dbName);
        
            const col = db.collection("Users");

            const existingUser = await col.findOne({ username: req.body.username })

            console.log('i exist ! ')
            console.log(existingUser)

            if (existingUser ) {

                return res.json({errors: 'Username is taken'});
    
            } else {
                let userDocument = {
                    "username" : req.body.username,
                    "password" : req.body.password
                }

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(userDocument.password, salt, async (err, hash) => {
                        if (err) throw err;
                        userDocument.password = hash;
                        const p = await col.insertOne(userDocument);
                        res.json({user: p.ops[0], room: 'Global'});
                        })
                    })        
                } 
            }

        finally {

        }
});

// add message
app.post('/messages', async (req, res) => {
    try {
        await client.connect();
        console.log('client connected successfully');
        const db = client.db(dbName);

        const col = db.collection("Messages");

        let msgDocument = {
            "senderId": req.body.senderId,
            "senderName": req.body.senderName,
            "text": req.body.text,
            "room": req.body.room,
            "createdAt": new Date()
        }

        const p = await col.insertOne(msgDocument);
        // console.log(p)
        res.json(p.ops[0]);

    } catch (err) {
        console.log(err.stack)
    }

    finally {
        // await client.close();
    }
})


app.put('/users/:id', async (req, res) => {
    console.log(req.body)
    try {
        await client.connect();
        console.log('client connected successfully');
        const db = client.db(dbName);

        const col = db.collection("Users");

        const p = await col.updateOne({ _id: req.params.id }, {$set: {username: req.body.username}});
        console.log('++++++++++++++++++++');
        console.log(Object.keys(p))
    }
    finally {

    }
})





app.get('/getRooms', (req, res) => {
    console.log(io.sockets.adapter.rooms)
})


server.listen(PORT, () => console.log(`connected at ${PORT}`));