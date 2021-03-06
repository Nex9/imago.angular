(function() {
  var imagoSubmit,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  imagoSubmit = (function() {
    function imagoSubmit($http, imagoUtils, imagoModel) {
      return {
        formatForm: function(form) {
          var _message, defaultFields, key, obj, originalMsg, value;
          defaultFields = ['message', 'subscribe'];
          obj = {};
          _message = '';
          for (key in form) {
            value = form[key];
            if (!(indexOf.call(defaultFields, key) >= 0 || _.isPlainObject(value) || (typeof value.match === "function" ? value.match(/data:/) : void 0))) {
              _message += "<b>" + (_.startCase(key)) + "</b>: " + value + "<br><br>";
            }
            obj[key] = value || '';
          }
          originalMsg = imagoUtils.replaceNewLines(obj.message || '');
          if (originalMsg) {
            _message += "<b>Message</b>:<br><br> " + originalMsg + "<br><br>";
          }
          obj.message = _message;
          return obj;
        },
        send: function(data) {
          var postUrl;
          postUrl = imagoModel.host + '/api/contact';
          return $http.post(postUrl, this.formatForm(data)).then((function(_this) {
            return function(response) {
              console.log('success: ', response);
              return {
                status: true,
                message: ""
              };
            };
          })(this), function(error) {
            console.log('error: ', error);
            return {
              status: false,
              message: "could not connect to Server."
            };
          });
        }
      };
    }

    return imagoSubmit;

  })();

  angular.module('imago').service('imagoSubmit', ['$http', 'imagoUtils', 'imagoModel', imagoSubmit]);

}).call(this);
