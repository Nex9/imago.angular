
class imagoImage extends Directive

  constructor: ($window, $q, $log) ->

    return {
      replace: true
      scope: true
      templateUrl: '/imagoWidgets/image-widget.html'
      controller: ($scope, $element, $attrs) ->

        $scope.status = 'loading'
        $scope.imageStyle = {}

      link: (scope, element, attrs) ->
        self = {}

        opts = {}

        source = {}

        defaults =
          align     : 'center center'
          sizemode  : 'fit'              # fit, crop
          hires     : true
          responsive: true
          scale     : 1
          lazy      : true
          maxsize   : 2560
          mediasize : false
          width     : ''
          height    : ''

        for key, value of defaults
          opts[key] = value

        for key, value of attrs
          opts[key] = value

        #####

        opts.initialWidth  = opts.width
        opts.initialHeight = opts.height

        if opts.lazy
          visiblePromise = do () =>
            deffered = $q.defer()
            self.visibleFunc = scope.$watch attrs['visible'], (value) =>
              return unless value is true
              deffered.resolve(value)

            return deffered.promise


        sourcePromise = do () =>
          deffered = $q.defer()

          self.watch = scope.$watch attrs['source'], (data) =>
            return unless data

            deffered.resolve(data)

          return deffered.promise


        sourcePromise.then (data) =>
          self.watch() unless attrs['watch']
          source = data

          if opts.dimensions and attrs['dimensions']
            scope.$watch attrs['dimensions'], (value) =>
              angular.forEach value, (value, key) =>
                opts[key] = value or 'auto'

          if opts.lazy
            visiblePromise.then (value) =>
              self.visibleFunc()
              render source
          else
            render data

        render = (data) =>

          unless data?.serving_url
            element.remove()
            return

          # console.log scope.visible

          scope.elementStyle = {} unless scope.elementStyle
          #console.log 'elementStyle ' , scope.elementStyle
          if angular.isString(data.resolution)
            r = data.resolution.split('x')
            opts.resolution =
              width:  r[0]
              height: r[1]
            opts.assetRatio = r[0]/r[1]

          # TODO: Not sure about this solution below:
          # the widget may get less flexible / Sebastian

          # if opts.width and opts.height
          #   width = parseInt opts.width
          #   height = parseInt opts.height
          # else
          #   width = element[0].clientWidth
          #   height = element[0].clientHeight
          return console.log('tried to render during rendering!!') if scope.status is 'preloading'

          # console.log 'opts.assetRatio', opts.assetRatio
          # use pvrovided dimentions.
          if angular.isNumber(opts.width) and angular.isNumber(opts.height)
            $log.log 'fixed size', opts.width, opts.height
            width  = parseInt opts.width
            height = parseInt opts.height

          #
          # # fit width
          else if opts.height is 'auto' and angular.isNumber(opts.width)
            height =  parseInt opts.width / opts.assetRatio
            width  =  opts.width
            scope.elementStyle.height = parseInt height
            #$log.log 'fit width', opts.width, opts.height
          #
          # # fit height
          else if opts.width is 'auto' and angular.isNumber(opts.height)
            height = opts.height
            width  = opts.height * opts.assetRatio
            scope.elementStyle.width = parseInt width
            #$log.log 'fit height', opts.width, opts.height
          #
          # # we want dynamic resizing without css.
          # # like standard image behaviour. will get a height according to the width
          else if opts.width is 'auto' and opts.height is 'auto'
            width  = element[0].clientWidth
            height = width / opts.assetRatio
            scope.elementStyle.height = parseInt height
            # $log.log 'both auto', opts.width, opts.height, width, height, opts.assetRatio
          #
          # # width and height dynamic, needs to be defined via css
          # # either width height or position
          else
            width  = element[0].clientWidth
            height = element[0].clientHeight
            # $log.log 'width and height dynamic', opts.width, opts.height

          # unbind scrollstop listener for lazy loading
          # opts.window.off "scrollstop.#{opts.id}" if opts.lazy


          scope.status = 'preloading'

          wrapperRatio = width / height

          # $log.log 'width, height, wrapperRatio, opts.assetRatio', opts.width, opts.height, wrapperRatio, assetRatio
          # debugger

          dpr = if opts.hires then Math.ceil($window.devicePixelRatio) or 1 else 1

          # $log.log 'width, height', width, height
          if opts.sizemode is 'crop'
            if opts.assetRatio <= wrapperRatio
              # $log.log 'crop full width'
              servingSize = Math.round(Math.max(width, width / opts.assetRatio))
            else
              # $log.log 'crop full height'
              servingSize = Math.round(Math.max(height, height * opts.assetRatio))

          # sizemode fit
          else
            # $log.log 'assetratio: ', opts.assetRatio, 'wrapperraito: ' , wrapperRatio
            if opts.assetRatio <= wrapperRatio
              # $log.log 'fit full height', opts.width, opts.height, opts.assetRatio, opts.height * assetRatio
              servingSize = Math.round(Math.max(height, height * opts.assetRatio))
            else
              # $log.log 'fit full width', opts.width, opts.height, opts.assetRatio, height / assetRatio
              servingSize = Math.round(Math.max(width, width / opts.assetRatio))

          servingSize = parseInt Math.min(servingSize * dpr, opts.maxsize), 10

          # make sure we only load a new size
          if servingSize is opts.servingSize
            # console.log 'same size exit'
            scope.status = 'loaded'
            return

          opts.servingSize = servingSize

          servingUrl = "#{ data.serving_url }=s#{ servingSize * opts.scale }"

          # $log.log 'servingURl', servingUrl
          unless opts.responsive
            scope.imageStyle.width  = "#{parseInt width,  10}px"
            scope.imageStyle.height = "#{parseInt height, 10}px"


          img = angular.element('<img>')
          img.on 'load', (e) =>
            scope.imageStyle.backgroundImage     = "url(#{servingUrl})"
            scope.imageStyle.backgroundSize      = scope.calcMediaSize()
            scope.imageStyle.backgroundPosition  = opts.align
            scope.imageStyle.display             = 'inline-block'
            scope.status                         = 'loaded'
            scope.$apply()
            # console.log 'scope.imageStyle', scope.imageStyle

          img[0].src = servingUrl

        scope.calcMediaSize = () =>

          # $log.log 'calcMediaSize', opts.sizemode
          opts.width  = element[0].clientWidth  or opts.width
          opts.height = element[0].clientHeight or opts.height

          # $log.log 'calcMediaSize: opts.width, opts.height', opts.width, opts.height
          return unless opts.width and opts.height

          wrapperRatio = opts.width / opts.height
          if opts.sizemode is 'crop'
            # $log.log 'opts.sizemode crop', opts.assetRatio, wrapperRatio
            if opts.assetRatio < wrapperRatio then "100% auto" else "auto 100%"
          else
            # $log.log 'opts.sizemode fit', opts.assetRatio, wrapperRatio
            if opts.assetRatio > wrapperRatio then "100% auto" else "auto 100%"

        scope.onResize = () =>
          # console.log 'onResize func'
          scope.imageStyle['background-size'] = scope.calcMediaSize()

        scope.$on 'resizelimit', () =>
          #console.log 'resizelimit' ,opts.responsive
          scope.onResize() if opts.responsive

        scope.$on 'resizestop', () =>
          render(source) if opts.responsive

        angular.element($window).on "orientationchange", () =>
          if opts.responsive
            opts.width  = opts.initialWidth
            opts.height = opts.initalHeight
            render(source)

    }
