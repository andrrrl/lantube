import { createClient } from 'redis';
const redis = createClient();
redis.connect();

export default redis;
