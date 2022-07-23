const express = require('express');
const router = express.Router();

const Users = require('./models/users');
const { io } = require('./index.js');



router.post('/signIn', (req, res) => {
    Users.findOne({username: req.body.username}, (err, data) => {
        if (data.password === req.body.password) {
            res.json(data);
        } else {
            res.json({error: 'Incorrect username/password combination'})
        }
    })
});

router.get('/users', (req, res) => {
    Users.find({}, (err, data) => {
        res.json(data)
    })
})

// add new user
router.post('/signUp', (req, res) => {
    Users.create({
        username: req.body.username,
        password: req.body.password
    }, (err, data) => {
        res.json(data);
    });
    console.log(`req.body: ${JSON.stringify(req.body)}`)
});

module.exports = router;