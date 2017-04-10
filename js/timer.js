/* exported Timer */

class Timer {

  constructor(interval) {
    this.interval = interval;

    this.handlers = [];
    this.timeOut = null;

    // setup binds until it's handled in js natively
    this.updateHandlers = this.updateHandlers.bind(this);

    this.updateHandlers();
  }

  updateHandlers() {
    for (let i = 0; i < this.handlers.length; i += 1) {
      this.handlers[i]();
    }
    this.timeOut = setTimeout(this.updateHandlers, this.interval);
  }

  subscribe(handler) {
    this.handlers.push(handler);
  }

  unsubscribe(handler) {
    this.handlers.pop(handler);
  }

  destroy() {
    if (this.timeOut) {
      clearTimeout(this.timeOut);
    }
  }

}
