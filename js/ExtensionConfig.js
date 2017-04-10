/* global chrome start debug_log */
/* exported getDelugeEndpoint */

// All options are stored in an object
var ExtensionConfig = {
  address_protocol           : 'http',
  address_ip                 : '',
  address_port               : '',
  address_base               : '',
  password                   : '',
  handle_magnets             : false,
  handle_torrents            : false,
  context_menu               : false,
  badge_timeout              : 250,
  debug_mode                 : false,
  sort_column                : 'position',
  sort_invert                : false,
  filter_state               : 'All',
  filter_state_invert        : false,
  filter_tracker_host        : 'All',
  filter_tracker_host_invert : false,
  filter_label               : 'All',
  filter_label_invert        : false,
  get_deluge_endpoint        : function () {
    return ExtensionConfig.address_protocol + '://' + ExtensionConfig.address_ip + ':' + (ExtensionConfig.address_port !== '' ? ExtensionConfig.address_port : '8112') + '/' + (ExtensionConfig.address_base !== '' ? ExtensionConfig.address_base + '/' : '');
  },
};

// Listen for changes
chrome.storage.onChanged.addListener(function (changes) {
  for (let key in changes) {
    if ({}.hasOwnProperty.call(changes, key)) {
      ExtensionConfig[key] = changes[key].newValue;
      if (key === 'context_menu') {
        chrome.runtime.sendMessage({method: 'context_menu', enabled: ExtensionConfig.context_menu});
      }
    }
  }
});

// Load the options
chrome.storage.sync.get(function (items) {
  // ExtensionConfig = items;
  for (let key in items) {
    if ({}.hasOwnProperty.call(items, key)) {
      ExtensionConfig[key] = items[key];
    }
  }
  debug_log(ExtensionConfig);
  if (chrome.extension.getBackgroundPage && chrome.extension.getBackgroundPage() === window) {  // If running in background page
    start();  // Start the extension - function is located in background.js
  }
});
