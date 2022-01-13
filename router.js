const fs = require("fs");
const Router = require("koa-router");

let d = fs.readFileSync("./code.js", {
  encoding: "utf-8",
});
const router = new Router();

router.get('/', ctx => {
  // const { writeKey } = ctx.params;
  // if (!writeKey) {
  //   ctx.response.body = {
  //     error: 'writeKey is invalid or missing'
  //   };
  //   ctx.status = 400;
  //   return ctx;
  // }
  // d = d.replace("writeKey", writeKey);
  ctx.response.body = d;
  ctx.set("Content-Type", "application/javascript");
  return ctx;
});

module.exports = router;