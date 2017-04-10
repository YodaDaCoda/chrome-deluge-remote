/* global chrome Deluge debug_log ExtensionConfig */
/* exported getBackground */

var background;

class Background {
  // Store all public methods and attributes.

  constructor() {
    this._self = this;
    this._statusTimer = null;
    this._contextMenu = null;
    this._deluge = new Deluge(ExtensionConfig.get_deluge_endpoint());

    /**
    * Intervals used for status checking.
    * If an error occurs when checking the status then increase how often
    * things are checked.
    */
    this._STATUS_CHECK_ERROR_INTERVAL = 120000;
    this._STATUS_CHECK_INTERVAL = 60000;

    // This line is not necessary, but it prevents an error in the background page later on.
    // If the extension loads and tries to add a context menu while the context menu already exists from previous load, an error occurs.
    // This is not a problem either way, but it's nice to keep the console clear.
    this._removeContextMenu();

    // Show/hide the context menu as appropriate.
    this.toggleContextMenu(ExtensionConfig.context_menu);

  }

  /** Start the daemon for a given host id. */
  // _startDaemon(hostId) {
  //   // Attempt start the Daemon if not already.
  //   var deferred = new Promise(function (d) {
  //     // Find the current status of the daemon.
  //     self._deluge.api('web.get_host_status', [hostId])
  //       .success(function (response) {
  //         if (response && response[3] === 'Offline') {
  //           self._deluge.api('web.start_daemon', [response[2]])
  //             .success(function () {
  //               debug_log('Daemon started');
  //               // Give the Daemon a few seconds to start.
  //               setTimeout(function () { d.resolve(); }, 2000);
  //             });
  //         } else {
  //           d.resolve();
  //         }
  //       })
  //       .error(function () {
  //         debug_log('Deluge: Error getting host status');
  //         d.reject();
  //       });
  //   });
  //
  //   return deferred.promise();
  // }

  /** Called when auto login failed - normally incorrect login details. */
  _autoLoginFailed() {
    // Inform anyone who's listening.
    chrome.runtime.sendMessage({method: 'auto_login_failed'});
  }

  /**
  * Perform a login to the Deluge webUI.
  * @returns {promise} - API promise
  */
  _login() {
    return this._deluge.api('auth.login', [ExtensionConfig.password]);
  }

  _connect() {
    // Find a list of hosts; if we only have one option connect to it,
    // otherwise do nothing, as we can't handle these at the moment.
    var deferred = jQuery.Deferred(function (d) {
      self._deluge.api('web.get_hosts')
      .success(function (response) {
        var hostId;
        // Only one host found.
        if (response.length === 1) {
          hostId = response[0][0];
          // Check the daemon is running and then try connecting.
          background._startDaemon(hostId).done(function () {
            background._deluge.api('web.connect', [hostId])
            .success(function () { d.resolve(); })
            .error(function () { d.reject(); });
          });
        } else {
          d.reject({error: 'More than one host'});
        }
      });
    });

    return deferred;
  }

  /**
  * Set the badge text.
  * @param {String} text - Text to set (should be only one or two characters)
  * @param {String} colour - Background colour to set as css string
  */
  badgeText(text, colour) {
    debug_log('badgeText: ' + text + ', ' + colour);
    chrome.browserAction.setBadgeText({text: text});
    chrome.browserAction.setBadgeBackgroundColor({color: colour});
    setTimeout(function (){
      chrome.browserAction.setBadgeText({text: ''});
    }, ExtensionConfig.badge_timeout);
  }

  /**
  * Talk to Deluge to find out if the WebUI is running and that we have access.
  * @param {object} params - Dict of params to pass to Deluge
  * @returns {Promise} can attach additional success/error callbacks.
  */
  checkStatus(params) {
    var api;

    debug_log('Checking status');

    // Clear any existing timers.
    clearTimeout(background._statusTimer);

    api = background._deluge.api('web.connected', [], params)
    .success(function (response) {
      // Connected: activate the extension.
      if (response === true) {
        background._activate();
        background.statusTimer = setTimeout(background.checkStatus, background.STATUS_CHECK_INTERVAL);
      } else {
        // Authenticated but not connected - attempt to connect to
        // daemon.
        background._connect().done(function () {
          background._activate();
          // Create timer.
          background._statusTimer = setTimeout(background.checkStatus, background.STATUS_CHECK_INTERVAL);
        });
      }
    })
    .error(function (jqXHR, text, err) {
      if (text === background._deluge.API_ERROR) {
        // If unauthenticated then attempt login.
        if (err.code === background._deluge.API_AUTH_CODE) {
          // Login and then check status again!
          background._login()
          .success(function (res) {
            // If successful check status again now.
            if (res === true) {
              background.checkStatus();
            } else {
              // Wrong login - not much we can do, try
              // checking in a bit.
              debug_log('Deluge: Incorrect login details.');
              background._statusTimer = setTimeout(background.checkStatus, background._STATUS_CHECK_ERROR_INTERVAL);
              background._deactivate();
              background._autoLoginFailed();
            }
          })
          .error(function (j, t, e) {
            debug_log(`Deluge: Error logging in [${e}]`);
            background._deactivate();
          });
        } else {
          debug_log('Deluge: API error occured');
          // Unknown API error, deactivate the extension.
          background._deactivate();
        }
        // Setup interval for a repeat check.
        background._statusTimer = setTimeout(background.checkStatus, background._STATUS_CHECK_INTERVAL);
      } else {
        // Unknown error (resulting from 500/400 status codes
        // normally); best thing to do is check again, but with a
        // longer interval.
        if (jqXHR.status === 0 && text === 'error') {
          debug_log('Error: Internet disconnected');
        } else {
          debug_log('Unknown error occured');
        }
        // debug_log(jqXHR.statusCode()); debug_log(text); debug_log(err);
        background._statusTimer = setTimeout(background.checkStatus, background.STATUS_CHECK_ERROR_INTERVAL);
        background._deactivate();
      }
    });

    return api;
  }

