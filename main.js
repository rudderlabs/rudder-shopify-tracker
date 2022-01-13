const Koa = require("koa");
const router = require("./router");

const PORT = 9091;
const app = new Koa();

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT);