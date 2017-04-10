/* exported debug_log */
/* global ExtensionConfig */
/* eslint-disable no-console */

function debug_log(message) {
  var caller_line;
  if (ExtensionConfig.debug_mode) {
    // caller_line = (new Error()).stack.split('\n')[2].split('/').reverse()[0].split(')')[0].split(':');
    caller_line = (new Error()).stack.split('\n')[2].match(/at (?:(.*?) )?.*\/(.*?):(.*?):(.*)\)?/);
    console.log(`[DelugeRemote] File: [${caller_line[2]}:${caller_line[3]}:${caller_line[1]}] Message: ` + (typeof message === 'string' ? '[' + message + ']' : ''));
    if (typeof message !== 'string') {
      console.log(message);
    }
  }
}