  /**
  * Enable the extension (set correct status messages and enable icons).
  * This is normally called after doing a status check which returned successfully.
  */
  _activate() {
    debug_log('Deluge: Extension activated');
    chrome.browserAction.setIcon({path: 'images/icons/deluge_active.png'});
    chrome.browserAction.setTitle({
      title: chrome.i18n.getMessage('browser_title'),
    });
    // Send activation to anything listening.
    chrome.runtime.sendMessage({method: 'extension_activated'});
  }

  /**
  * Disables the extension (status messages, disabling icons, etc..).
  * This is normally called after doing a status check, which returned false.
  */
  _deactivate() {
    debug_log('Extension deactivated');
    chrome.browserAction.setIcon({path: 'images/icons/deluge.png'});
    chrome.browserAction.setTitle({
      title: chrome.i18n.getMessage('browser_title_disabled'),
    });
    // Send deactivation to anything listening.
    chrome.runtime.sendMessage({method: 'extension_deactivated'});
  }

  /**
  * Add a torrent to Deluge using a URL.
  * This method is meant to be called as part of Chrome extensions messaging system.
  * @see chrome.runtime.sendMessage && chrome.runtime.onMessage
  */
  addTorrentFromUrl(request, sender /* , sendResponse */) {
    /**
     * Fetches the configuration values needed to add the torrent before
     * adding the torrent to Deluge.
     * @param {String} tmpTorrent The temp path to the downloaded torrent file (used by deluge to find the torrent).
     */
    function addTorrent(tmpTorrent) {
      /**
       * Add the torrent file into Deluge with the correct options.
       * @param {Object} options The options for the torrent (download_path, max_connections, etc...).
       */
      function addToDeluge(options) {
        background._deluge.api('web.add_torrents', [[{path: tmpTorrent, options: options}]])
          .success(function (obj) {
            if (obj) {
              debug_log('Deluge: added torrent to deluge.');
              background._badgeText('Add', '#00FF00');
              chrome.tabs.sendMessage(sender.tab.id, {method: 'Deluge: Success adding torrent!'});
              return;
            }
            background._badgeText('Fail', '#FF0000');
            debug_log('Deluge: failed to add torrent to deluge (null object retrieved).');
            chrome.tabs.sendMessage(sender.tab.id, {method: 'Deluge: Unable to add torrent to deluge'});
          })
          .error(function (r, s, e) {
            debug_log(`deluge: unable to add torrent to deluge [${e}].`);
            background._badgeText('Fail', '#FF0000');
            chrome.tabs.sendMessage(sender.tab.id, {method: 'Unable to add torrent to deluge'});
          });
      }

      // Need to get config values to add with the torrent first.
      background._deluge.api('core.get_config_values', [['add_paused', 'compact_allocation', 'download_location',
        'max_connections_per_torrent', 'max_download_speed_per_torrent',
        'max_upload_speed_per_torrent', 'max_upload_slots_per_torrent',
        'prioritize_first_last_pieces']])
        .success(function (obj) {
          if (obj) {
            debug_log('Deluge: got options!');
            addToDeluge(obj);
            return;
          }
          debug_log('Deluge: unable to fetch options.');
          chrome.tabs.sendMessage(sender.tab.id, {method: 'Deluge: Unable to fetch options.'});
        })
        .error(function (r, s, e) {
          debug_log(`Deluge: unable to fetch options [${e}].`);
          chrome.tabs.sendMessage(sender.tab.id, {method: 'Unable to fetch options.'});
        });
    }

    // First we need to download the torrent file to a temp location in Deluge.
    debug_log(`Sending URL to deluge. url: [${request.url}] headers: [${request.headers}]`);
    background._deluge.api('web.download_torrent_from_url', [request.url, request.headers || ''])
      .success(function (obj) {
        if (obj) {
          debug_log('Deluge: downloaded torrent.');
          addTorrent(obj);
          return;
        }
        debug_log('Deluge: failed to download torrent from URL, no obj or result.');
        chrome.tabs.sendMessage(sender.tab.id, {method: 'Deluge: failed to download torrent from URL, no obj or result.'});
        background._badgeText('Fail', '#FF0000');
      })
      .error(function (r, s, e) {
        debug_log(`Failed to send torrent URL to Deluge [${e}].`);
        chrome.tabs.sendMessage(sender.tab.id, {method: 'Failed to send URL to Deluge.'});
        background._badgeText('Fail', '#FF0000');
      });
  }

