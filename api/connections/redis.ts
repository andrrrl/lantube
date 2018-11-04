import * as redisClient from 'redis';

let redis = redisClient.createClient();

redis.on("error", function (err) {
    console.log("Error " + err);
});

redis.once('connect', () => {
    console.log('   > Connected to REDIS!');
    exports = redis;
});

// In case we encounter an error...print it out to the console
redis.on("error", (err) => {
    console.log("Redis Error: " + err);
});

export = redis;
