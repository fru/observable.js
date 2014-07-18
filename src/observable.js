/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Florian Rueberg
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

 // `Observable.js` is a tiny library (gzipped less then 1.4KB) that makes 
 // knockout's gorgeous observables available, without the bloat of the whole
 // `knockout.js` framework. It supports `ko.observable`, `ko.subscribable` and 
 // `ko.computed`. 

 // Designed for maximum compatibility these run successfully against knockout's
 // own unit test specification. This can also run on `node.js`.

(function(ko, global){

    if(!ko)return;

    // Helper function for type checking

    /**
     * Test if the value is an object.
     * @param {*} value - This is type checked. 
     * @returns {boolean} Returns true if value is an object.
     */
    function isObject(value){
        return Object.prototype.toString.call(value) === '[object Object]';
    }

    /**
     * Test if the value is a function.
     * @param {*} value - This is type checked. 
     * @returns {boolean} Returns true if value is a function.
     */
    function isFunction(value){
        return typeof value === 'function';
    }

    // This is the recorder that makes computables 'magically' work like they
    // do. Every time an observable is read `recordDependency` is call and the
    // observable is pushed on the recordingStack. Using `recordExecution` a
    // computable can now subscribe to any observable that is called during
    // its evaluation. 

    var recordingStack = [];
    
    /**
     * The dependency is pushed to the last array of the recording stack. This
     * is called whenever an observable is read.
     * @param {Subscribable} dependency - This is added to the stack.
     */
    function recordDependency(dependency){
        var length = recordingStack.length;
        var last = length > 0 ? recordingStack[length-1] : [];
        for(var i in last)if(last[i] === dependency)return;
        last.push(dependency);
    }

    /**
     * This is used to compute the value of a computable. This function adds a 
     * subscription to the computable for every observable that is read.
     * @param {function()} func       - The evaluation that is recorded.
     * @param {*} context             - `func` is called with this context.
     * @param {Observable} observable - The observable which is recorded.
     */
    function recordExecution(func, context, observable){
        if(observable.recording || !func)return observable.value;
        var result = [];
        observable.recording = true;
        recordingStack.push(result);
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
            recordingStack.pop();
            observable.recording = false;
            var dependent = [];
            if(!observable._d){ // _d = disposed
                for(var i = 0; i < result.length; i++){
                    dependent.push(result[i].subscribe(function(){
                        observable.peek();
                    }));
                }
            }
            // This also unsubscribes any previous subscriptions.
            observable.setDependent(dependent);
        }
    }

    /**
     * This is used to read observables during the evaluation of a computables 
     * without recording them.
     * @param {function()} func - Function which is not recorded.
     * @param {*} context       - `func` is called with this context.
     */
    function recordIgnoring(func, context){
        recordingStack.push([]);
        try{
            func.call(context);
        }finally{
            recordingStack.pop();
        }
    }



    /**
     * Subscribable Objects implement the publish-subscribe pattern.
     * @constructor 
     */
    function Subscribable(){

        // Makes sure Subscribable is only called as a constructor.

        if (!(this instanceof Subscribable))return new Subscribable();

        /**
         * This gets the subscribers that were registered with this object. 
         * The event names server as keys here for values which are arrays 
         * containg the subscribers registered for that event.
         * @type {Object}
         */
        this.subscribers = function(event){
            var result = this._s || (this._s = {}); // _s = subscribers
            if(event)result = result[event] || (result[event] = []);
            return result;
        }

        /**
         * The default event that indicates the value has changed.
         * @const
         */
        var defaultEvent = 'change';

        /**
         * All subscribers that were registered with the specified event 
         * parameter will be called. When a custom notify function is 
         * needed hockNotify can be defined to execute object specific logic. 
         * @param {*} value      - If defined replaced by options.read.
         * @param {string} event - When no specified the default is used.
         */
        this.notifySubscribers = function(value, event){
            event = event || defaultEvent;
            var dependencies = this.subscribers(event);
            try{
                if(this.getter)value = this.getter();
            }finally{
                var length = dependencies.length;
                for(var i = 0; i < length; i++){
                    if(!dependencies[i]._p){ // _p = dependency disposed
                        dependencies[i].cb.call(dependencies[i].context, value);
                    }
                }
                for(i = 0; i < length; i++){
                    if(dependencies[i]._p){ // _p = dependency disposed
                        dependencies.splice(i, 1);
                        i--; length--;
                    } 
                }
            }
        };

        /**
         * Add a subscriber to this object. When notify is executed the 
         * callback parameter is called with the context specified here.  
         * @param {function(*, *)} cb - The subscription callback.
         * @param {*} context         - Applied to the callback.
         * @param {string} event      - When no specified the default is used.
         */
        this.subscribe = function(cb, context, event){
            if(this.deferEvaluation && this.peek)this.peek();
            event = event || defaultEvent;
            if(!isFunction(cb)){
                throw new Error('Function expected.');
            }
            var dependency = {cb: cb, context: context};
            this.subscribers(event).push(dependency);
            return { dispose: function(){
                dependency._p = true; // _p = dependency disposed
            }};
        };

        /**
         * This copies all properties from a subscribable object onto another
         * object, which can then be used just like the original subscriber. This 
         * is needed so that a function may become a subscriber. In the case of
         * a function this can't be done using just prototype.
         * @param {*} target - This target will become subscribable.
         */
        this.copyProperties = function(target){
            for(var i in this)target[i] = this[i];
            target._clonedFrom = this;
            return target;
        };

        /**
         * Extend this with properties from another object.
         * @param  {Object} properties - Object with properties that are added.
         * @return {*} - This subscribable.
         */
        this.extend = function(properties){
            for(var i in properties)this[i] = properties[i];
            return this;
        }

        /**
         * Returns the number of subscriptions for the specific event name.
         * @return {number} - Number of subscriptions for this subscribable
         */
        this.getSubscriptionsCount = function(){
            var count = 0, dependencies = this.subscribers();
            for(var i in dependencies){
                for(var j in dependencies[i]){
                    if(!dependencies[i][j]._p)count++; // _p = dependency disposed
                }
            }
            return count;
        }
    }

    // This does not directly correspond to `ko.observable`. This is an
    // extended observable that has features of both a `ko.observable` and of
    // `ko.computed.`

    /**
     * Implements the observer pattern.
     * @constructor
     */
    function Observable(){

        /**
         * This is the function that is returned by this constructor. When called
         * it sets the value of the observable.
         */
        function self(){
            if(arguments.length > 0) {
                self.setter(arguments[0], true, arguments);
                return this;
            }else{
                return self.getter();
            }
        };

        /**
         * Notify all subscribers that the value has changed.
         */
        self.valueHasMutated = function(){
            self.notifySubscribers(self.value);
        };

        /**
         * Notify all subscribers that the value is about to change.
         */
        self.valueWillMutate = function(){
            self.notifySubscribers(self.value, 'beforeChange');
        };

        /**
         * Can be used to directly set a value for this observable.
         * @param {*} value        - This is the new value.
         * @param {boolean} write  - Indicates if the write cb should be invoked.
         * @param {Array.<*>} args - The Arguments for the write cb.
         */
        self.setter = function(value, write, args){
            var compare = self.equalityComparer;
            if(self.notify === 'always' || !compare || !compare(value, self.value)){
                try{
                    recordIgnoring(self.valueWillMutate,self);
                    if(write && !self.write){
                        throw new Error('Observable not settable.');
                    }
                    self.value = value;
                    if(write){
                        self.write.apply(self.getContext(), args); 
                    }
                }finally{
                    recordIgnoring(self.valueHasMutated,self);
                }
            }
        };

        /**
         * Default predicate function used to test two objects for equality.
         * @param {*} newvalue - Checked for equality.
         * @param {*} oldvalue - Checked for equality.
         */
        self.equalityComparer = function(newvalue, oldvalue){
            return !isObject(newvalue) && newvalue === oldvalue;
        };

        /**
         * Get the current value of the observable.
         * @return {*} The current value.
         */
        self.getter = function(){
            recordDependency(self);
            if(self.deferEvaluation)self.peek();
            return self.value;
        };

        /**
         * Is used to force the reevaluation of the observable. 
         * @return {*} The new value.
         */
        self.peek = function(){
            self.deferEvaluation = false;
            if(self.disposeWhen && self.disposeWhen())self.dispose();
            if(self._d)return; // _d = diposed

            var value = recordExecution(self.read, self.getContext(), self);
            self.setter(value, false, []);
            return value;
        };

        /**
         * This returns the context with which the setter function will be
         * called.
         * @return {*} The context.
         */
        self.getContext = function(){
            return self.owner === undefined ? global : self.owner;
        };

        /**
         * Manually set the dependencies that were found during the last
         * evaluation. This is also called by the recorder.
         * @param {Array.<Observable>} value - The dependencies.
         */
        self.setDependent = function(value){
            var subs = self._subs;
            if(subs){
                for(var i = 0; i < subs.length; i++){
                    subs[i].dispose();
                }
            }
            self._subs = value;
        };

        /**
         * Get the number of dependencies, which are the observables that were
         * found during the last evaluation of this observable.
         * @return {number} The number of dependencies.
         */
        self.getDependenciesCount = function(){
            return (self._subs||[]).length;
        };

        /**
         * Returns true only if there are dependencies. Dependencies may prompt
         * the computable to reevaluate. 
         * @param {boolean} True, if there are dependencies.
         */
        self.isActive = function(){
            return self.getDependenciesCount() > 0;
        };

        /**
         * Dispose of this computable and clean existing dependencies.
         */
        self.dispose = function(){
            self._d = true; // _d = diposed
            self.setDependent([]);
        };

        // Simulates inheritance: All properties are copied to the self object
        // and that function is returned.

        this.copyProperties(self);
        self.original = this;
        return self;
    }

    /**
     * Implements computables.
     * @constructor
     */
    function Computed(evaluator, owner, options){

        // Makes sure Computed is only called as a constructor.

        if (!(this instanceof Computed)){
            return new Computed(evaluator, owner, options);
        }

        // Normalize the constructor parameters.

        if(!isFunction(evaluator)){
            options = evaluator || {};
            evaluator = options.read;
            if(!isFunction(evaluator))throw new Error('Function expected.');
        }

        // This makes an observable from this

        var self   = Observable.call(this);
        self.owner = owner;
        self.read  = evaluator;
        if(options)self.extend(options);

        // Evaluate the computable if this is not deferred.

        if(!self.deferEvaluation)self.peek();
        return self;
    }

    // Assign the public classes to the ko object.

    ko['subscribable'] = Subscribable;
    ko['computed']     = ko['dependentObservable'] = Computed;
    ko['observable']   = function(initial){
        var self = new Observable();
        self.value = initial;
        self.write = function(){};
        return self;
    };

    // Build the prototype hierarchy for the classes.

    Subscribable.fn  = Subscribable.prototype = {};
    ko.observable.fn = Observable.prototype   = new Subscribable();
    Computed.fn      = Computed.prototype     = new Observable().original; 

    /**
     * Utility function that is used to build type checking functions. The
     * resulting function also checks for necessary properties and also returns
     * true if the copyProperties function was used to instantiate this object.
     * @param  {Constructor} type to be checked against
     * @return {Function}
     */
    function buildCheckType(type, check){
        return function(checked){
            if(!checked || (check && !check(checked)))return false;
            return (checked._clonedFrom || checked) instanceof type;
        };
    }

    // Type checking

    ko['isSubscribable'] = buildCheckType(Subscribable);
    ko['isComputed']     = buildCheckType(Computed);
    ko['isObservable']   = buildCheckType(Observable);

    ko['isWriteableObservable'] = buildCheckType(Observable, function(self){
        return !!self.write;
    });

    // The computed context can be used during the evaluation of a computable
    // to get contextual information.

    ko['computedContext'] = {
        isInitial: function(){return undefined;},
        getDependenciesCount: function(){return undefined;}
    };

})(

// Supports node and the browser

typeof exports !== 'undefined' ? exports : (window['ko']?null:window['ko']={}),
typeof exports !== 'undefined' ? process : window
);
