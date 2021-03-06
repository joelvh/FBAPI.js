# FBAPI.js simplifies the Facebook Javascript API

FBAPI.js is a library that adds many helper functions to access the Facebook JavaScript API more easily. 
It takes care of loading the Facebook Javascript SDK for you, 
and lets you access the API without worrying if everything is ready in the background. 
API calls and event subscribing are queued up and fired once the SDK is loaded and initialized (using promises). 

Please look at the FBAPI.js [source](https://raw.github.com/joelvh/FBAPI.js/master/FBAPI.js) file to get more details. 
I will be working on breaking out some of the test functions into separate modules to reduce the core file size.  

[Minified](https://raw.github.com/joelvh/FBAPI.js/master/FBAPI.min.js) version of FBAPI.js is 4.8KB (2.34KB gzipped). 
I'm continuing to reduce the file size.

## Examples

FBAPI.js has a "fluid" API and manages callbacks to make sure FB is loaded (known as "promises"). 
Each method returns a reference to FBAPI, so you can chain method calls if you like.

### Load FBAPI.js and the Facebook SDK

Facebook init options  

     var config = {  
         appId: "1234567"  
     };  
    
FBAPI.js loads the Facebook SDK internally for you. 
No need for adding the "fb-root" DIV tag required by the SDK or loading the [all.js](http://connect.facebook.net/en_US/all.js) library.  

     FBAPI.init(config, function() {  
         //this is a callback that fires when the Facebook SDK is loaded  
     })  

### Session data

The first parameter is optional and can contain a comma-separated list of permissions. 
The callback parameters are the same for FBAPI.logout() and FBAPI.getLoginStatus()  

      FBAPI.login("email,perm2,perm3", function(status, authResponse, error) {  
          //Facebook API responses are parsed into callback parameters  
          if (!error) {  
              //do something  
          }  
      })  

### Get data

FBAPI.js also adds helper methods for profiles, objects, and connections. 
Facebook API responses are broken into callback parameters.

      //FBAPI.getProfile(callback) gets the data for the current user (e.g. FB.api('/me', callback))  
      FBAPI.getProfile(function(data, error) {  
          if (!error) {  
              //do something with the data  
          }  
      })  
  
      //FBAPI.getProfile(id, callback) gets the data for the specific user (e.g. FB.api('/1234567', callback))  
      .getProfile('1234567', function(data, error) {  
          if (!error) {  
              //do something with the data  
          }  
      })  
  
      //FBAPI.getObject(id, callback) gets the data for any object.  
      //It's basically an alias to FBAPI.getProfile, but makes it easier to read when getting a page or object  
      //other than a user.  
      .getObject('1234567', function(data, error) {  
          if (!error) {  
              //do something with the data  
          }  
      })  
  
      //Batching is possible by passing an array of connections to retrieve, (which can include "profile" as well).  
      .get(["profile", "friends", "checkins"], '1234567', function(results, errors) {  
          //"errors" is an array of error responses  
          if (!errors.length) {  
              //"results" is a map of results for each connection specified  
              console.log(results.profile, results.friends, results.checkins);  
          }  
      });  
  

### Binding events

Binding events is done through aliases to FB.Event.subscribe() and FB.Event.unsubscribe().

     FBAPI.bind(eventName, callback);  
     FBAPI.unbind(eventName, callback);  

One of the things that FBAPI.js does is create helper methods to subscribe to events.  They mimic 
the original event name, except for the "auth" events are not prefixed with "auth".

      FBAPI.onStatusChange(function(response) {   
          //handle response for "auth.statusChange" event  
      })  
      .onCommentCreate(function() {  
          //handle response for "comment.create" event  
      })  
  
### FQL queries

FQL queries can be done individually or as a batch.

The second parameter "params" is not required.  The callback receives the results. 
It is possible to get the watchable object back instead of executing the query 
by passing a boolean value of "true" as the fourth parameter.

     //The second parameter can be a single param to the query, or an array of value
     FBAPI.query("SELECT birthday FROM user WHERE uid = {0}", "me()", function(results) {  
         //do something with results  
     });  

Batching queries requires a named map.  The "params" property is not required. 
It is possible to get the watchable object back instead of executing the query 
by passing a boolean value of "true" as the third parameter.

     var queries = {  
         "friends": {  
             query: "SELECT name FROM friend WHERE uid1 = {0}",  
             params: ["me()"]  
         },  
         "checkins": {  
             query: "SELECT coords FROM checkin WHERE author_id = {0}",  
             params: ["me()"]  
         },  
     };  
     FBAPI.query(queries, function(resultMap) {  
         //do something with the data  
         console.log(resultMap.friends, resultMap.checkins);  
     });  

It is possible to nest queries in params, either as single values or in an array of params.  

     var query = "SELECT name FROM friend WHERE uid1 IN {0}";  
     var params = {  
         query: "SELECT coords FROM checkin WHERE author_id = {0}",  
         params: "me()" 
     };  
     FBAPI.query(query, params, function(resultMap) {  
         //do something with the data  
         console.log(resultMap.friends, resultMap.checkins);  
     });  

#### Debugging queries

There is a helper method FBAPI.testResults() which lets you test queries as if calling FBAPI.query() without a callback. 
Results (or error messages) are output to the console.

### Accessing the full Facebook Javascript SDK with promises

The official Facebook Javascript SDK is accessible through the global variable "FB". 
However, to take advantage of the promise architecture of FBAPI.js, you can access the SDK 
through the FBAPI.ready() (or the alias FBAPI.$()) method. This ensures that your call to the API will work, whether or not 
the SDK is loaded yet.

You can simply ensure your code gets a reference to "FB" before it's loaded by calling the helper method with a callback.

    FBAPI.ready(function(FB) {  
        //No matter if the global veriable exists yet, this callback will be fired when it's ready  
    });  

You can access methods on "FB" that will fire when everything's ready.

    //The first parameter is the method, any additional parameters are passed to the method.  
    //In this case, the FB.login() method will be called, passing "callback" and the permissions.  
    FBAPI.ready('login', callback, { scope: permissions });  
    
    //You can access any nested methods on "FB", such as FB.Event.subscribe.  
    FBAPI.ready('Event.subscribe', 'auth.statusChange', callback);  
    
    //The namespace can optionally include the "FB" prefix. This is equivalent to the above.  
    FBAPI.ready('FB.Event.subscribe', 'auth.statusChange', callback);

## Copyright

FBAPI.js was written by [Joel Van Horn](http://twitter.com/joelvh).  You are free to use this library as you please.

Feel free to get in touch with me through GitHub if you have any questions or suggestions.

Let me know what you use FBAPI.js for!



