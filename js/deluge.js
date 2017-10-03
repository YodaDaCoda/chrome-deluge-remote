var Deluge = (function (Deluge, $) {
	Deluge = Deluge || {};

	function endpoint() {
		return ExtensionConfig.address_protocol + "://" + ExtensionConfig.address_ip + ":" + (ExtensionConfig.address_port != "" ? ExtensionConfig.address_port : "8112") + "/" + (ExtensionConfig.address_base != "" ? ExtensionConfig.address_base+"/" : "");
	}

	// API Error Text Status.
	Deluge.API_ERROR = 'apierror';
	Deluge.API_AUTH_CODE = 1;
	Deluge.API_UNKNOWN_METHOD_CODE = 2;
	Deluge.API_UNKNOWN_ERROR_CODE = 3;

	Deluge.endpoint = function() { return endpoint(); };

	/*
	 * Ajax wrapper for making calls to Deluge web API.
	 *
	 */
	Deluge.api = function (method, params, options) {
		var that = this;

		var deferred = $.Deferred(function (d) {
			// Default ajax options.
			var defaults = {
				url: endpoint()+"json", //testing, makes it easier to track a given request   +"?rand="+Math.trunc(Math.random()*10000),
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json',
			};
				// Extend default with any user passed options.
			var settings = $.extend({}, defaults, options);

			// Create the API call data.
			settings.data = JSON.stringify({
				method: method,
				params: params || [],
				id: '-999' /* Not needed for this */
			});

			// Setup callbacks for anything passed into options.
			d.done(settings.success);
			d.fail(settings.error);

			// Replace the success and error so we can do some generic handling
			// for the response.
			settings.success = function (response, textStatus, jqXHR) {
				if (response.error !== null) {
					d.rejectWith(this, [jqXHR, that.API_ERROR, response.error]);
				} else {
					d.resolveWith(this, [response.result, textStatus, jqXHR]);
				}
			};

			settings.error = function (jqXHR, textStatus, errorThrown) {
				d.rejectWith(this, [jqXHR, textStatus, errorThrown]);
			};

			// Perform ajax call.
			$.ajax(settings);
		});

		var promise = deferred.promise();

		// Alias the old names for ajax stuff.
		promise.success = deferred.done;
		promise.error = deferred.fail;

		return promise;
	};

	return Deluge;
}(Deluge, jQuery));
