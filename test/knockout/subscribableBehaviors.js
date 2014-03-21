
pavlov.specify("Observable.js", function(){

describe('Subscribable', function() {
    it('Should declare that it is subscribable', function () {
        var instance = new ko.subscribable();
        assert(ko.isSubscribable(instance)).toEqual(true);
    });

    it('isSubscribable should return false for undefined', function () {
        assert(ko.isSubscribable(undefined)).toEqual(false);
    });

    it('isSubscribable should return false for null', function () {
        assert(ko.isSubscribable(null)).toEqual(false);
    });

    it('Should be able to notify subscribers', function () {
        var instance = new ko.subscribable();
        var notifiedValue;
        instance.subscribe(function (value) { notifiedValue = value; });
        instance.notifySubscribers(123);
        assert(notifiedValue).toEqual(123);
    });

    it('Should be able to unsubscribe', function () {
        var instance = new ko.subscribable();
        var notifiedValue;
        var subscription = instance.subscribe(function (value) { notifiedValue = value; });
        subscription.dispose();
        instance.notifySubscribers(123);
        assert(notifiedValue).toEqual(undefined);
    });

    it('Should be able to specify a \'this\' pointer for the callback', function () {
        var model = {
            someProperty: 123,
            myCallback: function (arg) { assert(arg).toEqual('notifiedValue'); assert(this.someProperty).toEqual(123); }
        };
        var instance = new ko.subscribable();
        instance.subscribe(model.myCallback, model);
        instance.notifySubscribers('notifiedValue');
    });

    it('Should not notify subscribers after unsubscription, even if the unsubscription occurs midway through a notification cycle', function() {
        // This spec represents the unusual case where during notification, subscription1's callback causes subscription2 to be disposed.
        // Since subscription2 was still active at the start of the cycle, it is scheduled to be notified. This spec verifies that
        // even though it is scheduled to be notified, it does not get notified, because the unsubscription just happened.
        var instance = new ko.subscribable();
        var subscription1 = instance.subscribe(function() {
            subscription2.dispose();
        });
        var subscription2wasNotified = false;
        var subscription2 = instance.subscribe(function() {
            subscription2wasNotified = true;
        });

        instance.notifySubscribers('ignored');
        assert(subscription2wasNotified).toEqual(false);
    });

    it('Should be able to notify subscribers for a specific \'event\'', function () {
        var instance = new ko.subscribable();
        var notifiedValue = undefined;
        instance.subscribe(function (value) { notifiedValue = value; }, null, "myEvent");

        instance.notifySubscribers(123, "unrelatedEvent");
        assert(notifiedValue).toEqual(undefined);

        instance.notifySubscribers(456, "myEvent");
        assert(notifiedValue).toEqual(456);
    });

    it('Should be able to unsubscribe for a specific \'event\'', function () {
        var instance = new ko.subscribable();
        var notifiedValue;
        var subscription = instance.subscribe(function (value) { notifiedValue = value; }, null, "myEvent");
        subscription.dispose();
        instance.notifySubscribers(123, "myEvent");
        assert(notifiedValue).toEqual(undefined);
    });

    it('Should be able to subscribe for a specific \'event\' without being notified for the default event', function () {
        var instance = new ko.subscribable();
        var notifiedValue;
        var subscription = instance.subscribe(function (value) { notifiedValue = value; }, null, "myEvent");
        instance.notifySubscribers(123);
        assert(notifiedValue).toEqual(undefined);
    });

    it('Should be able to retrieve the number of active subscribers', function() {
        var instance = new ko.subscribable();
        instance.subscribe(function() { });
        instance.subscribe(function() { }, null, "someSpecificEvent");
        assert(instance.getSubscriptionsCount()).toEqual(2);
    });

    it('Should be possible to replace notifySubscribers with a custom handler', function() {
        var instance = new ko.subscribable();
        var interceptedNotifications = [];
        instance.subscribe(function() { throw new Error("Should not notify subscribers by default once notifySubscribers is overridden") });
        instance.notifySubscribers = function(newValue, eventName) {
            interceptedNotifications.push({ eventName: eventName, value: newValue });
        };
        instance.notifySubscribers(123, "myEvent");

        assert(interceptedNotifications.length).toEqual(1);
        assert(interceptedNotifications[0].eventName).toEqual("myEvent");
        assert(interceptedNotifications[0].value).toEqual(123);
    });

    describe('Should expose the "fn" propertie', function () {

        after(function() {
            delete ko.subscribable.fn.customFunction;
            delete ko.subscribable.fn.customProp;
            delete ko.subscribable.fn.customFunc;
        });

        it('so that it inherits any properties defined on ko.subscribable.fn', function() {
            ko.subscribable.fn.customProp = 'some value';
            ko.subscribable.fn.customFunc = function() { return this; };

            var instance = new ko.subscribable();
            assert(instance.customProp).toEqual('some value');
            assert(instance.customFunc()).toEqual(instance);
        });

        it('so that functions can be added to "fn" on existing instances on supported browsers', function(){
            var subscribable = new ko.subscribable();

            var customFunction = function () {};
            ko.subscribable.fn.customFunction = customFunction;
            assert(subscribable.customFunction).toBe(customFunction);
        })
    });
});

});