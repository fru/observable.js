/**
 * Subscribable Objects implement the publish-subscribe pattern.
 * @constructor 
 */
function Subscribable(options){

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
    var dependencie = {cb: cb, context: context};   
    (_dependencies[event] || (_dependencies[event] = [])).push(dependencie);
    function dispose(){ dependencie.disposed = true; };
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



function Observable(options){


  var value;
  if()
  //read property is function
  //typeof options === "function" 
  //otherwise default getter and setter
  
  var setter = options.setter;
  
  this._lastvalue = null;
  this.accessor = 

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
 * Fix the prototype hirarchy and define a type checking functions
 */
Subscribable.fn = Subscribable.prototype = {};
Subscribable.isSubscribable = buildCheckType(Subscribable);




function buildObservable(options){
  var getter = options.read,
      setter = options.write,
      defer  = options.deferEvaluation ,
      owner  = options.owner,
      type   = options.type; // computed, array on result
  
  if(typeof setter !== "function")setter = null;
  if(typeof getter !== "function")throw "Parameter options.read musst be a function.";

  //result.writable when !!setter
  //result.valueHasMutated() -> notifySubscribers event: change
  //result.valueWillMutate() -> notifySubscribers event: beforeChange
  
  // dont chnage when newValue === oldValue
  // see notify 'always' propertie on observable 
  // add extend shim to qunit.html
  // change for equal object except when equalityComparer === func && return true
  // 
  // result.notifySubscribers resolved for every call
  // 
  //  ko.subscribable.fn or ko.observable.fn musst be inherited 
  //  
  //  chaning syntax on write calls
  
  
  if(!observable._stack)observable._stack = [];
  function addDependency(value){
    var length = observable._stack.length;
    if(length < 1)return;
    observable._stack[length-1].push(value);
  };

  function findDependencies(func, context, result){
    // dont start evaluating twice on the same element
    observable._stack.push(result);
    try{
      return func.apply(context);
    }finally{
      observable._stack.pop();
    }
  };
  
  var _lastvalue, _hasvalue, _detected = [];
  function result(){
    if(arguments.length > 0){
      if(!setter)throw "This observable can't be set.";
      try{
        _hasvalue = false;
        return setter(arguments[0]);
      }finally{
        //beforeChange
        result.notifySubscribers();
      }
    }
    if(_hasvalue)return _lastvalue;
    result.evalute();
  };
  result.evalute = function(){
    if(owner === true)owner = this;
    addDependency(result);
    var dependencies = _detected = [];
    _lastvalue = findDependencies(getter, owner, dependencies);
    _hasvalue = true;
  }
  result.hockNotifySubscribers = function(isDefaultEvent){
    if(isDefaultEvent)for(var i in _detected)_detected[i].evalute();
  }
  return new Subscribable(options).makeSubscribable(result);
}




function observable(initial){


}




if(!window.ko){
	window.ko = {
		subscribable: Subscribable,
		isSubscribable: Subscribable.isSubscribable,
    observable: function(initial){


    }
	}
}
