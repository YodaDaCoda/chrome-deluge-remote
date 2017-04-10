/* global chrome debug_log $ */

function saveOptions() {
  chrome.storage.sync.set({
    address_protocol  : $('#address_protocol').val(),
    address_ip        : $('#address_ip').val(),
    address_port      : $('#address_port').val(),
    address_base      : $('#address_base').val(),
    password          : $('#password').val(),
    handle_torrents   : $('#handle_torrents').is(':checked'),
    handle_magnets    : $('#handle_magnets').is(':checked'),
    context_menu      : $('#context_menu').is(':checked'),
    badge_timeout     : parseInt($('#badge_timeout').val(), 10),
    debug_mode        : $('#debug_mode').is(':checked'),
    version           : chrome.runtime.getManifest().version,
  },
    function () {
      debug_log('Settings saved');
    }
  );
}

$(function () {
  $('.buttons .save').on('click', function () {
    saveOptions();
  });
  $('.buttons .apply').on('click', function () {
    saveOptions();
    window.close();
  });
  $('.buttons .cancel').on('click', function () {
    window.close();
  });
  $('#version').text(chrome.runtime.getManifest().version);
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  var messages = [];
  var storage_change;
  var handle_torrents;
  var handle_magnets;
  var debug_mode;
  var context_menu;
  var message_text = '';

  for (let key in changes) {
    if ({}.hasOwnProperty.call(changes, key)) {
      storage_change = changes[key];
      debug_log('Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".',
        key,
        namespace,
        storage_change.oldValue,
        storage_change.newValue
      );
      switch (key) {
        case 'address_protocol':
          messages.push('Address protocol updated.');
          break;
        case 'address_ip':
          messages.push('Address IP updated.');
          break;
        case 'address_port':
          messages.push('Address port updated.');
          break;
        case 'address_base':
          messages.push('Address base updated.');
          break;
        case 'password':
          messages.push('Password updated.');
          break;
        case 'handle_torrents':
          handle_torrents = $('#handle_torrents').is(':checked');
          messages.push('Torrent link handling ' + ((handle_torrents) ? 'en' : 'dis') + 'abled!');
          break;
        case 'handle_magnets':
          handle_magnets = $('#handle_magnets').is(':checked');
          messages.push('Magnet link handling ' + ((handle_magnets) ? 'en' : 'dis') + 'abled!');
          break;
        case 'context_menu':
          context_menu = $('#context_menu').is(':checked');
          messages.push('Context Menu ' + ((context_menu) ? 'en' : 'dis') + 'abled!');
          break;
        case 'badge_timeout':
          messages.push('Badge timeout set to ' + $('#badge_timeout option:selected').text());
          break;
        case 'debug_mode':
          debug_mode = $('#debug_mode').is(':checked');
          messages.push('Debug mode ' + ((debug_mode) ? 'en' : 'dis') + 'abled!');
          break;
        default:
          break;
      }
    }
  }
  if (messages.length > 0) {
    $.each(messages, function (index, obj) {
      message_text += obj + '<br>';
    });
    message_text += '<br>';
    $('#status-message').finish();
    $('#status-message').html(message_text).fadeIn().delay(5000).fadeOut();
  }
});

chrome.storage.sync.get(function (items) {
  for (let i in items) {
    if ({}.hasOwnProperty.call(items, i)) {
      debug_log(i + '\t' + items[i] + '\t' + (typeof items[i]));
      $('#' + i).val(items[i]);
      if (typeof items[i] === 'boolean') {
        $('#' + i).prop('checked', items[i]);
      }
    }
  }
  // If this is a new version with incompatible settings, save the settings based on what's now loaded (which should easily set defaults)
  if (window.location.search === '?newver=true') {
    debug_log('New version. Saving settings.');
    saveOptions();
  }
});
