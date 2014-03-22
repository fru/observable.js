
(function(result){

  /**
   * Subscribable Objects implement the publish-subscribe pattern.
   * @constructor 
   */
  function Subscribable(options){

    /**
     * Subscribable can only be called as a constructor.
     */
    if (!this instanceof Subscribable)return new Subscribable(options);

    /**
     * options.read contains a function which will be evaluated when 
     * subscribers need to be notified. The resulting value is passed 
     * to the the subscribers.
     * @type {Function}
     */
    var getter = (options||{}).read;
    if(typeof getter !== "function")getter = null;

    /**
     * This object contains the subscribers that were registered with 
     * this object. The event names server as keys here for values which 
     * are arrays containg the subscribers registerd for that event.
     * @type {Object}
     */
    var _dependencies = {}, 

    /**
     * The default event indicates that the value has changed.
     * @type {String}
     */
    defaultEvent = "change";

    /**
     * All subscribers that were registered with the specified event 
     * parameter will be called. When a custome notify function is 
     * needed hockNotifySubscribers can be defined to execute object 
     * specific logic. 
     * @param  {[type]} value - if defined replaced by options.read
     * @param  {[type]} event - when no specified the default is used
     */
    this.notifySubscribers = function(value, event){
      event = event || defaultEvent;
      if(this.hockNotifySubscribers){
        this.hockNotifySubscribers(event === defaultEvent, value, event);
      }
      var dependencies = _dependencies[event];
      if(!dependencies)return;
      try{
        if(getter)value = getter();
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
      (_dependencies[event] || (_dependencies[event] = [])).push(dependency);
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
     * Returns the number of subscriptions for the specific event name.
     * @param {String} event - if falsy; all subscriptions are counted
     * @return {Integer} Nr. of subscriptions on this object
     */
    this.getSubscriptionsCount = function(event){
      var count = 0;
      if(event)return (_dependencies[event]||[]).length;
      for(var i in _dependencies)count += _dependencies[i].length;
      return count;
    }
  }


  var stack = [];
  function recordDependency(dependency){
    var length = stack.length;
    if(length > 0)stack[length-1].push(dependency);
  }
  function recordExecution(func, context, result, observable){
    if(observable.recording)return observable.value;
    observable.recording = true;
    stack.push(result);
    try{
      return func.apply(context);
    }finally{
      stack.pop();
      observable.recording = false;
    }
  }



  function Observable(options){

    function self(){
      if(arguments.length > 0) {
        self.setter(arguments[0]);
        return this;
      }else{
        return self.getter();
      }
    };

    self.setter = function(value){
      if(typeof self.write !== "function")throw "This observable can't be set.";
      self.cached = false;
      try{
        self.write(value);
      }finally{
        self.notifySubscribers();
      }
    }

    self.getter = function(){
      var context = self.owner === true ? this : self.owner
      if(self.cached)return self.value;
      recordDependency(self);
      var dependencies = self.dependencies = [];
      self.cached = true;
      return self.value = recordExecution(self.read, owner, dependencies, self);
    }

    self.reevalute = function(){
      self.cached = false;
      return this.getter();
    }

    self.hockNotifySubscribers = function(isDefaultEvent){
      var d = self.dependencies;
      if(isDefaultEvent)for(var i in d)d[i].reevalute();
    }

    self.writable = !!self.write;



    /**
     * Normalize options
     */
     /*
    if(typeof options === "function" ){
      self.read = options;
    }else if(!options || typeof options.read !== "function"){
      self.value = options;
      self.read = function(){return self.value;};
      self.write = function(param){self.value = param;};
    }else{
      for(var i in options)if(options.hasOwnProperty(i))self[i] = options[i];
      if(typeof options.write !== "function")options.write = null;
    }

    /**
     * Inheritance
     */

    Subscribable.call(this, options);
    this.copyProperties(self);

    this.accessor = self;
  }


  /**
   * Utility function that is used to build type checking functions. The resulting 
   * function also checks for necessary properties and also returns true if the
   * copyProperties function was used to instantiate this object.
   * 
   * @param  {Constructor} type to be checked against
   * @return {Function}      
   */
  function buildCheckType(type, properties){
    return function(any){
      if(properties){
        for(var i in properties)if(!any || properties[i] !== any[i])any = null;
      }
      return !!any && ( any instanceof type || any._clonedFrom instanceof type );
    };
  }

  /**
   * Prototype hirarchy
   */
  Subscribable.fn = Subscribable.prototype = {};
  Observable.fn = Observable.prototype = new Subscribable();

  result({
    subscribable: Subscribable,
    isSubscribable: buildCheckType(Subscribable),
    observable: function(initial){
      var result = 
      self.value = initial;
      self.read = function(){return self.value;};
      self.write = function(param){self.value = param;};

    }
  });

})(function(result){
  window.ko = result;
});









      /*defer  = options.deferEvaluation ,
      owner  = options.owner,
      type   = options.type;*/ // computed, array on result

  //result.writable when !!setter
  //result.valueHasMutated() -> notifySubscribers event: change
  //result.valueWillMutate() -> notifySubscribers event: beforeChange
  
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




