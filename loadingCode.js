(function () {
  // console.log("start of loader script");
  rudderanalytics = window.rudderanalytics = [];

  var methods = [
    'load',
    'page',
    'track',
    'identify',
    'alias',
    'group',
    'ready',
    'reset',
    'getAnonymousId',
    'setAnonymousId',
  ];

  for (var i = 0; i < methods.length; i++) {
    var method = methods[i];
    rudderanalytics[method] = (function (methodName) {
      return function () {
        rudderanalytics.push([methodName].concat(Array.prototype.slice.call(arguments)));
      };
    })(method);
  }
  rudderanalytics.load('writeKey', 'https://dataPlaneUrl', {
    configUrl: 'configBackendUrl',
    logLevel: 'DEBUG',
  });
  // console.log("end of loader script");
})();
