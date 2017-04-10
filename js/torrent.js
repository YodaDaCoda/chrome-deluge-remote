/* exported Torrent */

class Torrent {
  constructor(id, data) {
    this.id = id;
    this.data = data;
  }

  calc_size(size) {
    var bytes = size / 1024.0;
    if (bytes < 1024) {
      return bytes.toFixed(1) + ' KiB';
    }

    bytes /= 1024;
    if (bytes < 1024) {
      return bytes.toFixed(1) + ' MiB';
    }

    return (bytes / 1024).toFixed(1) + ' GiB';
  }

  get human_size() {
    return this.calc_size(this.data.total_size);
  }

  get human_downloaded_size() {
    return this.calc_size(this.data.total_size * this.data.progress / 100);
  }

  get ratio() {
    return this.data.ratio.toFixed(2);
  }

  get position() {
    if (this.data.queue >= 0) {  // seeding items have no position
      return this.data.queue + 1; // position is zero-indexed. Make it 1-indexed.
    }
    return '';
  }

  get percent() {
    return (Math.round(this.data.progress * Math.pow(10, 2)) / Math.pow(10, 2)) + '%';
  }

  get download() {
    return this.calc_size(this.data.download_payload_rate) + '/s';
  }

  get upload() {
    return this.calc_size(this.data.upload_payload_rate) + '/s';
  }

  get speeds() {
    return '↓' + this.download + ' - ↑' + this.upload;
  }

  get eta() {
    var secs = 0;
    var mins = 0;
    var hours = 0;
    var days = 0;
    var time = this.data.eta;

    if (time === 0) {
      return '∞';
    }

    time = time.toFixed(0);
    if (time < 60) {
      return time + 's';
    }

    time /= 60;
    if (time < 60) {
      mins = Math.floor(time);
      secs = Math.round(60 * (time - mins));

      if (secs > 0) {
        return mins + 'm' + ' ' + secs + 's';
      }
      return mins + 'm';
    }

    time /= 60;
    if (time < 24) {
      hours = Math.floor(time);
      mins = Math.round(60 * (time - hours));

      if (mins > 0) {
        return hours + 'h' + ' ' + mins + 'm';
      }
      return hours + 'h';
    }

    time /= 24;
    days = Math.floor(time);
    hours = Math.round(24 * (time - days));
    if (hours > 0) {
      return days + 'd' + ' ' + hours + 'h';
    }
    return days + 'd';
  }

}
