const Koa = require('koa');
const dotenv = require('dotenv');
const router = require('./router');

dotenv.config();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9091;
const app = new Koa();

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => console.log(`listening on port: ${PORT}`));
