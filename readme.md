observable.js
=============

[![Coverage Status](https://img.shields.io/badge/coverage-100%-brightgreen.png)](https://coveralls.io/r/fru/observable.js?branch=master)

[![Size](https://img.shields.io/badge/gzipped-1.4kb-brightgreen.png)](
https://coveralls.io/r/fru/observable.js?branch=master)

[![License](https://img.shields.io/badge/license-MIT-blue.png)](
https://coveralls.io/r/fru/observable.js?branch=master)

[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.png)](
https://coveralls.io/r/fru/observable.js?branch=master)

Observable.js is a tiny library (gzipped less then 1.4KB) that makes knockout's gorgeous observables available, without the bloat of the whole knockout.js framework. 

It supports `ko.observable`, `ko.subscribable` and `ko.computed`. Designed for maximum compatibility these run successfully against knockout's own unit test specification.

```javascript
var knockout = ko.observable("Knockout.js");
var rocks    = ko.computed(function(){
    console.log( knockout() + " rocks!" );
});
// Prints "Knockout.js rocks!"

knockout("Observable.js");
// Prints "Observable.js rocks!"
```

This is also great on node just `npm install ko-observable` and you can use it just like in the browser:

```javascript
var ko = require('ko-observable');
```

I developed this to embed observables into my own integration testing framework - surely you can imagine other places where some observables might be useful :-)

