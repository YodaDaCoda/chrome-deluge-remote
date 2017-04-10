/* exported Torrents */
/* global Deluge debug_log Torrent ExtensionConfig */

/*
 * Module responsible for fetching, storing and sorting torrent objects.
 */
class Torrents {
  constructor() {
    this._deluge = new Deluge(ExtensionConfig.get_deluge_endpoint());
    this._pub = {};
    // Stores all torrent data, using array so it can be sorted.
    this._torrents = [];
    this._globalInformation = {};

    // setup binds until it's handled in js natively
    this.sort = this.sort.bind(this);
    this.getById = this.getById.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.update = this.update.bind(this);
  }

  get all() {
    return this._torrents;
  }

  get globalInformation() {
    return this._globalInformation;
  }

  // Sorts the torrents.
  // Can sort by name, size, progress, speed, eta, position
  sort(by, invert) {
    debug_log('Entering...');
    debug_log(by);
    debug_log(invert);
    this._torrents.sortByParameter(by, invert);
    return this;
  }

  getById(val) {
    for (let i = 0; i < this._torrents.length; i += 1) {
      if (this._torrents[i].id === val) {
        return this._torrents[i];
      }
    }
    return false;
  }

  cleanup() {
    this._torrents = [];
  }

  update() {
    var that = this;
    var api = this._deluge.api('web.update_ui', [[
      'queue',
      'name',
      'total_size',
      'state',
      'progress',
      'download_payload_rate',
      'upload_payload_rate',
      'eta',
      'ratio',
      'is_auto_managed',
      'num_seeds',
      'total_seeds',
      'num_peers',
      'total_peers',
      'seeds_peers_ratio',
      'is_finished',
      'is_seed',
      'active_time',
      'seeding_time',
      'time_added',
      'tracker_host',
      'tracker_status',
      'label',
    ],
    {},
    ], {
      timeout: 2000,
    })
    .success(function (response) {
      // Reset torrents array.
      that.cleanup();
      for (let id in response.torrents) {
        if ({}.hasOwnProperty.call(response.torrents, id)) {
          that._torrents.push(new Torrent(id, response.torrents[id]));
        }
      }

      for (let id in response.filters.state) {
        if ({}.hasOwnProperty.call(response.filters.state, id)) {
          let tmp = response.filters.state[id];
          that._globalInformation[tmp[0].toLowerCase()] = tmp[1];
        }
      }

      for (let id in response.filters) {
        if ({}.hasOwnProperty.call(response.filters, id)) {
          jQuery('#filter_' + id).empty();
          for (let i = 0; i < response.filters[id].length; i++) {

            let text = response.filters[id][i][0];
            text = (text === '' ? '<blank>' : text);
            text += ' (' + response.filters[id][i][1] + ')';

            jQuery('#filter_' + id).append(jQuery('<option>', {
              value : response.filters[id][i][0],
              text  : text,
            }));

          }

          jQuery('#filter_' + id).val(localStorage['filter_' + id] || 'All');
        }
      }

      debug_log(that._torrents);
    });

    return api;
  }

  api(method, torrent, rmdata) {
    var actions;

    if (method === 'core.set_torrent_auto_managed') {  // auto-managed toggle has different call format
      actions = [torrent.id, !torrent.data.is_auto_managed];
    } else if (method === 'core.remove_torrent') {    // remove torrent - if rmdata is true, data is removed as well
      actions = [torrent.id, rmdata];
    } else {
      actions = [[torrent.id]];
    }

    return this._deluge.api(method, actions);
  }

}

// Prototype function to be able to sort an array of objects by a particular parameter
// http://stackoverflow.com/questions/19487815/passing-additional-parameters-in-the-comparefunction-of-sort-method
Array.prototype.sortByParameter = function (sortParameter, invert) {
  function compare(a, b) {
    var left = a.data[sortParameter];
    var right = b.data[sortParameter];

    var seed_queue_pos = (invert ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);

    if (sortParameter === 'queue') {
      // Always keep seeding (those with queue == -1) torrents below incomplete (those with queue >= 0)
      left = (a.data[sortParameter] === -1) ? seed_queue_pos : left;
      right = (b.data[sortParameter] === -1) ? seed_queue_pos : right;
    }

    if (typeof left === 'string') {
      return left.localeCompare(right, {
        sensitivity : 'base',
        numeric     : true,
      });
    }

    return left - right;
  }
  this.sort(compare);
  if (invert) {
    this.reverse();
  }
  return this;
};
