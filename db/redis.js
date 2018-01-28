var redis = require('redis');
var redisClient = redis.createClient(); //creates a new client

redisClient.on('connect', function () {
  console.log('   Connected to Redis');
});

module.exports = redisClient;
