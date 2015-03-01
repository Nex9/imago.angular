var Calculation,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Calculation = (function() {
  Calculation.prototype.cart = void 0;

  Calculation.prototype.stripe = void 0;

  Calculation.prototype.currency = void 0;

  Calculation.prototype.shippingmethods = void 0;

  Calculation.prototype.taxes = void 0;

  Calculation.prototype.currencies = void 0;

  Calculation.prototype.taxincluded = void 0;

  function Calculation($q, $state, $http, $auth, imagoUtils, imagoSettings) {
    this.$q = $q;
    this.$state = $state;
    this.$http = $http;
    this.$auth = $auth;
    this.imagoUtils = imagoUtils;
    this.imagoSettings = imagoSettings;
    this.submit = bind(this.submit, this);
    this.calculate = bind(this.calculate, this);
    this.calculateTotal = bind(this.calculateTotal, this);
    this.getZipTax = bind(this.getZipTax, this);
    this.getTaxRate = bind(this.getTaxRate, this);
    this.calculateShipping = bind(this.calculateShipping, this);
    this.changeShipping = bind(this.changeShipping, this);
    this.findShippingRate = bind(this.findShippingRate, this);
    this.getShippingRate = bind(this.getShippingRate, this);
    this.setShippingRates = bind(this.setShippingRates, this);
    this.setCurrency = bind(this.setCurrency, this);
    this.applyCoupon = bind(this.applyCoupon, this);
    this.checkCoupon = bind(this.checkCoupon, this);
    this.changeAddress = bind(this.changeAddress, this);
    this.deleteItem = bind(this.deleteItem, this);
    this.updateCart = bind(this.updateCart, this);
    this.countries = this.imagoUtils.COUNTRIES;
  }

  Calculation.prototype.updateCart = function() {
    this.$http.put(this.imagoSettings.host + '/api/carts/' + this.cart._id, this.cart);
    return this.calculate();
  };

  Calculation.prototype.deleteItem = function(item) {
    var idx;
    idx = _.findIndex(this.cart.items, {
      id: item.id
    });
    this.cart.items.splice(idx, 1);
    return this.updateCart();
  };

  Calculation.prototype.changeAddress = function(section, type) {
    var ref, ref1, ref2, ref3;
    if (((ref = this.process.form['shipping_address']) != null ? ref.country : void 0) && type === 'country') {
      this.setCurrency(null, this.process.form['shipping_address'].country);
    } else if (type === 'country') {
      this.setCurrency(null, this.process.form[section].country);
    }
    this[section] || (this[section] = {});
    if ((ref1 = this.process.form[section].country) === 'United States of America' || ref1 === 'United States' || ref1 === 'USA' || ref1 === 'Canada' || ref1 === 'Australia') {
      this[section].disablestates = false;
      if ((ref2 = this.process.form[section].country) === 'United States of America' || ref2 === 'United States') {
        this[section].states = this.imagoUtils.STATES['USA'];
      } else {
        this[section].states = this.imagoUtils.STATES[this.process.form[section].country.toUpperCase()];
      }
    } else {
      this[section].disablestates = true;
      this[section].states = [];
    }
    this.process.form[section].country_code = this.imagoUtils.CODES[this.process.form[section].country];
    if ((ref3 = this.process.form['shipping_address']) != null ? ref3.country : void 0) {
      this.country = this.process.form['shipping_address'].country;
      this.state = this.process.form['shipping_address'].state;
      this.zip = this.process.form['shipping_address'].zip;
    } else {
      this.country = this.process.form[section].country;
      this.state = this.process.form[section].state;
      this.zip = this.process.form[section].zip;
    }
    return this.calculate();
  };

  Calculation.prototype.checkCoupon = function(code) {
    if (!code) {
      this.couponState = '';
      this.calculate();
      return;
    }
    return this.$http.get(this.imagoSettings.host + '/api/coupons?code=' + code).then((function(_this) {
      return function(response) {
        if (response.data.length === 1) {
          _this.coupon = response.data[0];
          _this.couponState = 'valid';
          return _this.calculate();
        } else {
          return _this.couponState = 'invalid';
        }
      };
    })(this));
  };

  Calculation.prototype.applyCoupon = function(coupon, costs) {
    var meta, percentvalue, value;
    if (!coupon) {
      return;
    }
    meta = coupon.meta;
    if (meta.type === 'flat') {
      value = Math.min(costs.subtotal, meta.value[this.currency]);
      return costs.subtotal = costs.subtotal - value;
    } else if (meta.type === 'percent') {
      percentvalue = Number((costs.subtotal * meta.value / 10000).toFixed(0));
      return costs.subtotal = costs.subtotal - percentvalue;
    } else if (meta.type === 'free shipping') {
      return costs.shipping = 0;
    }
  };

  Calculation.prototype.setCurrency = function(currency, country) {
    if (country) {
      currency = this.imagoUtils.inUsa(country) ? 'USD' : this.imagoUtils.CURRENCY_MAPPING[country];
    }
    return this.currency = indexOf.call(this.currencies, currency) >= 0 ? currency : this.currencies[0];
  };

  Calculation.prototype.setShippingRates = function(rates) {
    if (rates != null ? rates.length : void 0) {
      if (_.isPlainObject(rates)) {
        this.shippingRates = [rates];
      } else if (_.isArray(rates)) {
        this.shippingRates = rates;
      }
    } else {
      this.shippingRates = [];
    }
    if (this.shippingRates.length) {
      return this.shipping_options = this.shippingRates[0];
    }
  };

  Calculation.prototype.getShippingRate = function() {
    var deferred, rates;
    deferred = this.$q.defer();
    rates = this.findShippingRate();
    this.setShippingRates(rates);
    deferred.resolve(rates);
    return deferred.promise;
  };

  Calculation.prototype.findShippingRate = function() {
    var rates, rates_by_country, ref;
    if (!this.country) {
      return;
    }
    if ((ref = this.country) === 'United States of America' || ref === 'United States') {
      this.country = 'USA';
    }
    rates_by_country = _.filter(this.shippingmethods, (function(_this) {
      return function(item) {
        var c, ref1, ref2;
        return item.active && (ref1 = (ref2 = _this.country) != null ? ref2.toUpperCase() : void 0, indexOf.call((function() {
          var i, len, ref3, results;
          ref3 = item.countries;
          results = [];
          for (i = 0, len = ref3.length; i < len; i++) {
            c = ref3[i];
            results.push(c.toUpperCase());
          }
          return results;
        })(), ref1) >= 0);
      };
    })(this));
    if (this.state) {
      rates = _.filter(rates_by_country, (function(_this) {
        return function(item) {
          var ref1, s;
          return ref1 = _this.state.toUpperCase(), indexOf.call((function() {
            var i, len, ref2, results;
            ref2 = item.states;
            results = [];
            for (i = 0, len = ref2.length; i < len; i++) {
              s = ref2[i];
              results.push(s.toUpperCase());
            }
            return results;
          })(), ref1) >= 0;
        };
      })(this));
      if (rates != null ? rates.length : void 0) {
        return rates;
      }
      rates = _.filter(rates_by_country, (function(_this) {
        return function(item) {
          return item.states.length === 0;
        };
      })(this)) || _.filter(this.shippingmethods, function(item) {
        return !item.countries.length;
      });
      return rates;
    } else {
      return rates_by_country || _.filter(this.shippingmethods, function(item) {
        return !item.countries.length;
      });
    }
  };

  Calculation.prototype.changeShipping = function() {
    this.calcShipping(this.shipping_options, this.$q.defer());
    return this.calculateTotal();
  };

  Calculation.prototype.calculateShipping = function() {
    var deferred;
    deferred = this.$q.defer();
    this.costs.shipping = 0;
    return this.getShippingRate().then((function(_this) {
      return function(rates) {
        if (!(rates != null ? rates.length : void 0)) {
          return deferred.resolve();
        }
        _this.calcShipping(rates[0], deferred);
        return deferred.promise;
      };
    })(this));
  };

  Calculation.prototype.calcShipping = function(rate, deferred) {
    var count, i, item, j, len, len1, range, ref, ref1, ref2, ref3, with_shippingcost;
    count = 0;
    with_shippingcost = [];
    ref = this.cart.items;
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      if (!((ref1 = item.shipping_cost) != null ? ref1[this.currency] : void 0)) {
        if (rate.type === 'weight') {
          count += item.weight * item.qty;
        } else {
          count += item.qty;
        }
      } else if ((ref2 = item.shipping_cost) != null ? ref2[this.currency] : void 0) {
        with_shippingcost.push(item);
      }
    }
    if (count === 0 && rate.type !== 'weight' && !with_shippingcost.length) {
      return deferred.resolve();
    }
    range = _.find(rate.ranges, function(range) {
      return count <= range.to_unit && count >= range.from_unit;
    });
    if (!range) {
      range = rate.ranges[rate.ranges.length - 1] || 0;
    }
    if (rate.type === 'weight') {
      this.costs.shipping = range.price[this.currency] || 0;
    } else {
      this.costs.shipping = (range.price[this.currency] || 0) * count;
    }
    for (j = 0, len1 = with_shippingcost.length; j < len1; j++) {
      item = with_shippingcost[j];
      this.costs.shipping += (((ref3 = item.shipping_cost) != null ? ref3[this.currency] : void 0) || 0) * item.qty;
    }
    return deferred.resolve();
  };

  Calculation.prototype.calculateTax = function() {
    var deferred;
    deferred = this.$q.defer();
    this.getTaxRate().then((function(_this) {
      return function() {
        var i, item, j, len, len1, onepercent, ref, ref1, results;
        _this.costs.tax = 0;
        if (_this.taxincluded) {
          deferred.resolve();
          return;
        }
        if (_this.imagoUtils.includesTax(_this.currency)) {
          _this.costs.includedTax = 0;
          if (_this.costs.taxRate) {
            ref = _this.cart.items;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              item = ref[i];
              onepercent = item.fields.price.value[_this.currency] / (100 + _this.costs.taxRate) * item.qty;
              _this.costs.includedTax += Math.round(onepercent * _this.costs.taxRate);
              results.push(deferred.resolve());
            }
            return results;
          } else {
            return deferred.resolve();
          }
        } else {
          ref1 = _this.cart.items;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            item = ref1[j];
            _this.costs.tax += Math.round(item.fields.price.value[_this.currency] * item.qty * _this.costs.taxRate);
          }
          return deferred.resolve();
        }
      };
    })(this));
    return deferred.promise;
  };

  Calculation.prototype.getTaxRate = function() {
    var deferred, tRate;
    deferred = this.$q.defer();
    this.costs.taxRate = 0;
    if (this.taxincluded) {
      deferred.resolve();
    }
    if (!this.country) {
      deferred.resolve();
    }
    tRate = this.findTaxRate();
    if (tRate.autotax && this.imagoUtils.inUsa(this.country)) {
      return this.getZipTax();
    }
    this.costs.taxRate = tRate.rate / 100;
    deferred.resolve();
    return deferred.promise;
  };

  Calculation.prototype.findTaxRate = function() {
    var rate, rates, rates_by_country, ref;
    if ((ref = this.country) === 'United States of America' || ref === 'United States') {
      this.country = 'USA';
    }
    rates_by_country = _.filter(this.taxes, (function(_this) {
      return function(item) {
        var c, ref1, ref2;
        return item.active && (ref1 = (ref2 = _this.country) != null ? ref2.toUpperCase() : void 0, indexOf.call((function() {
          var i, len, ref3, results;
          ref3 = item.countries;
          results = [];
          for (i = 0, len = ref3.length; i < len; i++) {
            c = ref3[i];
            results.push(c.toUpperCase());
          }
          return results;
        })(), ref1) >= 0);
      };
    })(this));
    if (this.state) {
      rate = _.find(rates_by_country, (function(_this) {
        return function(item) {
          var ref1, s;
          return ref1 = _this.state.toUpperCase(), indexOf.call((function() {
            var i, len, ref2, results;
            ref2 = item.states;
            results = [];
            for (i = 0, len = ref2.length; i < len; i++) {
              s = ref2[i];
              results.push(s.toUpperCase());
            }
            return results;
          })(), ref1) >= 0;
        };
      })(this));
      if (rate) {
        return rate;
      }
      rates = _.filter(rates_by_country, function(item) {
        return item.states.length === 0;
      });
      return (rates != null ? rates[0] : void 0) || {
        'rate': 0
      };
    } else {
      return (rates_by_country != null ? rates_by_country[0] : void 0) || {
        'rate': 0
      };
    }
  };

  Calculation.prototype.getZipTax = function() {
    var deferred, ref;
    deferred = this.$q.defer();
    if (!(this.zip || (((ref = this.zip) != null ? ref.length : void 0) > 4))) {
      deferred.resolve();
    } else {
      this.$http.get((this.imagoSettings.host + "/api/ziptax?zipcode=") + this.zip).then((function(_this) {
        return function(response) {
          _this.costs.taxRate = response.data.taxUse;
          return deferred.resolve();
        };
      })(this));
    }
    return deferred.promise;
  };

  Calculation.prototype.calculateTotal = function() {
    this.costs.total = 0;
    if (this.costs.subtotal) {
      this.costs.total += this.costs.subtotal;
    }
    if (this.costs.shipping) {
      this.costs.total += this.costs.shipping;
    }
    if (this.costs.tax && !this.taxincluded) {
      this.costs.total += this.costs.tax;
    }
    return this.costs.total;
  };

  Calculation.prototype.calculate = function() {
    var i, item, len, ref;
    this.costs = {
      subtotal: 0,
      shipping: 0,
      tax: 0,
      includedTax: 0,
      total: 0
    };
    ref = this.cart.items;
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      this.costs.subtotal += item.qty * item.fields.price.value[this.currency];
    }
    this.costs.total = this.costs.subtotal;
    if (this.coupon) {
      this.applyCoupon(this.coupon, this.costs);
    }
    return this.$q.all([this.calculateTax(), this.calculateShipping()]).then((function(_this) {
      return function() {
        return _this.calculateTotal();
      };
    })(this));
  };

  Calculation.prototype.submit = function() {
    if (this.processing) {
      return;
    }
    this.processing = true;
    this.process.form.items = angular.copy(this.cart.items);
    this.process.form.costs = angular.copy(this.costs);
    this.process.form.currency = angular.copy(this.currency);
    this.process.form.billing_address.name = angular.copy(this.process.form.card.name);
    this.process.form.costs.shipping_options = angular.copy(this.shipping_options);
    this.process.form.costs.coupon = angular.copy(this.coupon);
    if (!this.differentshipping) {
      this.process.form['shipping_address'] = angular.copy(this.process.form['billing_address']);
    }
    return this.$http.post(this.imagoSettings.host + '/api/checkout', this.process.form).then((function(_this) {
      return function(response) {
        var i, len, order, ref;
        console.log('response checkout', response);
        _this.$auth.setToken(response.data.token);
        if (response.data.code === 200) {
          ref = response.data.result;
          for (i = 0, len = ref.length; i < len; i++) {
            order = ref[i];
            _this.$state.go('order', {
              number: order.number
            });
            break;
          }
        }
        return _this.processing = false;
      };
    })(this));
  };

  return Calculation;

})();

angular.module('imago').service('calculation', ['$q', '$state', '$http', '$auth', 'imagoUtils', 'imagoSettings', Calculation]);

var Costs;

Costs = (function() {
  function Costs() {
    return {
      scope: {
        costs: '=',
        currency: '='
      },
      controllerAs: 'costs',
      templateUrl: '/imago/costs.html'
    };
  }

  return Costs;

})();

angular.module('imago').directive('costs', [Costs]);

angular.module("imago").run(["$templateCache", function($templateCache) {$templateCache.put("/imago/costs.html","<table><tbody><tr><td>subtotal</td><td>{{ currency | currencySymbol }} {{ costs.subtotal | price }}</td></tr><tr><td>shipping</td><td>{{ currency | currencySymbol }} {{ costs.shipping | price }}</td></tr><tr ng-show=\"costs.includedTax\"><td>included tax</td><td>{{ currency | currencySymbol }} {{ costs.includedTax | price }}</td></tr><tr ng-show=\"!costs.includedTax\"><td>tax</td><td>{{ currency | currencySymbol }} {{ costs.tax | price }}</td></tr><tr class=\"total\"><td>total</td><td>{{ currency | currencySymbol }} {{ costs.total | price }}</td></tr></tbody></table>");}]);