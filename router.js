const fs = require("fs");
const Router = require("koa-router");

let d = fs.readFileSync("./code.js", {
  encoding: "utf-8",
});
const router = new Router();

router.get('/', ctx => {
  // TODO: always set prod config-be url when app is in production
  // only take in writeKey and DataPlane Url
  
  const { writeKey, dataPlaneUrl, configBackendUrl } = ctx.request.query;
  if (!writeKey || !dataPlaneUrl || !configBackendUrl) {
    ctx.response.body = {
      error: 'writeKey or dataPlaneUrl or configBackendUrl is invalid or missing'
    };
    ctx.status = 400;
    return ctx;
  }
  d = d.replace("writeKey", writeKey);
  d = d.replace("dataPlaneUrl", dataPlaneUrl);
  d = d.replace("configBackendUrl", configBackendUrl);
  ctx.response.body = d;
  ctx.set("Content-Type", "application/javascript");
  return ctx;
});

module.exports = router;