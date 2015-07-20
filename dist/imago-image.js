var imagoImage, imagoImageController;

imagoImage = (function() {
  function imagoImage($window, $rootScope, $timeout, $parse, $log, imagoUtils, imagoModel) {
    return {
      replace: true,
      scope: true,
      templateUrl: '/imago/imagoImage.html',
      controller: 'imagoImageController',
      link: function(scope, element, attrs) {
        var calcMediaSize, compile, initialize, isId, key, opts, render, self, setImageStyle, value, watchers;
        self = {};
        scope.visible = false;
        scope.source = void 0;
        opts = {
          align: 'center center',
          sizemode: 'fit',
          hires: true,
          responsive: true,
          scale: 1,
          lazy: true,
          maxsize: 2560
        };
        for (key in attrs) {
          value = attrs[key];
          if (value === 'true' || value === 'false') {
            opts[key] = JSON.parse(value);
          } else {
            opts[key] = value;
          }
        }
        isId = /[0-9a-fA-F]{24}/;
        if (attrs.imagoImage.match(isId)) {
          self.watch = attrs.$observe('imagoImage', function(value) {
            if (!value) {
              return;
            }
            scope.source = imagoModel.find({
              '_id': value
            });
            if (!attrs['watch']) {
              self.watch();
            }
            return compile();
          });
        } else {
          self.watch = scope.$watch(attrs.imagoImage, (function(_this) {
            return function(data) {
              if (!data) {
                return;
              }
              scope.source = data;
              if (!attrs['watch']) {
                self.watch();
              }
              return compile();
            };
          })(this));
        }
        compile = function() {
          var ref;
          if (!((ref = scope.source) != null ? ref.serving_url : void 0)) {
            element.remove();
            return;
          }
          if (scope.source.fields.hasOwnProperty('crop') && !attrs['align']) {
            opts.align = scope.source.fields.crop.value;
          }
          if (scope.source.fields.hasOwnProperty('sizemode')) {
            if (scope.source.fields.sizemode.value !== 'default' && !attrs['sizemode']) {
              opts.sizemode = scope.source.fields.sizemode.value;
            }
          }
          if (opts.responsive) {
            if (opts.sizemode === 'crop') {
              scope.$on('resizelimit', function() {
                calcMediaSize();
                return scope.$evalAsync();
              });
            }
          }
          return initialize();
        };
        initialize = function() {
          var dpr, height, r, servingSize, width, wrapperRatio;
          if (angular.isString(scope.source.resolution)) {
            r = scope.source.resolution.split('x');
            opts.resolution = {
              width: r[0],
              height: r[1]
            };
            opts.assetRatio = r[0] / r[1];
          }
          if (scope.status === 'preloading') {
            return console.log('tried to render during rendering!!');
          }
          scope.status = 'preloading';
          scope.align = opts.align;
          scope.sizemode = opts.sizemode;
          width = element[0].clientWidth;
          height = element[0].clientHeight;
          if (height) {
            wrapperRatio = width / height;
          }
          dpr = opts.hires ? Math.ceil($window.devicePixelRatio) || 1 : 1;
          if (opts.sizemode === 'crop' && height) {
            if (opts.assetRatio <= wrapperRatio) {
              servingSize = Math.round(Math.max(width, width / opts.assetRatio));
            } else {
              servingSize = Math.round(Math.max(height, height * opts.assetRatio));
            }
          } else {
            if (!height || opts.autosize === 'height') {
              opts.autosize = 'height';
              servingSize = Math.round(Math.max(width, width / opts.assetRatio));
            } else if (!width || opts.autosize === 'width') {
              opts.autosize = 'width';
              servingSize = Math.round(Math.max(height, height * opts.assetRatio));
            } else if (opts.assetRatio <= wrapperRatio) {
              servingSize = Math.round(Math.max(height, height * opts.assetRatio));
            } else {
              servingSize = Math.round(Math.max(width, width / opts.assetRatio));
            }
          }
          servingSize = parseInt(Math.min(servingSize * dpr, opts.maxsize), 10);
          if (servingSize === opts.servingSize) {
            scope.status = 'loaded';
            return;
          }
          opts.servingSize = servingSize;
          if (imagoUtils.isBaseString(scope.source.serving_url)) {
            opts.servingUrl = scope.source.serving_url;
          } else {
            opts.servingUrl = scope.source.serving_url + "=s" + (servingSize * opts.scale);
          }
          return render();
        };
        render = function() {
          var img;
          if (opts.lazy && !scope.visible) {
            return self.visibleFunc = scope.$watch('visible', (function(_this) {
              return function(value) {
                if (!value) {
                  return;
                }
                self.visibleFunc();
                scope.visible = true;
                return render();
              };
            })(this));
          } else {
            img = angular.element('<img>');
            img.on('load', function(e) {
              if (opts.sizemode === 'crop') {
                scope.imageStyle = {
                  backgroundImage: "url(" + opts.servingUrl + ")",
                  backgroundSize: calcMediaSize(),
                  backgroundPosition: opts.align
                };
              } else {
                scope.servingUrl = opts.servingUrl;
              }
              scope.status = 'loaded';
              return scope.$evalAsync();
            });
            return img[0].src = opts.servingUrl;
          }
        };
        calcMediaSize = function() {
          var height, width, wrapperRatio;
          width = element[0].clientWidth;
          height = element[0].clientHeight;
          if (height) {
            wrapperRatio = width / height;
          }
          if (opts.sizemode === 'crop') {
            if (opts.assetRatio < wrapperRatio) {
              return scope.imageStyle['background-size'] = "100% auto";
            } else {
              return scope.imageStyle['background-size'] = "auto 100%";
            }
          }
        };
        setImageStyle = function() {
          var styles;
          if (opts.sizemode === 'crop') {
            styles = {
              backgroundImage: "url(" + opts.servingUrl + ")",
              backgroundSize: calcMediaSize(),
              backgroundPosition: opts.align
            };
            return styles;
          } else {
            scope.servingUrl = opts.servingUrl;
          }
        };
        watchers = {};
        if (opts.responsive) {
          watchers.resizestop = $rootScope.$on('resizestop', function() {
            scope.status = 'loading';
            if (scope.source) {
              return initialize();
            }
          });
        }
        scope.$on('$stateChangeSuccess', function() {
          return $timeout(function() {
            return imagoUtils.fireEvent('checkInView');
          });
        });
        angular.element($window).on('orientationchange', initialize);
        return scope.$on('$destroy', function() {
          var results;
          results = [];
          for (key in watchers) {
            results.push(watchers[key]());
          }
          return results;
        });
      }
    };
  }

  return imagoImage;

})();

imagoImageController = (function() {
  function imagoImageController($scope) {
    $scope.status = 'loading';
    $scope.imageStyle = {};
  }

  return imagoImageController;

})();

angular.module('imago').directive('imagoImage', ['$window', '$rootScope', '$timeout', '$parse', '$log', 'imagoUtils', 'imagoModel', imagoImage]).controller('imagoImageController', ['$scope', imagoImageController]);

angular.module("imago").run(["$templateCache", function($templateCache) {$templateCache.put("/imago/imagoImage.html","<div visible=\"visible\" in-view=\"visible = $inview\" in-view-options=\"{debounce: 100}\" ng-style=\"elementStyle\" ng-class=\"[status, align]\" ng-switch=\"sizemode\" class=\"imagoimage\"><img ng-src=\"{{servingUrl}}\" ng-style=\"imageStyle\" ng-switch-when=\"fit\" class=\"imagox23\"/><div ng-style=\"imageStyle\" ng-switch-when=\"crop\" class=\"imagox23\"></div><div class=\"loading\"><div class=\"spin\"></div><div class=\"spin2\"></div></div></div>");}]);