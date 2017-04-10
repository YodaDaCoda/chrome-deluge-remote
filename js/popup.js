/* eslint-env es6 */
/* global chrome Torrents Timer debug_log ExtensionConfig */

/*
 * Responsible for all display, page or functional control on the status page.
 *
 * - Setting refresh timers.
 * - Rendering HTML for table.
 * - Logic for action buttons.
 */
jQuery(function ($) {
  // Get extension background page for use within the code.
  var backgroundPage = chrome.extension.getBackgroundPage().getBackground();
  // Store the extension activation state.
  var extensionActivated = false;
  // var checked = [];
  // Set the initial height for the overlay.
  var $overlay = $('#overlay'); // .css({'height': $(document).height()});

  var torrents = new Torrents();

  // Setup timer information.
  var REFRESH_INTERVAL = 30000;
  var refreshTimer = new Timer(REFRESH_INTERVAL);

  function translate() {
    debug_log('translating');
    $('[data-i18n]').each(function () {
      var $this = $(this);
      debug_log('translating: ' + $this.data('i18n') + ': ' + chrome.i18n.getMessage($this.data('i18n')));
      $this.text(chrome.i18n.getMessage($this.data('i18n')));
    });
  }

  function load_config() {
    debug_log('Loading settings');
    debug_log(ExtensionConfig);

    $('.filter_option_input').each(function () {
      var $this = $(this);
      debug_log($this.prop('id') + ': ' + ExtensionConfig[$this.prop('id')]);
      $this.val(ExtensionConfig[$this.prop('id')] || 'All');
    });
    $('#sort_column').val(ExtensionConfig.sort_column || 'position');

    $('.filter_option_invert').each(function () {
      var $this = $(this);
      $this.prop('checked', ExtensionConfig[$this.prop('id')] || false);
    });
  }

  function renderTable() {

    var torrents_temp;

    var $torrent_row;

    var $filters = $('.filter_option');

    var torrent_row_properties_map = [
      {
        name   : '.table_cell_position',
        result : function (t, e) {
          e.text(t.position);
        },
      },
      {
        name   : '.table_cell_name',
        result : function (t, e) {
          e.text(t.data.name);
        },
      },
      {
        name   : '.table_cell_size',
        result : function (t, e) {
          e.text(
            (t.progress !== 100 ? t.human_downloaded_size + ' of ' : '') + t.human_size
          );
        },
      },
      {
        name   : '.table_cell_eta',
        result : function (t, e) {
          e.text(
            'ETA: ' + t.eta
          );
        },
      },
      {
        name   : '.table_cell_ratio',
        result : function (t, e) {
          e.text(
            'Ratio: ' + t.ratio
          );
        },
      },
      {
        name   : '.table_cell_peers',
        result : function (t, e) {
          e.text(
            'Peers: ' + t.data.num_peers + '/' + t.data.total_peers
          );
        },
      },
      {
        name   : '.table_cell_seeds',
        result : function (t, e) {
          e.text(
            'Seeds: ' + t.data.num_seeds + '/' + t.data.total_seeds
          );
        },
      },
      {
        name   : '.table_cell_speed',
        result : function (t, e) {
          e.text(
            t.speeds
          );
        },
      },
      {
        name   : '.progress_bar_inner',
        result : function (t, e) {
          e
          .addClass(t.data.state)
          .addClass((t.data.is_finished ? 'finished' : ''))
          .css('width', t.percent);
        },
      },
      {
        name   : '.progress_bar_text',
        result : function (t, e) {
          e.text(
            t.percent + ' - ' + t.data.state
          );
        },
      },
      {
        name   : '.table_cell_actions .toggle_managed',
        result : function (t, e) {
          e.addClass(t.data.is_auto_managed ? 'managed' : 'unmanaged');
        },
      },
    ];

    load_config();

    // Set the href for the title, because otherwise the options doesn't exist early enough
    $('#deluge_webui_link').attr('href', ExtensionConfig.get_deluge_endpoint());

    // clear the table
    $('#torrent_container').empty();

    // sort the torrents
    torrents_temp = torrents.sort(ExtensionConfig.sort_column, ExtensionConfig.sort_invert).all;

    debug_log(`${torrents_temp.length} torrents received`);
    debug_log(torrents_temp);

    if (torrents_temp.length === 0) {
      $('#torrent_container').append(
        document.getElementById('no_torrents_queue').content.cloneNode(true)
      );
      translate();

    }

    // Filter the torrents
    debug_log('Filtering...');
    debug_log($filters);
    for (let i = 0; i < $filters.length; i++) {
      torrents_temp = torrents_temp.filter(function (element) {
        var $filter = $filters.eq(i);
        var filter_invert = $filter.find('.filter_option_invert').prop('checked');
        var $filter_option = $filter.find('.filter_option_input');
        var filter_option_name = $filter_option.data('filter-option-name');
        // var filter_option_val = $filter_option.val();

        var filter_option_value = ExtensionConfig[$filter_option.prop('id')];

        var test_result;

        if (filter_option_value === 'All') {
          return true; // don't invert the 'All' option, because the opposite of everything is nothing, and that's useless
        }

        debug_log(`Filtering based on ${filter_option_name}: ${filter_option_value}`);

        if (filter_option_name === 'state' && filter_option_value === 'Active') {
          test_result = (element.speedDownload > 0 || element.speedUpload > 0);
        } else {
          test_result = element.data[filter_option_name] === filter_option_value;
        }

        return test_result !== filter_invert;
      });
    }

    debug_log(`Filtered torrents. ${torrents_temp.length} remain.`);
    debug_log(torrents_temp);

    if (torrents_temp.length === 0) {
      $('#torrent_container').append(
        document.getElementById('no_torrents_filter').content.cloneNode(true)
      );
      translate();

    }

    for (let i = 0; i < torrents_temp.length; i++) {

      $torrent_row = $(document.getElementById('torrent_row').content.cloneNode(true));

      $torrent_row
      .find('.torrent_row')
        .data('id', torrents_temp[i].id)
        .addClass(torrents_temp[i].data.state);

      for (let j = 0; j < torrent_row_properties_map.length; j++) {
        torrent_row_properties_map[j].result(torrents_temp[i], $torrent_row.find(torrent_row_properties_map[j].name));
      }

      $('#torrent_container').append(
        $torrent_row
      );

    }

  }

  function renderGlobalInformation() {
    var information = torrents.globalInformation;
    var $globalInformation = $('#global-information');

    debug_log(torrents);
    debug_log(information);

    $globalInformation.find('.all').text(information.all);
    $globalInformation.find('.paused').text(information.paused);
    $globalInformation.find('.seeding').text(information.seeding);
    $globalInformation.find('.queued').text(information.queued);
  }

  /*
   * Check the status of the extension and do the handling for the popup.
   *
   * This function only displays error messages, it's the job of the
   * background page to inform us the error has been resolved so we can update
   * the table.
   */
  function checkStatus() {
    backgroundPage
    .checkStatus({timeout: 10000})
    .success(function (response) {
      debug_log('status check: success');
      debug_log('response: ');
      debug_log(response);
      if (response === true) {
        // load torrents?
      }
      if (response === false) {
        // Most likely still waiting on daemon to start.
        $overlay.find('span').addClass('error').html(
          chrome.i18n.getMessage('error_daemon_not_running')
        );
        $overlay.show();
      }
    })
    .error(function (jqXHR, text, err) {
      /*
       * Ignore any unauthenticated errors here - they are normally
       * resolved by an auto login in the background stuff and is normally
       * sorted before this message can be fully displayed.
       *
       * We will instead receive errors from the global event for auto
       * login failure to display the message to the user - see
       * autoLoginFailed and Chrome extension addListner.
       */
      if (err.code !== 1) { // API_AUTH_CODE = 1
        $overlay.find('span').addClass('error').html(
          chrome.i18n.getMessage('error_generic')
        );
        $overlay.show();
      }
    });
  }

  function updateTable() {
    // Clear out any existing timers.
    refreshTimer.unsubscribe();
    torrents.update()
    .success(function () {
      renderTable();
      renderGlobalInformation();
      refreshTimer.subscribe(updateTable);
    })
    .error(function () {
      // Problem fetching information, perform a status check.
      // Note: Not setting a timeout, should happen once updateTable
      // gets called when extension check is OK.
      checkStatus();
    });
  }
  function updateTableDelay(ms) {
    setTimeout(updateTable, ms);
  }


  /**
   * Pause the table refresh.
   */
  function pauseTableRefresh() {
    refreshTimer.unsubscribe();
  }

   /**
  * Resume the table refresh.
  */
  function resumeTableRefresh() {
    refreshTimer.unsubscribe();
    refreshTimer.subscribe(updateTable);
  }

  function getRowData(element) {
    var $parent = $(element).parents('.torrent_row');
    var torrentId = $parent.data('id');
    var torrent = torrents.getById(torrentId);
    return {torrentId: torrentId, torrent: torrent};
  }

  // var $mainActions = $('.main_actions');

  function DelugeMethod(method, torrent, rmdata) {

    var methodsMessages = {
      'core.resume_torrent'           : {success: 'Deluge: Resumed torrent',           failure: 'Deluge: Failed to resume torrent.'},
      'core.pause_torrent'            : {success: 'Deluge: Paused torrent',            failure: 'Deluge: Failed to pause torrent.'},
      'core.queue_up'                 : {success: 'Deluge: Moved torrent up queue',    failure: 'Deluge: Failed to move torrent up queue.'},
      'core.queue_down'               : {success: 'Deluge: Moved torrent down queue',  failure: 'Deluge: Failed to move torrent down queue.'},
      'core.set_torrent_auto_managed' : {success: 'Deluge: Toggled auto-managed.',     failure: 'Deluge: Failed to toggle auto-managed.'},
      'core.remove_torrent'           : {success: 'Deluge: Deleted torrent.',          failure: 'Deluge: Failed to delete torrent.'},
      'core.force_recheck'            : {success: 'Deluge: Force rechecking torrent.', failure: 'Deluge: Failed to force recheck torrent.'},
    };

    pauseTableRefresh();

    torrents.api(method, torrent, rmdata)
    .success(function () {
      debug_log(methodsMessages[method].success);
      updateTableDelay(250);
    })
    .error(function () {
      debug_log(methodsMessages[method].failure);
    });
  }

  $('#torrent_container').on('click', '.main_actions .delete', function () {
    var $this = $(this);
    var $row = $this.closest('.torrent_row');

    pauseTableRefresh();

    $row.find('.main_actions').toggleClass('hidden');
    $row.find('.delete_actions').toggleClass('hidden');
  });

  // For some reason the link has focus when the status is shown, however
  // we can't blur straight away, wait 50ms then do it.
  setTimeout(function () { $('#add-torrent').blur(); }, '50');

  $('#add-torrent-dialog .close').click(function (e) {
    e.preventDefault();
    $('#add-torrent-dialog').hide();
  });

  $('#manual_add_input')
  .keydown(function (event) {
    if (event.keyCode === '13') {
      event.preventDefault();
      $('#manual_add_button').click();
    }
  });

  // This function is called when the background page sends an activated
  // message, this happens roughly every minute so we only want to call
  // updateTable, or hide any current overlays once. We can let the local
  // timers within this script handle table updating.
  function activated() {
    if (!extensionActivated) {
      debug_log('Deluge: ACTIVATED');
      extensionActivated = true;
      $overlay.hide();
      updateTable();
    }
  }

  function deactivated() {
    extensionActivated = false;
  }

  function autoLoginFailed() {
    var message = chrome.i18n.getMessage('error_unauthenticated');
    $('span', $overlay).addClass('error').html(message);
    $overlay.show();
  }

  // Setup listeners for closing message overlays coming from background.
  chrome.runtime.onMessage.addListener(
    function (request/* , sender, sendResponse */) {
      debug_log(request);
      debug_log(request.method);
      switch (request.method) {
        case 'extension_activated':
          activated();
          break;
        case 'extension_deactivated':
          deactivated();
          break;
        case 'auto_login_failed':
          autoLoginFailed();
          break;
        default:
          break;
      }
      // sendResponse({});
    }
  );

  $(document.body)
  .tooltip()
  .on('click', '.twistie', function () {
    $(this).toggleClass('twistie_down');
  })
  .on('change', '.filter_option_input,.filter_option_invert', function () {
    var $this = $(this);
    ExtensionConfig[$this.prop('id')] = ($this.is('[type="checkbox"],[type="radio"]') ? $this.prop('checked') : $this.val());
    debug_log('filter/sort change: ' + $this.prop('id'));
    chrome.storage.sync.set(ExtensionConfig);
    renderTable();
  })
  .on('click', '#add-torrent', function (e) {
    /* show add torrent dialog */
    e.preventDefault();
    $('#add-torrent-dialog').show();
  })
  .on('click', '#add-torrent-dialog', function () {
    /* Closed if clicked outer */
    $(this).hide();
  })
  .on('click', '#add-torrent-dialog .inner', function (e) {
    /* Don't close if clicked within .inner */
    e.stopPropagation();
  })
  .on('click', '.delete_actions a', function () {
    var torrent = getRowData(this).torrent;

    var $this = $(this);
    var $row = $this.closest('.torrent_row');

    pauseTableRefresh();

    $row.find('.main_actions').toggleClass('hidden');
    $row.find('.delete_actions').toggleClass('hidden');

    if ($this.hasClass('rm_torrent')) {
      DelugeMethod('core.remove_torrent', torrent, $this.hasClass('rm_torrent_data'));
      updateTable();
      return true;
    }

    resumeTableRefresh();

    return false;

  })
  .on('click', '#manual_add_button', function (e) {
    var url = $('#manual_add_input').val();

    e.preventDefault();

    // Now check that the link contains either .torrent or download, get, etc...
    if (url.search(/\/(download|get)\//) > 0 || url.search(/\.torrent$/) > 0) {
      chrome.runtime.sendMessage({method: 'add_torrent_from_url', url: url},
        function (response) {
          if (response.msg === 'success') {
            $('#manual_add_input').val('');
          }
        });
    } else if (url.search(/magnet:/) !== -1) {
      chrome.runtime.sendMessage({method: 'add_torrent_from_magnet', url: url},
        function (response) {
          debug_log(response);
          if (response.msg === 'success') {
            $('#manual_add_input').val('');
          }
        });
    }

    $('#add-torrent-dialog').hide();
  })
  .on('click', '.main_actions .action_button', function () {
    var $this = $(this);
    var rowData = getRowData(this);
    var method = $this.data('deluge-method');
    var rmdata = $this.hasClass('rm_torrent_data');

    if ($this.hasClass('delete')) {
      return;
    }

    DelugeMethod(method, rowData.torrent, rmdata);
  });


  // Internationalisation
  translate();

  // Do initial check.
  checkStatus();

});
