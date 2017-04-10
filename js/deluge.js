/* exported Deluge */

class Deluge {

  constructor(endpoint) {
    this.API_ERROR = 'apierror';
    this.API_AUTH_CODE           = 1;
    this.API_UNKNOWN_METHOD_CODE = 2;
    this.API_UNKNOWN_ERROR_CODE  = 3;

    if (typeof endpoint === 'undefined') {
      throw new Error('Endpoint must be defined upon initialisation');
    }
    this._endpoint = endpoint;
  }

  get endpoint() {
    return this._endpoint;
  }

  /*
   * Ajax wrapper for making calls to Deluge web API.
   */
  api(method, params, options) {

    var deferred = jQuery.Deferred((d) => {
      // Default ajax options.
      var defaults = {
        url         : this._endpoint + 'json', // testing, makes it easier to track a given request   +"?rand="+Math.trunc(Math.random()*10000),
        type        : 'POST',
        dataType    : 'json',
        contentType : 'application/json',
      };

      // Extend default with any user passed options.
      var settings = jQuery.extend({}, defaults, options);

      // Create the API call data.
      settings.data = JSON.stringify({
        method : method,
        params : params || [],
        id     : '-999', /* Not needed for this */
      });

      // Setup callbacks for anything passed into options.
      d.done(settings.success);
      d.fail(settings.error);

      // Replace the success and error so we can do some generic handling
      // for the response.
      settings.success = function (response, textStatus, jqXHR) {
        if (response.error !== null) {
          d.rejectWith(this, [jqXHR, self.API_ERROR, response.error]);
        } else {
          d.resolveWith(this, [response.result, textStatus, jqXHR]);
        }
      };

      settings.error = function (jqXHR, textStatus, errorThrown) {
        d.rejectWith(this, [jqXHR, textStatus, errorThrown]);
      };

      // Perform ajax call.
      jQuery.ajax(settings);
    });

    var promise = deferred.promise();

    // Alias the old names for ajax stuff.
    promise.success = deferred.done;
    promise.error = deferred.fail;

    return promise;
  }

}
