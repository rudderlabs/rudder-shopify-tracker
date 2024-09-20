const fs = require('fs');
const { join } = require('path');
const Router = require('koa-router');
const axios = require('axios');
require('dotenv').config();

const router = new Router();

const configUrl = process.env.CONFIG_BACKEND_URL || 'https://api.rudderstack.com';
const jsSdkCdnUrl =
  process.env.JS_SDK_CDN || 'https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js';

const ensureHttpsPrefix = (url) => {
  // Check if the URL starts with http:// or https://
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

const formatDataPlaneURL = (dataPlaneUrl) => {
  // TODO :: Sanitize dataplane url with basic checks before prefixing with https
  const newDataPlaneUrl = ensureHttpsPrefix(dataPlaneUrl);
  try {
    new URL(newDataPlaneUrl); // This will throw if the URL is invalid
    return newDataPlaneUrl;
  } catch {
    return undefined;
  }
};
const isValidWriteKey = (writeKey) => /^[A-Za-z0-9_]{5,}$/.test(writeKey);

router.get('/load', async (ctx) => {
  // only takes in writeKey and DataPlane Url

  let rudderJsCode;
  try {
    const resp = await axios.get(jsSdkCdnUrl);
    rudderJsCode = resp.data;
  } catch (err) {
    ctx.response.body = 'failed to fetch rudder-js-sdk';
    ctx.status = 400;
    return ctx;
  }

  let d = fs.readFileSync(join(__dirname, 'loadingCode.js'), {
    encoding: 'utf-8',
  });
  let deviceModeInit = fs.readFileSync(join(__dirname, 'deviceModeInit.js'), {
    encoding: 'utf-8',
  });

  const { writeKey, dataPlaneUrl } = ctx.request.query;
  console.log('writeKey', writeKey);
  console.log('dataplaneUrl', dataPlaneUrl);
  if (formatDataPlaneURL(dataPlaneUrl) === undefined || !isValidWriteKey(writeKey)) {
    ctx.response.body = {
      error: 'writeKey or dataPlaneUrl is invalid or missing',
    };
    ctx.status = 400;
    return ctx;
  }
  const formattedDataPlaneUrl = formatDataPlaneURL(dataPlaneUrl);
  console.log('formattedDataPlaneUrl', formattedDataPlaneUrl);

  d = d.replace('writeKey', writeKey);
  d = d.replace('dataPlaneUrl', formattedDataPlaneUrl);
  d = d.replace('configBackendUrl', configUrl);

  const pollTimeForSessionIdentifierCheck =
    process.env?.pollTimeForSessionIdentifierCheck || 5 * 60 * 1000; // default 5 mins
  deviceModeInit = deviceModeInit.replace(
    /sessionIdentifierPollTime_placeHolder/g,
    pollTimeForSessionIdentifierCheck,
  );
  deviceModeInit = deviceModeInit.replace(/dataplaneUrl_placeHolder/g, formattedDataPlaneUrl);
  deviceModeInit = deviceModeInit.replace(/writeKey_placeHolder/g, writeKey);
  deviceModeInit = deviceModeInit.replace(/configUrl_placeholder/g, configUrl);

  // console.log("d", d);
  ctx.response.body = d + rudderJsCode + deviceModeInit;
  ctx.set('Content-Type', 'application/javascript');
  return ctx;
});

router.get('/health', (ctx) => {
  ctx.response.body = 'Server is Up';
  ctx.status = 200;
  return ctx;
});

module.exports = router;
