/* global jQuery chrome ExtensionConfig debug_log */

jQuery(function ($) {

  debug_log('Creating click handler');
  $('body').on('click', 'a', function (event) {
    var url = $(this).prop('href');
    debug_log('Click handler activated.');
    debug_log('URL: ' + url);
    if (ExtensionConfig.handle_magnets) {
      debug_log('Handling magnets enabled');
      if (url.indexOf('magnet:') === 0) {
        debug_log('Detected link as magnet');
        event.stopPropagation();
        event.preventDefault();
        debug_log('Captured magnet link ' + url);
        chrome.runtime.sendMessage({
          method : 'add_torrent_from_magnet',
          url    : url,
        });
        debug_log('Link sent to Deluge.');
      }
    }
    if (ExtensionConfig.handle_torrents) {
      debug_log('Handling torrents enabled');
      if (url.search(/\.torrent$/) > 0) {
        debug_log('Detected link as a torrent');
        event.stopPropagation();
        event.preventDefault();
        debug_log('Captured .torrent link ' + url);
        chrome.runtime.sendMessage({
          method  : 'add_torrent_from_url',
          url     : url,
          headers : document.cookie,
        });
        debug_log('Link sent to Deluge.');
      }
    }
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  debug_log(request.msg);
  sendResponse({});
});
