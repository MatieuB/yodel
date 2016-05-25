var express = require('express');
var router = express.Router();
var knex = require('../db/knex.js');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');


/* GET home page. */
router.get('/', function(req, res, next) {
  knex('users').select().then(function(results){
    res.json(results)
  })
});
//me route
router.get('/me', function(req, res, next) {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload is {id: 56}
    knex('users').where({id: payload.id}).first().then(function (user) {
      if (user) {
        res.json({id: user.id, name: user.username})
      } else {
        res.status(403).json({
          error: "Invalid ID"
        })
      }
    })
  } else {
    res.status(403).json({
      error: "No token"
    })
  }
})


//'filter and miles'
router.get('/buddylist', function(req, res, next){
  var userLat = 40.0179;
  var userLong = -105.28;
  knex.raw('SELECT * FROM users WHERE acos(sin(' + userLat + ' * PI() / 180) * sin(lat * PI() / 180) + cos(' + userLat +' * PI() / 180) * cos(lat * PI() / 180) * cos((long * PI() / 180) - ('+ userLong +' * PI() / 180))) * 3959 <= 5 AND active = true' )
  .then(function(results){
    res.json(results.rows)
  })
})


router.post('/newlocation', function(req, res, next) {
  knex('users')
  .where('username', '=', req.body.username.toLowerCase())
  .first()
  .update(req.body)
  .returning('*')
  .then(function(response){
    console.log('response from server location route: ', response)
    res.json(response)
  });
});
//signup w/ bcrypt
router.post('/signup', function(req, res, next) {
  console.log('postrequest received')
  knex('users')
  .whereRaw('lower(username) = ?', req.body.username.toLowerCase())
  .count()
  .first()
  .then(function(result) {
    if (result.count === "0") {
      var saltRounds = 4;
      var passwordHash = bcrypt.hashSync(req.body.password, saltRounds)
      console.log('inserting')
      knex('users').insert({
        username: req.body.username,
        password: passwordHash
      })
      .returning('*').then(function(userReturn) {
        var user = (userReturn[0])
        var token = jwt.sign({
          id: user.id
        }, process.env.JWT_SECRET)
        res.json({
          id: user.id,
          name: user.username,
          token: token
        })
      })
    } else {
      res.status(422).json({
        errors: ['Email already taken']
      })
    }
  })
})
//login w/ bcrypt
router.post('/login', function(req,res,next) {
  knex('users')
  .where( 'username', req.body.username)
  .first()
  .then(function(response){
    // error check for email??
    if(response && bcrypt.compareSync(req.body.password, response.password)){
      console.log('user found');
      //  console.log('from the response promise:', response)
      const user = response;
      console.log('user: ',user)
      const token = jwt.sign( {id:user.id} , process.env.JWT_SECRET);
      console.log('token',token)
      res.json({
        id: user.id,
        // email: user.email,
        username: user.username,
        token: token
      })
    } else {
      res.status(422).send('Invalid username or password')
    }
  });
})




module.exports = router;
