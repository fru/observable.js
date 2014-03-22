
(function(global){

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
      if(this.hockNotify){
        this.hockNotify(event === defaultEvent, value, event);
      }
      var dependencies = this.getDependencies()[event] || [];
      try{
        if(this.getter)value = this.getter();
      }finally{
        for(var i = 0; i < dependencies.length; i++){
          if(dependencies[i].disposed){
            dependencies.splice(i, 1);
            i--;
          }else{
            dependencies[i].cb.call(dependencies[i].context, value);
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
      for(var i in dependencies)count += dependencies[i].length;
      return count;
    }
  }


  var stack = [];
  function recordDependency(dependency){
    var length = stack.length;
    var last = length > 0 ? stack[length-1] : [];
    if(last && last.observable)console.log(">"+last.observable.value);
    if(last.observable !== dependency)last.push(dependency);
  }
  function recordExecution(func, context, result, observable){
    if(observable.recording)return observable.value;
    result.observable = observable;
    observable.recording = true;
    stack.push(result);
    console.log("Begin " + observable.value);
    try{
      return func.apply(context);
    }finally{
      stack.pop();
      observable.recording = false;
      if(!observable._subs)observable._subs = [];
      for(var j in observable._subs){
        observable._subs[j].dispose();
      }
      for(var i = 0; i < result.length; i++){
        observable._subs.push(result[i].subscribe(function(){
          console.log("found!!!!!!!!! ");
          console.log(result[0]);
          console.log(observable.read());
          global.x = (global.x || 0 ) + 1;
          if(!(global.x > 10))observable.peek();
        }));
      }
      console.log("Fin " + observable.value);
    }
  }



  function Observable(){

    function self(){
      if(arguments.length > 0) {
        self.setter(arguments[0]);
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

    self.setter = function(value){
      if(typeof self.write !== "function")throw "This observable can't be set.";
      self.cached = false;
      var compare = self.equalityComparer;
      if(self.notify === 'always' || !compare || !compare(value, self.value)){
        try{
          self.valueWillMutate();
          self.write.call(self.getContext(),value);
        }finally{
          self.valueHasMutated();
        }
      }
    };

    self.equalityComparer = function(newvalue, oldvalue){
      var isObject = Object.prototype.toString.call(newvalue) === "[object Object]";
      return !isObject && newvalue === oldvalue;
    };

    self.getter = function(){
      recordDependency(self);
      return self.peek();
    };

    self.peek = function(){
      //if(self.cached)return self.value;
      var dependencies = self.dependencies = [];
      self.cached = true;
      self.value = recordExecution(self.read, self.getContext(), dependencies, self);
      return self.value;
    };

    self.getContext = function(){
      return self.owner === undefined ? global : self.owner;
    };

    self.hockNotify = function(isDefaultEvent){
      //var d = self.dependencies;
      //if(isDefaultEvent)for(var i in d)d[i].cached = false;
    };

    /**
     * Inheritance
     */

    this.copyProperties(self);
    self.original = this;
    return self;
  }

  function DependentObservable(options, owner){

    if(!options || typeof (options.read || options) !== "function"){
      throw "Function has to be passed."
    }

    if (!(this instanceof DependentObservable)){
      return new DependentObservable(options, owner);
    }

    var self = Observable.call(this);

    if(options.read){
      self.extend(options);
    }else{
      self.read = options;
      self.owner = owner;
    }

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
   * Return a result object 
   */
  global.ko = {
    subscribable: Subscribable,
    isSubscribable: buildCheckType(Subscribable),
    observable: function(initial){
      var self = new Observable();
      self.value = initial;
      self.read  = function(){return self.value;};
      self.write = function(param){self.value = param;};
      return self;
    },
    dependentObservable: DependentObservable,
    computed: DependentObservable,
    isComputed: buildCheckType(DependentObservable),
    isObservable: buildCheckType(Observable),
    isWriteableObservable: buildCheckType(Observable, function(self){return !!self.write;})
  };


  /**
   * Prototype hirarchy
   */
  Subscribable.fn = Subscribable.prototype = {};
  global.ko.observable.fn = Observable.prototype = new Subscribable();
  DependentObservable.prototype = new Observable().original; 

})(window);









      /*defer  = options.deferEvaluation ,
      owner  = options.owner,
      type   = options.type;*/ // computed, array on result

  //result.writable when !!setter
  
  // dont chnage when newValue === oldValue
  // see notify 'always' propertie on observable 
  // add extend shim to qunit.html
  // change for equal object except when equalityComparer === func && return true
  // 
  // result.notifySubscribers (can be set) resolved for every call
  // 
  //  ko.subscribable.fn or ko.observable.fn musst be inherited 
  //  
  //  chaning syntax on write calls
  
  // beforeChange send event




