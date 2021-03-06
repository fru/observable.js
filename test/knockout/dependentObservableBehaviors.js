
pavlov.specify("Observable.js", function(){

describe('Dependent Observable', function() {
    it('Should be subscribable', function () {
        var instance = new ko.dependentObservable(function () { });
        assert(ko.isSubscribable(instance)).toEqual(true);
    });

    it('Should advertise that instances are observable', function () {
        var instance = new ko.dependentObservable(function () { });
        assert(ko.isObservable(instance)).toEqual(true);
    });

    it('Should advertise that instances are computed', function () {
        var instance = new ko.dependentObservable(function () { });
        assert(ko.isComputed(instance)).toEqual(true);
    });

    it('Should advertise that instances cannot have values written to them', function () {
        var instance = new ko.dependentObservable(function () { });
        assert(ko.isWriteableObservable(instance)).toEqual(false);
    });

    it('Should require an evaluator function as constructor param', function () {
        var threw = false;
        try { var instance = new ko.dependentObservable(); }
        catch (ex) { threw = true; }
        assert(threw).toEqual(true);
    });

    it('Should be able to read the current value of the evaluator function', function () {
        var instance = new ko.dependentObservable(function () { return 123; });
        assert(instance()).toEqual(123);
    });

    it('Should not be able to write a value to it if there is no "write" callback', function () {
        var instance = new ko.dependentObservable(function () { return 123; });

        var threw = false;
        try { instance(456); }
        catch (ex) { threw = true; }

        assert(instance()).toEqual(123);
        assert(threw).toEqual(true);
    });

    it('Should invoke the "write" callback, where present, if you attempt to write a value to it', function() {
        var invokedWriteWithValue, invokedWriteWithThis;
        var instance = new ko.dependentObservable({
            read: function() {},
            write: function(value) { invokedWriteWithValue = value; invokedWriteWithThis = this; }
        });

        var someContainer = { depObs: instance };
        someContainer.depObs("some value");
        assert(invokedWriteWithValue).toEqual("some value");
        assert(invokedWriteWithThis).toEqual(function(){return this;}.call()); // Since no owner was specified
    });

    it('Should be able to write to multiple computed properties on a model object using chaining syntax', function() {
        var model = {
            prop1: ko.computed({
                read: function(){},
                write: function(value) {
                    assert(value).toEqual("prop1");
                } }),
            prop2: ko.computed({
                read: function(){},
                write: function(value) {
                    assert(value).toEqual("prop2");
                } })
        };
        model.prop1('prop1').prop2('prop2');
    });

    it('Should be able to use Function.prototype methods to access/update', function() {
        var instance = ko.computed({read: function() {return 'A'}, write: function(value) {}});
        var obj = {};

        assert(instance.call(null)).toEqual('A');
        assert(instance.apply(null, [])).toBe('A');
        assert(instance.call(obj, 'B')).toBe(obj);
    });

    it('Should use options.owner as "this" when invoking the "write" callback, and can pass multiple parameters', function() {
        var invokedWriteWithArgs, invokedWriteWithThis;
        var someOwner = {};
        var instance = new ko.dependentObservable({
            read: function() {},
            write: function() { invokedWriteWithArgs = Array.prototype.slice.call(arguments, 0); invokedWriteWithThis = this; },
            owner: someOwner
        });

        instance("first", 2, ["third1", "third2"]);
        assert(invokedWriteWithArgs.length).toEqual(3);
        assert(invokedWriteWithArgs[0]).toEqual("first");
        assert(invokedWriteWithArgs[1]).toEqual(2);
        assert(invokedWriteWithArgs[2]).toEqual(["third1", "third2"]);
        assert(invokedWriteWithThis).toEqual(someOwner);
    });

    it('Should use the second arg (evaluatorFunctionTarget) for "this" when calling read/write if no options.owner was given', function() {
        var assertedThis = {}, actualReadThis, actualWriteThis;
        var instance = new ko.dependentObservable({
            read: function() { actualReadThis = this },
            write: function() { actualWriteThis = this }
        }, assertedThis);

        instance("force invocation of write");

        assert(actualReadThis).toEqual(assertedThis);
        assert(actualWriteThis).toEqual(assertedThis);
    });

    it('Should be able to pass evaluator function using "options" parameter called "read"', function() {
        var instance = new ko.dependentObservable({
            read: function () { return 123; }
        });
        assert(instance()).toEqual(123);
    });

    it('Should cache result of evaluator function and not call it again until dependencies change', function () {
        var timesEvaluated = 0;
        var instance = new ko.dependentObservable(function () { timesEvaluated++; return 123; });
        assert(instance()).toEqual(123);
        assert(instance()).toEqual(123);
        assert(timesEvaluated).toEqual(1);
    });

    it('Should automatically update value when a dependency changes', function () {
        var observable = new ko.observable(1);
        var depedentObservable = new ko.dependentObservable(function () { return observable() + 1; });
        assert(depedentObservable()).toEqual(2);
        observable(50);
        assert(depedentObservable()).toEqual(51);
    });

    it('Should be able to use \'peek\' on an observable to avoid a dependency', function() {
        var observable = ko.observable(1),
            computed = ko.dependentObservable(function () { return observable.peek() + 1; });
        assert(computed()).toEqual(2);

        observable(50);
        assert(computed()).toEqual(2);    // value wasn't changed
    });

    it('Should unsubscribe from previous dependencies each time a dependency changes', function () {
        var observableA = new ko.observable("A");
        var observableB = new ko.observable("B");
        var observableToUse = "A";
        var timesEvaluated = 0;
        var depedentObservable = new ko.dependentObservable(function () {
            timesEvaluated++;
            return observableToUse == "A" ? observableA() : observableB();
        });

        assert(depedentObservable()).toEqual("A");
        assert(timesEvaluated).toEqual(1);

        // Changing an unrelated observable doesn't trigger evaluation
        observableB("B2");
        assert(timesEvaluated).toEqual(1);

        // Switch to other observable
        observableToUse = "B";
        observableA("A2");
        assert(depedentObservable()).toEqual("B2");
        assert(timesEvaluated).toEqual(2);

        // Now changing the first observable doesn't trigger evaluation
        observableA("A3");
        assert(timesEvaluated).toEqual(2);
    });

    it('Should notify subscribers of changes', function () {
        var notifiedValue;
        var observable = new ko.observable(1);
        var depedentObservable = new ko.dependentObservable(function () { return observable() + 1; });
        depedentObservable.subscribe(function (value) { notifiedValue = value; });

        assert(notifiedValue).toEqual(undefined);
        observable(2);
        assert(notifiedValue).toEqual(3);
    });

    it('Should notify "beforeChange" subscribers before changes', function () {
        var notifiedValue;
        var observable = new ko.observable(1);
        var depedentObservable = new ko.dependentObservable(function () { return observable() + 1; });
        depedentObservable.subscribe(function (value) { notifiedValue = value; }, null, "beforeChange");

        assert(notifiedValue).toEqual(undefined);
        observable(2);
        assert(notifiedValue).toEqual(2);
        assert(depedentObservable()).toEqual(3);
    });

    it('Should only update once when each dependency changes, even if evaluation calls the dependency multiple times', function () {
        var notifiedValues = [];
        var observable = new ko.observable();
        var depedentObservable = new ko.dependentObservable(function () { return observable() * observable(); });
        depedentObservable.subscribe(function (value) { notifiedValues.push(value); });
        observable(2);
        assert(notifiedValues.length).toEqual(1);
        assert(notifiedValues[0]).toEqual(4);
    });

    it('Should be able to chain dependentObservables', function () {
        var underlyingObservable = new ko.observable(1);
        var dependent1 = new ko.dependentObservable(function () { return underlyingObservable() + 1; });
        var dependent2 = new ko.dependentObservable(function () { return dependent1() + 1; });
        assert(dependent2()).toEqual(3);

        underlyingObservable(11);
        assert(dependent2()).toEqual(13);
    });

    it('Should be able to use \'peek\' on a computed observable to avoid a dependency', function () {
        var underlyingObservable = new ko.observable(1);
        var computed1 = new ko.dependentObservable(function () { return underlyingObservable() + 1; });
        var computed2 = new ko.dependentObservable(function () { return computed1.peek() + 1; });
        assert(computed2()).toEqual(3);
        assert(computed2.isActive()).toEqual(false);

        underlyingObservable(11);
        assert(computed2()).toEqual(3);    // value wasn't changed
    });

    it('Should accept "owner" parameter to define the object on which the evaluator function should be called', function () {
        var model = new (function () {
            this.greeting = "hello";
            this.fullMessageWithoutOwner = new ko.dependentObservable(function () { return this.greeting + " world" });
            this.fullMessageWithOwner = new ko.dependentObservable(function () { return this.greeting + " world" }, this);
        })();
        assert(model.fullMessageWithoutOwner()).toEqual("undefined world");
        assert(model.fullMessageWithOwner()).toEqual("hello world");
    });

    it('Should dispose and not call its evaluator function when the disposeWhen function returns true', function () {
        var underlyingObservable = new ko.observable(100);
        var timeToDispose = false;
        var timesEvaluated = 0;
        var dependent = new ko.dependentObservable(
            function () { timesEvaluated++; return underlyingObservable() + 1; },
            null,
            { disposeWhen: function () { return timeToDispose; } }
        );
        assert(timesEvaluated).toEqual(1);
        assert(dependent.getDependenciesCount()).toEqual(1);
        assert(dependent.isActive()).toEqual(true);

        timeToDispose = true;
        underlyingObservable(101);
        assert(timesEvaluated).toEqual(1);
        assert(dependent.getDependenciesCount()).toEqual(0);
        assert(dependent.isActive()).toEqual(false);
    });

    it('Should dispose itself as soon as disposeWhen returns true, as long as it isn\'t waiting for a DOM node to be removed', function() {
        var underlyingObservable = ko.observable(100),
            dependent = ko.dependentObservable(
                underlyingObservable,
                null,
                { disposeWhen: function() { return true; } }
            );

        assert(underlyingObservable.getSubscriptionsCount()).toEqual(0);
        assert(dependent.isActive()).toEqual(false);
    });

    /*
        NO DOM Support

     it('Should delay disposal until after disposeWhen returns false if it is waiting for a DOM node to be removed', function() {
        var underlyingObservable = ko.observable(100),
            shouldDispose = true,
            dependent = ko.dependentObservable(
                underlyingObservable,
                null,
                { disposeWhen: function() { return shouldDispose; }, disposeWhenNodeIsRemoved: true }
            );

        // Even though disposeWhen returns true, it doesn't dispose yet, because it's
        // asserting an initial 'false' result to indicate the DOM node is still in the document
        assert(underlyingObservable.getSubscriptionsCount()).toEqual(1);
        assert(dependent.isActive()).toEqual(true);

        // Trigger the false result. Of course it still doesn't dispose yet, because
        // disposeWhen says false.
        shouldDispose = false;
        underlyingObservable(101);
        assert(underlyingObservable.getSubscriptionsCount()).toEqual(1);
        assert(dependent.isActive()).toEqual(true);

        // Now trigger a true result. This time it will dispose.
        shouldDispose = true;
        underlyingObservable(102);
        assert(underlyingObservable.getSubscriptionsCount()).toEqual(0);
        assert(dependent.isActive()).toEqual(false);
    });*/

    it('Should describe itself as active if the evaluator has dependencies on its first run', function() {
        var someObservable = ko.observable('initial'),
            dependentObservable = new ko.dependentObservable(function () { return someObservable(); });
        assert(dependentObservable.isActive()).toEqual(true);
    });

    it('Should describe itself as inactive if the evaluator has no dependencies on its first run', function() {
        var dependentObservable = new ko.dependentObservable(function () { return 123; });
        assert(dependentObservable.isActive()).toEqual(false);
    });

    it('Should describe itself as inactive if subsequent runs of the evaluator result in there being no dependencies', function() {
        var someObservable = ko.observable('initial'),
            shouldHaveDependency = true,
            dependentObservable = new ko.dependentObservable(function () { return shouldHaveDependency && someObservable(); });
        assert(dependentObservable.isActive()).toEqual(true);

        // Trigger a refresh
        shouldHaveDependency = false;
        someObservable('modified');
        assert(dependentObservable.isActive()).toEqual(false);
    });

    it('Should advertise that instances *can* have values written to them if you supply a "write" callback', function() {
        var instance = new ko.dependentObservable({
            read: function() {},
            write: function() {}
        });
        assert(ko.isWriteableObservable(instance)).toEqual(true);
    });

    it('Should allow deferring of evaluation (and hence dependency detection)', function () {
        var timesEvaluated = 0;
        var instance = new ko.dependentObservable({
            read: function () { timesEvaluated++; return 123 },
            deferEvaluation: true
        });
        assert(timesEvaluated).toEqual(0);
        assert(instance()).toEqual(123);
        assert(timesEvaluated).toEqual(1);
    });

    it('Should perform dependency detection when subscribed to when constructed with "deferEvaluation"', function() {
        var data = ko.observable(1),
            computed = ko.computed({ read: data, deferEvaluation: true }),
            result = ko.observable();

        // initially computed has no dependencies since it has not been evaluated
        assert(computed.getDependenciesCount()).toEqual(0);

        // Now subscribe to computed
        computed.subscribe(result);

        // The dependency should now be tracked
        assert(computed.getDependenciesCount()).toEqual(1);

        // But the subscription should not have sent down the initial value
        assert(result()).toEqual(undefined);

        // Updating data should trigger the subscription
        data(42);
        assert(result()).toEqual(42);
    });

    it('Should prevent recursive calling of read function', function() {
        var observable = ko.observable(0),
            computed = ko.dependentObservable(function() {
                // this both reads and writes to the observable
                // will result in errors like "Maximum call stack size exceeded" (chrome)
                // or "Out of stack space" (IE) or "too much recursion" (Firefox) if recursion
                // isn't prevented
                observable(observable() + 1);
                return observable();
            });
        assert(computed()).toEqual(1);
    });

    it('Should not subscribe to observables accessed through change notifications of a computed', function() {
        // See https://github.com/SteveSanderson/knockout/issues/341
        var observableDependent = ko.observable(),
            observableIndependent = ko.observable(),
            computed = ko.computed(function() { return observableDependent() });

        // initially there is only one dependency
        assert(computed.getDependenciesCount()).toEqual(1);

        // create a change subscription that also accesses an observable
        computed.subscribe(function() { observableIndependent() });
        // now trigger evaluation of the computed by updating its dependency
        observableDependent(1);
        // there should still only be one dependency
        assert(computed.getDependenciesCount()).toEqual(1);

        // also test with a beforeChange subscription
        computed.subscribe(function() { observableIndependent() }, null, 'beforeChange');
        observableDependent(2);
        assert(computed.getDependenciesCount()).toEqual(1);
    });

    it('Should not subscribe to observables accessed through change notifications of a modified observable', function() {
        // See https://github.com/SteveSanderson/knockout/issues/341
        var observableDependent = ko.observable(),
            observableIndependent = ko.observable(),
            observableModified = ko.observable(),
            computed = ko.computed(function() { observableModified(observableDependent()) });

        // initially there is only one dependency
        assert(computed.getDependenciesCount()).toEqual(1);

        // create a change subscription that also accesses an observable
        observableModified.subscribe(function() { observableIndependent() });
        // now trigger evaluation of the computed by updating its dependency
        observableDependent(1);
        // there should still only be one dependency
        assert(computed.getDependenciesCount()).toEqual(1);

        // also test with a beforeChange subscription
        observableModified.subscribe(function() { observableIndependent() }, null, 'beforeChange');
        observableDependent(2);
        assert(computed.getDependenciesCount()).toEqual(1);
    });

    it('Should be able to re-evaluate a computed that previously threw an exception', function() {
        var observableSwitch = ko.observable(true), observableValue = ko.observable(1),
            computed = ko.computed(function() {
                if (!observableSwitch()) {
                    throw Error("Error during computed evaluation");
                } else {
                    return observableValue();
                }
            });

        // Initially the computed evaluated sucessfully
        assert(computed()).toEqual(1);

        assert(function () {
            // Update observable to cause computed to throw an exception
            observableSwitch(false);
        }).toThrow("Error during computed evaluation");

        // The value of the computed is now undefined, although currently it keeps the previous value
        assert(computed()).toEqual(1);
        // The computed should not be dependent on the second observable
        assert(computed.getDependenciesCount()).toEqual(1);

        // Updating the second observable shouldn't re-evaluate computed
        observableValue(2);
        assert(computed()).toEqual(1);

        // Update the first observable to cause computed to re-evaluate
        observableSwitch(1);
        assert(computed()).toEqual(2);
    });

    it('Should expose a "notify" extender that can configure a computed to notify on all changes', function() {
        var notifiedValues = [];
        var observable = new ko.observable(1);
        var computed = new ko.computed(function () { return observable(); });
        computed.subscribe(function (value) { notifiedValues.push(value); });

        assert(notifiedValues).toEqual([]);

        // Trigger update without changing value; the computed will not notify the change (default behavior)
        observable.valueHasMutated();
        assert(notifiedValues).toEqual([]);

        // Set the computed to notify always
        computed.extend({ notify: 'always' });
        observable.valueHasMutated();
        assert(notifiedValues).toEqual([1]);
    });

    // Borrowed from haberman/knockout (see knockout/knockout#359)
    it('Should allow long chains without overflowing the stack', function() {
        // maximum with previous code (when running this test only): Chrome 28: 1310, IE 10: 2200; FF 23: 103
        // maximum with changed code: Chrome 28: 2620, +100%, IE 10: 4900, +122%; FF 23: 267, +160%
        var depth = 200;
        var first = ko.observable(0);
        var last = first;
        for (var i = 0; i < depth; i++) {
            (function() {
                var l = last;
                last = ko.computed(function() { return l() + 1; });
            })();
        }
        var all = ko.computed(function() { return last() + first(); });
        first(1);
        assert(all()).toEqual(depth+2);
    });

    describe('fn inheritance', function(){
        after(function() {
            delete ko.subscribable.fn.customProp;       // Will be able to reach this
            delete ko.subscribable.fn.customFunc;       // Overridden on ko.computed.fn
            delete ko.computed.fn.customFunc;         // Will be able to reach this
        });

        it('Should inherit any properties defined on ko.subscribable.fn or ko.computed.fn', function() {

            ko.subscribable.fn.customProp = 'subscribable value';
            ko.subscribable.fn.customFunc = function() { throw new Error('Shouldn\'t be reachable') };
            ko.computed.fn.customFunc = function() { return this(); };

            var instance = ko.computed(function() { return 123; });
            assert(instance.customProp).toEqual('subscribable value');
            assert(instance.customFunc()).toEqual(123);
        });
    });

    
    /*
        __proto__ nerver supported

    it('Should have access to functions added to "fn" on existing instances on supported browsers', function () {
        // On unsupported browsers, there's nothing to test
        if (!jasmine.browserSupportsProtoAssignment) {
            return;
        }

        this.after(function() {
            delete ko.subscribable.fn.customFunction1;
            delete ko.computed.fn.customFunction2;
        });

        var computed = ko.computed(function () {});

        var customFunction1 = function () {};
        var customFunction2 = function () {};

        ko.subscribable.fn.customFunction1 = customFunction1;
        ko.computed.fn.customFunction2 = customFunction2;

        assert(computed.customFunction1).toBe(customFunction1);
        assert(computed.customFunction2).toBe(customFunction2);
    });

    */
    it('Should not evaluate (or add dependencies) after it has been disposed', function () {
        var evaluateCount = 0,
            observable = ko.observable(0),
            computed = ko.computed(function () {
                return ++evaluateCount + observable();
            });

        assert(evaluateCount).toEqual(1);
        computed.dispose();

        // This should not cause a new evaluation
        observable(1);
        assert(evaluateCount).toEqual(1);
        assert(computed()).toEqual(1);
        assert(computed.getDependenciesCount()).toEqual(0);
    });

    it('Should not evaluate (or add dependencies) after it has been disposed if created with "deferEvaluation"', function () {
        var evaluateCount = 0,
            observable = ko.observable(0),
            computed = ko.computed({
                read: function () {
                    return ++evaluateCount + observable();
                },
                deferEvaluation: true
            });

        assert(evaluateCount).toEqual(0);
        computed.dispose();

        // This should not cause a new evaluation
        observable(1);
        assert(evaluateCount).toEqual(0);
        assert(computed()).toEqual(undefined);
        assert(computed.getDependenciesCount()).toEqual(0);
    });

    it('Should not add dependencies if disposed during evaluation', function () {
        // This is a bit of a contrived example and likely won't occur in any actual applications.
        // A more likely scenario might involve a binding that removes a node connected to the binding,
        // causing the binding's computed observable to dispose.
        // See https://github.com/knockout/knockout/issues/1041
        var evaluateCount = 0,
            observableToTriggerDisposal = ko.observable(false),
            observableGivingValue = ko.observable(0),
            computed = ko.computed(function() {
                if (observableToTriggerDisposal())
                    computed.dispose();
                return ++evaluateCount + observableGivingValue();
            });

        // Check initial state
        assert(evaluateCount).toEqual(1);
        assert(computed()).toEqual(1);
        assert(computed.getDependenciesCount()).toEqual(2);
        assert(observableGivingValue.getSubscriptionsCount()).toEqual(1);

        // Now cause a disposal during evaluation
        observableToTriggerDisposal(true);
        assert(evaluateCount).toEqual(2);
        assert(computed()).toEqual(2);
        assert(computed.getDependenciesCount()).toEqual(0);
        assert(observableGivingValue.getSubscriptionsCount()).toEqual(0);
    });

    describe('Context', function() {
        it('Should accurately report initial evaluation', function() {
            var observable = ko.observable(1),
                evaluationCount = 0,
                computed = ko.computed(function() {
                    ++evaluationCount;
                    observable();   // for dependency
                    return ko.computedContext.isInitial();
                });

            assert(evaluationCount).toEqual(1);     // single evaluation
            assert(computed()).toEqual(true);       // value of isInitial was true

            observable(2);
            assert(evaluationCount).toEqual(2);     // second evaluation
            assert(computed()).toEqual(false);      // value of isInitial was false

            // value outside of computed is undefined
            assert(ko.computedContext.isInitial()).toBeUndefined();
        });

        it('Should accurately report initial evaluation when deferEvaluation is true', function() {
            var observable = ko.observable(1),
                evaluationCount = 0,
                computed = ko.computed(function() {
                    ++evaluationCount;
                    observable();   // for dependency
                    return ko.computedContext.isInitial();
                }, null, {deferEvaluation:true});

            assert(evaluationCount).toEqual(0);     // no evaluation yet
            assert(computed()).toEqual(true);       // first access causes evaluation; value of isInitial was true
            assert(evaluationCount).toEqual(1);     // single evaluation

            observable(2);
            assert(evaluationCount).toEqual(2);     // second evaluation
            assert(computed()).toEqual(false);      // value of isInitial was false
        });

        it('Should accurately report the number of dependencies', function() {
            var observable1 = ko.observable(1),
                observable2 = ko.observable(1),
                evaluationCount = 0,
                computed = ko.computed(function() {
                    ++evaluationCount;
                    // no dependencies at first
                    assert(ko.computedContext.getDependenciesCount()).toEqual(0);
                    // add a single dependency
                    observable1();
                    assert(ko.computedContext.getDependenciesCount()).toEqual(1);
                    // add a second one
                    observable2();
                    assert(ko.computedContext.getDependenciesCount()).toEqual(2);
                    // accessing observable again doesn't affect count
                    observable1();
                    assert(ko.computedContext.getDependenciesCount()).toEqual(2);
                });

            assert(evaluationCount).toEqual(1);     // single evaluation
            assert(computed.getDependenciesCount()).toEqual(2); // matches value from context

            observable1(2);
            assert(evaluationCount).toEqual(2);     // second evaluation
            assert(computed.getDependenciesCount()).toEqual(2); // matches value from context

            // value outside of computed is undefined
            assert(ko.computedContext.getDependenciesCount()).toBeUndefined();
        });
    });
});

});