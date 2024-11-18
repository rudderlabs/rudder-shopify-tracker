const createLogEntry = (ctx, status = 200, error = null) => {
  const { writeKey, dataPlaneUrl } = ctx.request.query;

  return {
    timestamp: new Date().toISOString(),
    user_agent: ctx.headers['user-agent'],
    ip: ctx.ip,
    endpoint: ctx.originalUrl,
    status,
    writeKey: writeKey || 'N/A',
    dataPlaneUrl: dataPlaneUrl || 'N/A',
    ...(error && { error }),
  };
};

module.exports = { createLogEntry };
