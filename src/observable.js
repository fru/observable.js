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
   * callback parameter is called with the here specified context.  
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
  this.makeSubscribable = function(target){
    for(var i in this)target[i] = this[i];
    target.constructor = Subscribable;
    return target;
  };

  /**
   * Returns the number of subscriptions for every event name.
   * @return {Integer} # of subscriptions on this object
   */
  this.getSubscriptionsCount = function(){
    var count = 0;
    for(var i in _dependencies)count += _dependencies[i].length;
    return count;
  }
}

/**
 * [isSubscribable description]
 * @param  {[type]}  possible [description]
 * @return {Boolean}          [description]
 */
Subscribable.isSubscribable = function(possible){
  if(!possible)return false;
  return possible instanceof Subscribable || possible.constructor === Subscribable;
}

/**
 * Can be used to extend all Subscribable objects.
 */
Subscribable.fn = Subscribable.prototype = {};





function observable(options){
  var getter = options.read,
      setter = options.write,
      defer  = options.deferEvaluation ,
      owner  = options.owner;
  
  if(typeof setter !== "function")setter = null;
  if(typeof getter !== "function")throw "Parameter options.read musst be a function.";
  
  if(!observable._stack)observable._stack = [];
  function addDependency(value){
    var length = observable._stack.length;
    if(length < 1)return;
    observable._stack[length-1].push(value);
  };
  function findDependencies(func, context, result){
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

if(!window.ko){
	window.ko = {
		subscribable: Subscribable,
		isSubscribable: Subscribable.isSubscribable
	}
}

