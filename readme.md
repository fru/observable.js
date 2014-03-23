observable.js
=============

[![Coverage Status](https://coveralls.io/repos/fru/observable.js/badge.png?branch=master)](https://coveralls.io/r/fru/observable.js?branch=master)

Observable.js is a tiny library (gzipped less then 1.4KB) that makes knockout's gorgeous observables available, without the bloat of whole knockout.js framework. It supports subscribable, observable and computable.

This is designed for maximum compatibility and runs successfully against knockout's own unit test specification.

```javascript
var knockout = ko.observable("Knockout.js");
var rocks    = ko.computed(function(){
    console.log( knockout() + " rocks!" );
});
// Prints "Knockout.js rocks!"

knockout("Observable.js");
// Prints "Observable.js rocks!"
```

I developed this to embed observables into my own js integration testing framework - surely you can imagine other places where some observables might be usefull :-)



