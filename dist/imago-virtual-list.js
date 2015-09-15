var ImagoVirtualList;

ImagoVirtualList = (function() {
  function ImagoVirtualList($window, $document, $rootScope, $timeout) {
    return {
      scope: true,
      templateUrl: '/imago/imago-virtual-list.html',
      transclude: true,
      controller: function() {},
      controllerAs: 'imagovirtuallist',
      bindToController: {
        data: '=',
        onBottom: '&',
        scroll: '='
      },
      link: function(scope, element, attrs, ctrl, transclude) {
        var self, watchers;
        transclude(scope, function(clone) {
          return element.children().append(clone);
        });
        self = {};
        self.scrollTop = 0;
        scope.init = function() {
          if (!scope.imagovirtuallist.data) {
            return;
          }
          if (attrs.imagoVirtualListContainer) {
            element[0].addEventListener('scroll', scope.onScrollContainer);
          } else {
            angular.element($window).on('scroll', scope.onScrollWindow);
          }
          scope.resetSize();
          return $timeout(function() {
            var cellsPerHeight, testDiv;
            testDiv = document.createElement('div');
            testDiv.className = attrs.classItem;
            testDiv.id = 'virtual-list-test-div';
            element.append(testDiv);
            self.rowWidth = testDiv.clientWidth;
            self.rowHeight = testDiv.clientHeight;
            angular.element(element[0].querySelector('#virtual-list-test-div')).remove();
            self.width = element[0].clientWidth;
            self.height = element[0].clientHeight;
            self.itemsPerRow = Math.floor(self.width / self.rowWidth);
            cellsPerHeight = Math.round(self.height / self.rowHeight);
            self.cellsPerPage = cellsPerHeight * self.itemsPerRow;
            self.numberOfCells = 3 * self.cellsPerPage;
            return self.updateData();
          }, 200);
        };
        self.updateData = function() {
          self.canvasHeight = Math.ceil(scope.imagovirtuallist.data.length / self.itemsPerRow) * self.rowHeight;
          scope.canvasStyle = {
            height: self.canvasHeight + 'px'
          };
          return self.updateDisplayList();
        };
        self.updateDisplayList = function() {
          var cellsToCreate, chunks, data, findIndex, firstCell, i, idx, l;
          firstCell = Math.max(Math.round(self.scrollTop / self.rowHeight) - (Math.round(self.height / self.rowHeight)), 0);
          cellsToCreate = Math.min(firstCell + self.numberOfCells, self.numberOfCells);
          data = firstCell * self.itemsPerRow;
          scope.visibleProvider = scope.imagovirtuallist.data.slice(data, data + cellsToCreate);
          chunks = _.chunk(scope.visibleProvider, self.itemsPerRow);
          i = 0;
          l = scope.visibleProvider.length;
          while (i < l) {
            findIndex = function() {
              var chunk, idx, indexChunk, indexItem, item, j, k, len, len1;
              for (indexChunk = j = 0, len = chunks.length; j < len; indexChunk = ++j) {
                chunk = chunks[indexChunk];
                for (indexItem = k = 0, len1 = chunk.length; k < len1; indexItem = ++k) {
                  item = chunk[indexItem];
                  if (item._id !== scope.visibleProvider[i]._id) {
                    continue;
                  }
                  idx = {
                    chunk: indexChunk,
                    inside: indexItem
                  };
                  return idx;
                }
              }
            };
            idx = findIndex();
            scope.visibleProvider[i].styles = {
              'transform': "translate(" + ((self.rowWidth * idx.inside) + 'px') + ", " + ((firstCell + idx.chunk) * self.rowHeight + 'px') + ")"
            };
            i++;
          }
          if (scope.imagovirtuallist.scroll) {
            return scope.scroll();
          }
        };
        scope.scroll = function() {
          if (!scope.imagovirtuallist.scroll) {
            return;
          }
          return $timeout(function() {
            self.scrollTop = angular.copy(scope.imagovirtuallist.scroll);
            scope.imagovirtuallist.scroll = 0;
            return $document.scrollTop(self.scrollTop, 0);
          });
        };
        scope.onScrollContainer = function() {
          self.scrollTop = element.prop('scrollTop');
          self.updateDisplayList();
          return scope.$digest();
        };
        scope.onScrollWindow = function() {
          self.scrollTop = $window.scrollY;
          if ((self.canvasHeight - self.scrollTop) <= $window.innerHeight) {
            scope.imagovirtuallist.onBottom();
          }
          self.updateDisplayList();
          return scope.$digest();
        };
        scope.resetSize = function() {
          scope.visibleProvider = [];
          scope.canvasStyle = {};
          self.cellsPerPage = 0;
          self.numberOfCells = 0;
          self.width = 0;
          return self.height = 0;
        };
        scope.init();
        scope.$watch('imagovirtuallist.data', function() {
          return self.updateData();
        });
        watchers = [];
        watchers.push($rootScope.$on('imagovirtuallist:init', function() {
          return scope.init();
        }));
        watchers.push($rootScope.$on('resizestop', function() {
          return scope.init();
        }));
        return scope.$on('$destroy', function() {
          var j, len, results, watcher;
          angular.element($window).off('scroll', scope.onScrollWindow);
          results = [];
          for (j = 0, len = watchers.length; j < len; j++) {
            watcher = watchers[j];
            results.push(watcher());
          }
          return results;
        });
      }
    };
  }

  return ImagoVirtualList;

})();

angular.module('imago').directive('imagoVirtualList', ['$window', '$document', '$rootScope', '$timeout', ImagoVirtualList]);

angular.module("imago").run(["$templateCache", function($templateCache) {$templateCache.put("/imago/imago-virtual-list.html","<div ng-style=\"canvasStyle\" class=\"canvas\"></div>");}]);