  /**
  * Add a torrent to Deluge using a magnet URL. This method is meant to be called
  * as part of Chrome extensions messaging system.
  * @see chrome.runtime.sendMessage && chrome.runtime.onMessage
  */
  _addTorrentFromMagnet(request, sender /* , sendResponse */) {
    background._deluge.api('core.add_torrent_magnet', [request.url, ''])
      .success(function (id) {
        if (id) {
          debug_log('deluge: downloaded torrent.');
          background._badgeText('Add', '#00FF00');
          chrome.tabs.sendMessage(sender.tab.id, {method: 'Deluge: Success adding torrent from magnet'});
          return;
        }
        debug_log('Deluge: failed to add torrent from magnet, no obj or result.');
        background._badgeText('Fail', '#FF0000');
        chrome.tabs.sendMessage(sender.tab.id, {method: 'Deluge: Failed to add torrent from magnet.'});
      })
      .error(function (r, s, e) {
        debug_log(`Deluge: failed to add torrent from magnet [${e}].`);
        background._badgeText('Fail', '#FF0000');
        chrome.tabs.sendMessage(sender.tab.id, {method: 'Failed to add torrent from magnet.'});
      });
  }

  _handleContextMenuClick(info/* , tab */) {
    var torrentUrl = info.linkUrl;
    debug_log('Context menu sending link to Deluge: ' + info.linkUrl);
    debug_log(info);
    if (torrentUrl.search(/magnet:/) !== -1) {
      debug_log('Link is a magnet');
      Background.addTorrentFromMagnet({url: torrentUrl}, [], function (response) {
        if (response.msg === 'success') {
          debug_log('Torrent added');
        } else {
          debug_log('Torrent could not be added');
        }
      });
    } else {// if (torrentUrl.search(/\/(download|get)\//) > 0 || torrentUrl.search(/\.torrent$/) > 0) {
      debug_log('Link is a torrent');
      this.addTorrentFromUrl({url: torrentUrl}, [], function (response) {
        if (response.msg === 'success') {
          debug_log('Deluge: Torrent added');
        } else {
          debug_log('Deluge: Torrent could not be added');
        }
      });

    } /* else {
      debug_log("Link not a torrent/magnet!");
    } */

    return false;
  }

  toggleContextMenu(enabled) {
    debug_log('Toggling context menu: ' + (enabled ? 'on' : 'off'));
    if (enabled) {
      this._addContextMenu();
    } else {
      this._removeContextMenu();
    }
  }

  _addContextMenu() {
    debug_log('Adding context menu.');
    if (this._contextMenu === null) {
      this._contextMenu = chrome.contextMenus.create({
        id       : 'context_links',
        title    : 'Send to Deluge',
        contexts : [chrome.contextMenus.ContextType.LINK],
      });
      chrome.contextMenus.onClicked.addListener(this._handleContextMenuClick);
      debug_log('Created context menu.');
    }
  }

  _removeContextMenu() {
    debug_log('Removing context menu.');
    chrome.contextMenus.removeAll();
  }

  getVersion(sendResponse) {
    this._deluge.api('daemon.info')
      .success(function (version) {
        var parsed_version = version.split('-')[0].split('.');
        debug_log('deluge: got version.');
        sendResponse({major: Number(parsed_version[0]), minor: Number(parsed_version[1]), build: Number(parsed_version[2])});
      })
      .error(function (r, s, e) {
        debug_log(`deluge: failed to get version [${e}].`);
        sendResponse(0);
      });
  }

}

function start() {
  background = new Background();
}

function getBackground() {
  return background;
}

/*
* =====================================================================
* Event bindings.
* =====================================================================
*/

// Any requests send via chrome ext messaging system.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  debug_log('Received message: ' + request.method);
  debug_log(request);
  switch (request.method) {
    case 'ExtensionConfig':
      sendResponse({
        value: ExtensionConfig[request.key],
      });
      break;
    case 'add_torrent_from_url':
      debug_log('Adding torrent from URL: ' + request);
      Background.addTorrentFromUrl(request, sender, sendResponse);
      break;
    case 'add_torrent_from_magnet':
      Background.addTorrentFromMagnet(request, sender, sendResponse);
      break;
    case 'context_menu':
      debug_log('Changing context menu to: ' + request.enabled);
      Background.ContextMenu(request.enabled);
      break;
    default:
      sendResponse({method: 'error', result: null, error: 'nothing called!'});
  }
});

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details){
  if (details.reason === 'install'){
    debug_log('This is a first install!');
    chrome.tabs.create({url: 'options.html?newver=true'});
  } else if (details.reason === 'update'){
    let thisVersion = chrome.runtime.getManifest().version;
    debug_log('Updated from ' + details.previousVersion + ' to ' + thisVersion + '!');
    if (thisVersion.split('.')[0] > details.previousVersion.split('.')[0]) {
      debug_log('Major version change!');
      chrome.tabs.create({url: 'options.html?newver=true'});
    }
  }
  start();
});
