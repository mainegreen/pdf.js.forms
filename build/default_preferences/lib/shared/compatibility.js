"use strict";

const globalScope = require('./global_scope');

if (!globalScope._pdfjsCompatibilityChecked) {
  globalScope._pdfjsCompatibilityChecked = true;

  const isNodeJS = require('./is_node');

  const hasDOM = typeof window === 'object' && typeof document === 'object';

  (function checkNodeBtoa() {
    if (globalScope.btoa || !isNodeJS()) {
      return;
    }

    globalScope.btoa = function (chars) {
      return Buffer.from(chars, 'binary').toString('base64');
    };
  })();

  (function checkNodeAtob() {
    if (globalScope.atob || !isNodeJS()) {
      return;
    }

    globalScope.atob = function (input) {
      return Buffer.from(input, 'base64').toString('binary');
    };
  })();

  (function checkChildNodeRemove() {
    if (!hasDOM) {
      return;
    }

    if (typeof Element.prototype.remove !== 'undefined') {
      return;
    }

    Element.prototype.remove = function () {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    };
  })();

  (function checkDOMTokenListAddRemove() {
    if (!hasDOM || isNodeJS()) {
      return;
    }

    const div = document.createElement('div');
    div.classList.add('testOne', 'testTwo');

    if (div.classList.contains('testOne') === true && div.classList.contains('testTwo') === true) {
      return;
    }

    const OriginalDOMTokenListAdd = DOMTokenList.prototype.add;
    const OriginalDOMTokenListRemove = DOMTokenList.prototype.remove;

    DOMTokenList.prototype.add = function (...tokens) {
      for (let token of tokens) {
        OriginalDOMTokenListAdd.call(this, token);
      }
    };

    DOMTokenList.prototype.remove = function (...tokens) {
      for (let token of tokens) {
        OriginalDOMTokenListRemove.call(this, token);
      }
    };
  })();

  (function checkDOMTokenListToggle() {
    if (!hasDOM || isNodeJS()) {
      return;
    }

    const div = document.createElement('div');

    if (div.classList.toggle('test', 0) === false) {
      return;
    }

    DOMTokenList.prototype.toggle = function (token) {
      let force = arguments.length > 1 ? !!arguments[1] : !this.contains(token);
      return this[force ? 'add' : 'remove'](token), force;
    };
  })();

  (function checkStringStartsWith() {
    if (String.prototype.startsWith) {
      return;
    }

    require('core-js/es/string/starts-with');
  })();

  (function checkStringEndsWith() {
    if (String.prototype.endsWith) {
      return;
    }

    require('core-js/es/string/ends-with');
  })();

  (function checkStringIncludes() {
    if (String.prototype.includes) {
      return;
    }

    require('core-js/es/string/includes');
  })();

  (function checkArrayIncludes() {
    if (Array.prototype.includes) {
      return;
    }

    require('core-js/es/array/includes');
  })();

  (function checkArrayFrom() {
    if (Array.from) {
      return;
    }

    require('core-js/es/array/from');
  })();

  (function checkObjectAssign() {
    if (Object.assign) {
      return;
    }

    require('core-js/es/object/assign');
  })();

  (function checkMathLog2() {
    if (Math.log2) {
      return;
    }

    Math.log2 = require('core-js/es/math/log2');
  })();

  (function checkNumberIsNaN() {
    if (Number.isNaN) {
      return;
    }

    Number.isNaN = require('core-js/es/number/is-nan');
  })();

  (function checkNumberIsInteger() {
    if (Number.isInteger) {
      return;
    }

    Number.isInteger = require('core-js/es/number/is-integer');
  })();

  (function checkPromise() {
    if (globalScope.Promise && globalScope.Promise.prototype && globalScope.Promise.prototype.finally) {
      return;
    }

    globalScope.Promise = require('core-js/es/promise/index');
  })();

  (function checkURL() {
    globalScope.URL = require('core-js/web/url');
  })();

  (function checkWeakMap() {
    if (globalScope.WeakMap) {
      return;
    }

    globalScope.WeakMap = require('core-js/es/weak-map/index');
  })();

  (function checkWeakSet() {
    if (globalScope.WeakSet) {
      return;
    }

    globalScope.WeakSet = require('core-js/es/weak-set/index');
  })();

  (function checkStringCodePointAt() {
    if (String.prototype.codePointAt) {
      return;
    }

    require('core-js/es/string/code-point-at');
  })();

  (function checkStringFromCodePoint() {
    if (String.fromCodePoint) {
      return;
    }

    String.fromCodePoint = require('core-js/es/string/from-code-point');
  })();

  (function checkSymbol() {
    if (globalScope.Symbol) {
      return;
    }

    require('core-js/es/symbol/index');
  })();

  (function checkStringPadStart() {
    if (String.prototype.padStart) {
      return;
    }

    require('core-js/es/string/pad-start');
  })();

  (function checkStringPadEnd() {
    if (String.prototype.padEnd) {
      return;
    }

    require('core-js/es/string/pad-end');
  })();

  (function checkObjectValues() {
    if (Object.values) {
      return;
    }

    Object.values = require('core-js/es/object/values');
  })();
}