
(function(ko, global){

  if(!ko)return;
  /**
   * Subscribable Objects implement the publish-subscribe pattern.
   * @constructor 
   */
  function Subscribable(){

    /**
     * Subscribable can only be called as a constructor.
     */
    if (!this instanceof Subscribable)return new Subscribable();

    /**
     * This gets the subscribers that were registered with this object. 
     * The event names server as keys here for values which are arrays 
     * containg the subscribers registerd for that event.
     * @type {Object}
     */
    this.getDependencies = function(){
      return this._dependencies || (this._dependencies = {});
    }

    /**
     * The default event indicates that the value has changed.
     * @type {String}
     */
    var defaultEvent = "change";

    /**
     * All subscribers that were registered with the specified event 
     * parameter will be called. When a custome notify function is 
     * needed hockNotify can be defined to execute object specific logic. 
     * @param  {[type]} value - if defined replaced by options.read
     * @param  {[type]} event - when no specified the default is used
     */
    this.notifySubscribers = function(value, event){
      event = event || defaultEvent;
      var dependencies = this.getDependencies()[event] || [];
      try{
        if(this.getter)value = this.getter();
      }finally{
        var length = dependencies.length;
        for(var i = 0; i < length; i++){
          if(!dependencies[i].disposed){
            dependencies[i].cb.call(dependencies[i].context, value);
          }
        }
        for(i = 0; i < length; i++){
          if(dependencies[i].disposed){
            dependencies.splice(i, 1);
            i--; length--;
          } 
        }
      }
    };

    /**
     * Add a subscriber to this object. When notify is executed the 
     * callback parameter is called with the context specified here.  
     * @param  {Function} cb      - the subscription callback
     * @param  {Any}      context - if true replaced with the context that
     *                              subscribe is called with. 
     * @param  {String}   event   - when no specified the default is used
     */
    this.subscribe = function(cb, context, event){
      if(this.deferEvaluation && this.peek)this.peek();
      event = event || defaultEvent;
      if(typeof cb !== "function")throw "First parameter musst be a function.";
      var dependency = {cb: cb, context: context};
      (this.getDependencies()[event] || (this.getDependencies()[event] = [])).push(dependency);
      function dispose(){ dependency.disposed = true; };
      return { dispose: dispose };
    };

    /**
     * This copyies all properties from a subscribable object onto another
     * object, which can then be used just like the original subcriber. This 
     * is needed so that a function may become a subscriber. In the case of
     * a function this can't be done using just prototype.
     * @param  {Any} target - this target will become subscribable
     */
    this.copyProperties = function(target){
      for(var i in this)target[i] = this[i];
      target._clonedFrom = this;
      return target;
    };

    /**
     * Extend via properties 
     * @param  {[type]} properties [description]
     * @return {[type]}            [description]
     */
    this.extend = function(properties){
      for(var i in properties)this[i] = properties[i];
      return this;
    }

    /**
     * Returns the number of subscriptions for the specific event name.
     * @param {String} event - if falsy; all subscriptions are counted
     * @return {Integer} Nr. of subscriptions on this object
     */
    this.getSubscriptionsCount = function(event){
      var count = 0, dependencies = this.getDependencies();
      if(event)return (dependencies[event]||[]).length;
      for(var i in dependencies){
        for(var j in dependencies[i]){
          if(!dependencies[i][j].disposed)count++;
        }
      }
      return count;
    }
  }


  var stack = [];
  function recordDependency(dependency){
    var length = stack.length;
    var last = length > 0 ? stack[length-1] : [];
    if(last.observable !== dependency){
      for(var i in last)if(last[i] === dependency)return;
      last.push(dependency);
    }
  }
  function recordExecution(func, context, observable){
    if(observable.recording || !func)return observable.value;
    var result = [];
    result.observable = observable;
    observable.recording = true;
    stack.push(result);
    var previous = ko.computedContext;
    ko.computedContext = {
      isInitial: function(){return !observable.initialised;},
      getDependenciesCount: function(){return result.length;}
    }
    try{
      return func.apply(context);
    }finally{
      observable.initialised = true;
      ko.computedContext = previous;
      stack.pop();
      observable.recording = false;
      diposeAllDepencies(observable);
      if(!observable.disposed){
        for(var i = 0; i < result.length; i++){
          observable._subs.push(result[i].subscribe(function(){
            observable.peek();
          }));
        }
      }
    }
  }
  function pauseRecording(func, context){
    stack.push([]);
    try{
      func.call(context);
    }finally{
      stack.pop();
    }
  }
  function dependencyCount(observable){
    return (observable._subs||[]).length;
  }
  function diposeAllDepencies(observable){
    for(var i = 0; i < dependencyCount(observable); i++){
      observable._subs[i].dispose();
    }
    observable._subs = [];
  }



  function Observable(){

    function self(){
      if(arguments.length > 0) {
        self.setter(arguments[0], true, arguments);
        return this;
      }else{
        return self.getter();
      }
    };

    self.valueHasMutated = function(){
      self.notifySubscribers(self.value);

    };

    self.valueWillMutate = function(){
      self.notifySubscribers(self.value, "beforeChange");
    };

    self.setter = function(value, write, args){
      var compare = self.equalityComparer;
      if(self.notify === 'always' || !compare || !compare(value, self.value)){
        try{
          pauseRecording(self.valueWillMutate,self);
          if(write && !self.write)throw "This observable can't be set.";
          self.value = value;
          if(write){
            self.write.apply(self.getContext(), args || value); 
          }
        }finally{
          pauseRecording(self.valueHasMutated,self);
        }
      }
    };

    self.equalityComparer = function(newvalue, oldvalue){
      var isObject = Object.prototype.toString.call(newvalue) === "[object Object]";
      return !isObject && newvalue === oldvalue;
    };

    self.getter = function(){
      recordDependency(self);
      if(self.deferEvaluation)self.peek();
      return self.value;
    };

    self.peek = function(){
      self.deferEvaluation = false;
      if(self.disposeWhen && self.disposeWhen())self.dispose();
      if(self.disposed)return;

      var value = recordExecution(self.read, self.getContext(), self);
      self.setter(value);
      return value;
    };

    self.getContext = function(){
      return self.owner === undefined ? global : self.owner;
    };

    self.getDependenciesCount = function(){
      return dependencyCount(self);
    }

    self.isActive = function(){
      return self.getDependenciesCount() > 0;
    }

    self.dispose = function(){
      self.disposed = true;
      diposeAllDepencies(self);
    }

    /**
     * Inheritance
     */

    this.copyProperties(self);
    self.original = this;
    return self;
  }

  function DependentObservable(evaluator, owner, options){
    if (!(this instanceof DependentObservable)){
      return new DependentObservable(evaluator, owner, options);
    }

    if(typeof evaluator !== "function"){
      options = evaluator || {};
      evaluator = options.read;
      if(typeof evaluator !== "function")throw "Function has to be passed.";
    }

    var self = Observable.call(this);

    if(options)self.extend(options);

    if(!self.owner)self.owner = owner;
    self.read = evaluator;

    if(!self.deferEvaluation)self.peek();

    return self;
  }

  /**
   * Utility function that is used to build type checking functions. The resulting 
   * function also checks for necessary properties and also returns true if the
   * copyProperties function was used to instantiate this object.
   * 
   * @param  {Constructor} type to be checked against
   * @return {Function}      
   */
  function buildCheckType(type, check){
    return function(any){
      return !!any 
          && ( any instanceof type || any._clonedFrom instanceof type ) 
          && (!check || check(any));
    };
  }

  /**
   * Set Results
   */
  ko.subscribable = Subscribable;
  ko.isSubscribable = buildCheckType(Subscribable);
  ko.observable = function(initial){
    var self = new Observable();
    self.value = initial;
    self.write = function(){};
    return self;
  };
  ko.computedContext = {
    isInitial: function(){return undefined;},
    getDependenciesCount: function(){return undefined;}
  };
  ko.dependentObservable = DependentObservable;
  ko.computed = DependentObservable;
  ko.isComputed = buildCheckType(DependentObservable);
  ko.isObservable = buildCheckType(Observable);
  ko.isWriteableObservable = buildCheckType(Observable, function(self){return !!self.write;});

  /**
   * Prototype hirarchy
   */
  Subscribable.fn = Subscribable.prototype = {};
  ko.observable.fn = Observable.prototype = new Subscribable();
  DependentObservable.fn = DependentObservable.prototype = new Observable().original; 

})(typeof exports !== 'undefined' ? exports : (window.ko?null:(window.ko={})), typeof exports !== 'undefined' ? exports : window);
