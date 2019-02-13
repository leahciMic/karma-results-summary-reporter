var travisFold = require('travis-fold');
var colors = require('colors');

var SpecReporter = function(baseReporterDecorator, config, emitter) {
  function formatLog(type, log) {
    var colorMap = {
      log: 'white',
      warn: 'yellow',
      error: 'red',
      info: 'blue',
      debug: 'grey'
    };
    if (config.colors) {
      console.log('should be a color', type, colorMap[type]);
      return String(type + ': ')[colorMap[type]] + log;
    } else {
      return type + ': ' + log;
    }
  }

  function formatTest(test) {
    return test.suite.join(' > ') + ': ' + test.description;
  }

  baseReporterDecorator(this);

  var perBrowserInfo = {};
  var failures = [];

  this.onBrowserStart = function(browser) {
    perBrowserInfo[browser.id] = {
      currentTest: undefined,
      logs: []
    };
  };

  this.onRunStarted = function(browser) {
    perBrowserInfo[browser.id] = {
      currentTest: undefined,
      logs: []
    };
    failures = [];
  };

  this.onSpecComplete = function(browser, specResult) {
    if (specResult.success === false) {
      failures.push({
        browser: browser,
        specResult: specResult,
        logs: perBrowserInfo[browser.id].logs
      });
    }
    perBrowserInfo[browser.id] = {
      currentTest: undefined,
      logs: []
    };
    perBrowserInfo[browser.id].logs = [];
  };

  emitter.on('browser_info', function(browser, info) {
    if (info.current_spec) {
      perBrowserInfo[browser.id] = {
        currentTest: info.current_spec,
        logs: []
      };
    }
  });

  this.onBrowserError = function(browser, error) {
    var browserInfo = perBrowserInfo[browser.id];

    if (browserInfo === undefined) {
      return;
    }

    var currentTest = browserInfo.currentTest;

    if (currentTest === undefined) {
      return;
    }

    this.writeCommonMsg(
      '\n' + browser.name + ' Had error during execution of test: ' + formatTest(currentTest) + '\n'
    );

    this.writeCommonMsg('Captured the following logs \n');

    var output = browserInfo.logs
      .map(function(log) {
        this.writeCommonMsg(formatLog(log.type, log.log));
      })
      .join('\n');

    this.writeCommonMsg('\n' + travisFold.wrap('output', output) + '\n');
  };

  this.onRunComplete = function() {
    perBrowserInfo = {};
    var output = [];
    failures.forEach(function(failure) {
      travisFold.pushStart(output, 'browser');
      output.push('Logs for ' + failure.browser.name + ' ' + failure.specResult.fullName);
      failure.logs.forEach(function(log) {
        output.push(formatLog(log.type, log.log));
      });
      travisFold.pushEnd(output, 'browser');
    });
    this.writeCommonMsg('\n' + output.join('\n') + '\n');
    failures = [];
  };

  this.onBrowserLog = function(browser, log, type) {
    if (!perBrowserInfo[browser.id]) {
      return;
    }
    perBrowserInfo[browser.id].logs.push({ type: type, log: log });
    if (perBrowserInfo[browser.id].logs.length > 1000) {
      perBrowserInfo[browser.id].logs.shift();
    }
  };
};

SpecReporter.$inject = ['baseReporterDecorator', 'config', 'emitter'];

module.exports = {
  'reporter:summary': ['type', SpecReporter]
};
