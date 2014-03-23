test( "Node export worked", function() {
	ok( !!exports.observable, "Observable was found" );
});
test( "Subscription without callback", function() {
	var target = exports.subscribable();
	try{
		target.subscribe();
	}catch(e){
		equal( e.message, "" , "Exception caught" );
	}
	
});