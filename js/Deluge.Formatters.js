/*
Script:
  Deluge.Formatters.js

Copyright:
  (C) Damien Churchill 2009 <damoxc@gmail.com>
  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 3, or (at your option)
  any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, write to:
    The Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor
    Boston, MA  02110-1301, USA.

  In addition, as a special exception, the copyright holders give
  permission to link the code of portions of this program with the OpenSSL
  library.
  You must obey the GNU General Public License in all respects for all of
  the code used other than OpenSSL. If you modify file(s) with this
  exception, you may extend this exception to your version of the file(s),
  but you are not obligated to do so. If you do not wish to do so, delete
  this exception statement from your version. If you delete this exception
  statement from all source files in the program, then also delete it here.
*/

/**
 * @description A collection of functions for string formatting values.
 * @namespace Deluge.Formatters
 */

/* exported fspeed, ftime, fdate, fplain */
// Only want the formatters, so fake this.
var Deluge = {};
var fsize;
var fspeed;
var ftime;
var fdate;
var fplain;

Deluge.Formatters = {
  /**
   * Formats a date string in the locale's date representation based on the
   * systems timezone.
   *
   * @param {number} timestamp time in seconds since the Epoch
   * @returns {string} a string in the locale's date representation or ""
   * if seconds < 0
   */
  date: function (timestamp) {
    var date = new Date(timestamp * 1000);
    function zeroPad(num, count) {
      var numZeropad = String(num);
      while (numZeropad.length < count) {
        numZeropad = '0' + numZeropad;
      }
      return numZeropad;
    }

    return String.format('{0}/{1}/{2}', zeroPad(date.getDate(), 2), zeroPad(date.getMonth() + 1, 2), date.getFullYear());
  },

  /**
   * Formats the bytes value into a string with KiB, MiB or GiB units.
   *
   * @param {number} bytes the filesize in bytes
   * @returns {string} formatted string with KiB, MiB or GiB units.
   */
  size: function (bytes) {
    var b = bytes / 1024.0;

    if (b < 1024) {
      return b.toFixed(1)  + ' KiB';
    }

    b /= 1024;

    if (b < 1024) {
      return b.toFixed(1)  + ' MiB';
    }

    b /= 1024;

    return b.toFixed(1) + ' GiB';
  },

  /**
   * Formats a string to display a transfer speed utilizing {@link Deluge.Formatters.size}
   * @param {number} bits the filesize in bits
   * @returns {string} formatted string with KiB, MiB or GiB units.
   */
  speed: function (bits) {
    return fsize(bits) + '/s';
  },

  /**
   * Formats a string to show time in a human readable form.
   *
   * @param {number} time the number of seconds
   * @returns {string} a formatted time string. will return '' if seconds == 0
   */
  timeRemaining: function (time) {
    var t = time;
    var days;
    var hours;
    var minutes;
    var seconds;

    if (t === 0) {
      return '∞';
    }

    t = t.toFixed(0);

    if (t < 60) {
      return t + 's';
    }

    t /= 60;

    if (t < 60) {
      minutes = Math.floor(t);
      seconds = Math.round(60 * (t - minutes));
      if (seconds > 0) {
        return minutes + 'm ' + seconds + 's';
      }
      return minutes + 'm';
    }
    t /= 60;

    if (t < 24) {
      hours = Math.floor(t);
      minutes = Math.round(60 * (t - hours));
      if (minutes > 0) {
        return hours + 'h ' + minutes + 'm';
      }
      return hours + 'h';
    }

    t /= 24;

    days = Math.floor(t);
    hours = Math.round(24 * (t - days));
    if (hours > 0) {
      return days + 'd ' + hours + 'h';
    }
    return days + 'd';
  },

  /**
   * Simply returns the value untouched, for when no formatting is required.
   *
   * @param {string} value the value to be displayed
   * @returns {string} the untouched value.
   */
  plain: function (value) {
    return value;
  },
};
fsize = Deluge.Formatters.size;
fspeed = Deluge.Formatters.speed;
ftime = Deluge.Formatters.timeRemaining;
fdate = Deluge.Formatters.date;
fplain = Deluge.Formatters.plain;
