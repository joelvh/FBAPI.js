/*
 * Date: 8/28/2011
 * Use OAUTH2, old authentication methods are being deprecated:
 * https://developers.facebook.com/blog/post/525/
 * 
 * FB.getSession() is depricated and throws an error when used with OAUTH2
 * - use FB.getLoginStatus() or FBAPI.getLoginStatus() instead
 * 
 */
//scope vars
(function(window, document, undefined) {
  
  ////// Globals //////
  
  var facebook_lib_url = document.location.protocol + "//connect.facebook.net/en_US/all.js",
    facebook_lib_script = document.createElement('SCRIPT')
    responseCache = {},
    //connections to generate helpers such as FBAPI.getAccounts(id,callback)
    //LIST GENERATED: 8/28/2011
    //SOURCE URL: https://developers.facebook.com/docs/reference/api/user/
    facebook_connection_types = [
      'accounts',
      'achievements',
      'activities',
      'albums',
      //camel case for helper method generation, 
      //works with facebook API
      'appRequests',
      'books',
      'checkins',
      'events',
      'family',
      'feed',
      //camel case for helper method generation, 
      //works with facebook API
      'friendLists',
      'friends',
      'games',
      'groups',
      'home',
      'inbox',
      'interests',
      'likes',
      'links',
      'movies',
      'music',
      'notes',
      'notifications',
      'outbox',
      'payments',
      'permissions',
      'photos',
      'picture',
      'pokes',
      'posts',
      'scores',
      'statuses',
      'tagged',
      'television',
      'updates',
      'videos',
      
      //Custom FBAPI connection, used to generate FBAPI.getProfile(id, callback), 
      //not valid with FB.api()
      'profile',
      //Custom FBAPI connection, used to generate FBAPI.getObject(id, callback),
      //which will get any object by ID,
      //not valid with FB.api()
      'object'
    ],
    facebook_api_events = [
      'auth.login',
      'auth.logout',
      'auth.prompt',
      'auth.sessionChange',
      'auth.statusChange',
      'xfbml.render',
      'edge.create',
      'edge.remove',
      'comment.create',
      'comment.remove',
      'auth.authResponseChange',
      'fb.log'
    ],
    defaultOptions = {
      //facebook API options
      appId: "", 
      apiKey: "",
      perms: "",
      status: true, 
      cookie: true,
      xfbml: true,
      oauth: true,
      //tells FBAPI to load facebook API lib async
      async: true,
      //tells FBAPI to load facebook API lib async 
      //and defer execution to keep async scripts executing in order
      defer: false
    },
    //Queue of callbacks to fire once 
    //Facebook Javascript SDK is loaded
    sdkQueue = [],
    sdkLoaded = false,
    sdk = function(methodName) {
      var callback;
      //if it's a function, it's a callback that accepts FB as a param
      if (isFunction(methodName)) {
        callback = methodName;
      } else {
        //remove the first argument (which is methodName)
        var args = argumentsToArray(arguments);
        args.shift();
        //Create a callback that is fired on the specified FB method.
        callback = function(FB) {
          //The method could include namespace, such as "Event.subscribe" 
          //or "FB.Event.subscribe", so we split on "." and navigate through FB.
          var names = methodName.replace(/^FB\./i, "").split("."),
            target = FB;
          //The last name in the namespace is the method name (e.g. "subscribe")
          methodName = names.pop();
          //Navigate through remaining namespace
          each(names, function(index, name) {
            target = target[name];
          });
          //Call the method as if it was called directly.
          target[methodName].apply(target, args);
        }
      }
      if (!sdkLoaded) {
        sdkQueue.push(callback);
      } else {
        callback(FB);
      }
    },
    initialized = false;
    
  ////// Init FBAPI //////
  
  //FB init configuration info
  var FBAPI = {
    //Facebook configuration options, along with some FBAPI ones 
    //which are stored here when FBAPI.init() is called
    config: null,
    // If a callback is specified, FB.getLoginStatus() is called 
    // and the status and auth data is passed back
    // - options = { appId, apiKey, perms }
    // - callback = function(status, authResponse) { /*callback code*/ }
    init: function (options, callback) {
      if (initialized) {
        return FBAPI;
      }
      
      //extend options to make sure all properties are present
      FBAPI.config = options = extend(options, defaultOptions);
      
      //set Facebook Javascript SDK callback to fire when 
      //the script library loads
      window.fbAsyncInit = function() {
        //remove script tag
        facebook_lib_script.parentNode.removeChild(facebook_lib_script);
        
        //initialize Facebook Javascript SDK
        FB.init(options);
        
        //loop through callbacks there were queued 
        //before Facebook Javascript SDK was loaded
        while (sdkQueue.length) {
          sdkQueue.shift()(FB);
        }
        
        sdkLoaded = true;

        //fire callback and pass session data if there is any
        if (callback) {
          FBAPI.getLoginStatus(callback);
        }
      }
      
      //Facebook's SDK requires <div id="fb-root"></div> before loading
      if (!document.getElementById('fb-root')) {
        var fbRoot = document.createElement('DIV');
        fbRoot.id = 'fb-root';
        document.body.appendChild(fbRoot);
      }
      
      //create script tag to load Facebook Javascript SDK
      facebook_lib_script.src = facebook_lib_url;
      options.async && (facebook_lib_script.async = true);
      options.defer && (facebook_lib_script.defer = true);
      document.getElementsByTagName('HEAD')[0].appendChild(facebook_lib_script);
      
      initialized = true;
      
      return FBAPI;
    },
    //Queues callbacks to be triggered once the Facebook Javascript SDK loads. 
    //Optionally can pass in a method to call on FB and forward the callback
    // - sdk('login', function(response) { /*code*/ });
    //When the method name is not specified, 
    //the callback is triggered with FB as the only parameter
    // - sdk(function(FB) { /*code*/ })
    sdk: sdk,
    //Allows you to chain multiple callbacks together. 
    //The first parameter for each callback is the "next" function 
    //that allows you to pass arguments to the next function.
    //Pass each function that should be a part of the chain 
    //as a parameter to chain.
    chain: function () {
      var steps = Array.prototype.slice.call(arguments),
        next = function() {
          var args = Array.prototype.slice.call(arguments),
            step = steps.shift();
          args.unshift(next);
          step.apply(this, args);
        };
        
      next();
    },
    
    ////// auth functions ///////
    
    //Optionally pass in a comma-separated list of extended permissions.
    //Callback is passed these params: callback(status, session/authResponse, error)
    login: function(perms/*aka perms*/, callback) {
      if (isFunction(perms)) {
        callback = perms;
        perms = null;
      }
      sdk('login', 
        function(response) {
          //"session" is legacy, "authResponse" is OAUTH2
          fireCallbackWithResponseData(callback, response, "status", "authResponse", "error");
        }, (perms) ? {scope: perms} : null);
    },
    logout: function(callback) {
      sdk('logout', 
        function(response) {
          //"session" is legacy, "authResponse" is OAUTH2
          fireCallbackWithResponseData(callback, response, "status", "authResponse", "error");
        });
    },
    //callback(status, session/authResponse, error)
    getLoginStatus: function(callback) {
      sdk('getLoginStatus', 
        function(response) {
          //"session" is legacy, "authResponse" is OAUTH2
          fireCallbackWithResponseData(callback, response, "status", "authResponse", "error");
        });
    },
    //alias for FB.login()
    requestPermission: function(perms, callback) {
      FBAPI.login(perms, callback);
    },
    
    ////// subscribe/unsubscribe aliases renamed from facebook API ////////
    
    bind: function(eventName, callback) {
      sdk('Event.subscribe', eventName, callback);
      
      return FBAPI;
    },
    unbind: function(eventName, callback) {
      sdk(function(FB) {
        if (eventName) {
          FB.Event.unsubscribe(eventName, callback);
        } else {
          //if no event name is specified, loop through all events 
          //that we generated a helper method for
          each(facebook_api_events, function(index, eventName) {
            FB.Event.unsubscribe(eventName, callback);
          });
        }
      });
      
      return FBAPI;
    },
    
    ////// Data requests to facebook API ///////
    
    //A single query can specify optional params:
    // - FBAPI.query("SELECT col FROM table WHERE uid = {0}", ["me()"], callback)
    //"returnWaitable" will fire the callback with the facebook waitable object as a param, 
    //otherwise the callback receives the queried data.
    //Multiple queries can be specified by a map, and not specifying the "params" arg:
    // - { friends: { query: "SELECT col FROM friends WHERE uid={0}", params: ["me()"]}, checkins: /*...*/ }
    //"returnWaitable" will fire the callback with a map of the facebook waitable objects as a param,
    //otherwise the callback receives the queried data as a map.
    //EXAMPLE: data passed to callback
    // - { friends: /*results*/, checkins: /*results*/ }
    //EXAMPLE: waitables passed to callback
    // - { friends: /*waitable*/, checkins: /*waitable*/ }
    query: function(query, params, callback, returnWaitable) {
      if (isFunction(params)) {
        returnWaitable = callback;
        callback = params;
        params = null;
      }
      sdk(function(FB) {
        if (isObject(query)) {
          var waitables = [],
           waitableMap = {};
          for (var name in queries) {
            var item = queries[name],
             waitable = FB.Data.query(item.query, item.params);
             
            waitables.push(waitable);
            waitableMap[name] = waitable;
          }
          if (returnWaitable) {
            callback(waitableMap);
          } else {
            FB.Data.waitOn(waitables, function() {
              for (var name in waitableMap) {
                waitableMap[name] = waitableMap[name].value;
              }
              callback(waitableMap);
            });
          }
        } else {
          var waitable = FB.Data.query(query);
          
          if (returnWaitable) {
            callback(waitable);
          } else {
            waitable.wait(function() {
              callback(waitable.value);
            });
          }
        }
      });
    },
    //Batch requests:
    //if one name is specified, returns the data or error object, e.g. callback(data, error)
    //returns an object map of responses if a batch, where each property of the first callback argument
    //is the name of the function called and the value is the data that would be returned for a single request...
    //in a batch, errors are aggregated into an array as the second callback argument
    //EXAMPLES:
    //FBAPI.get('profile', function(data, error) { /*callback code*/ })
    // - gets the profile for "me" (currently logged-in user), data is NULL if there was an error
    //FBAPI.get('profile', 'username', callback)
    // - gets the profile for the specified username (the 'profile' parameter is optional when getting a profile)
    //FBAPI.get('object', '1234567', callback)
    // - gets the object specified by the ID
    //FBAPI.get('1234567', callback)
    // - gets the object specified by the ID (can be a profile or other object)
    //FBAPI.get(['profile', 'friends', 'checkins'], function(dataMap, errorArray) { /*callback code*/ })
    // - dataMap = { profile: /*data*/, friends: /*data*/, checkins: /*data*/ }
    // - errorArray = [ profileError, friendsError, checkinsError ]
    // - gets each of the pieces of data for "me", callback receives a map of data and array of errors
    //FBAPI.get(['profile', 'friends', 'checkins'], '1234567', callback)
    // - gets each of the pieces of data for the specified ID
    get: function(names, id, callback) {
      //if no id, set to "me"
      if (!id || isFunction(id)) {
        callback = id;
        id = "me";
      }
      if (!isArray(names)) {
        return FBAPI.getData(create_path(id, names), callback);
      }
      var responses = {},
        errors = [],
        batch = [],
        names_not_cached = [];
      //call the API for each named function
      each(names, function(index, name) {
        //reserved names "profile" and "object" used to get data by ID,
        //regex removes the name to get data by ID
        var path = create_path(id, name);
        
        if (responseCache[path]) {
          responses[name] = responseCache[path];
        } else {
          batch.push({
            method: "GET", 
            relative_url: path
          });
          //Keep track of names that were not cached, 
          //to construct the result object.
          names_not_cached.push(name);
        }
      });
      
      if (!batch.length) {
        callback && callback(responses, errors);
        
        return FBAPI;
      }
      
      var batchRequest = { 
        access_token: FB.getAccessToken(), 
        batch: batch 
      };
      
      //call Facebook batch API
      sdk("api", "/", "POST", batchRequest, 
        function(results) {
          each(results, function(index, result) {
            //Parse the response body, which is serialized JSON
            result = FB.JSON.parse(result.body);
            //aggregate errors
            if (result.error) {
              errors.push(result.error);
            } else {
              responses[names_not_cached[index]] = result.data || result;
            }
          });
  
          callback && callback(responses, errors);
        });
      
      return FBAPI;
    },
    //get FB data and cache responses if not an error
    getData: function(path, callback) {
      //callback used to with live or cached response
      var proxyCallback = function(response) {
          fireCallbackWithResponseData(callback, response, "data", "error");
        };
      
      path = create_path(path);
      //use cached response if possible
      if (responseCache[path]) {
        proxyCallback(responseCache[path]);
      } else {
        //get a new response
        sdk('api', path, 
          function(response) {
            //if not an error, cache response
            if (!response.error) {
              responseCache[path] = response;
            }
            proxyCallback(response);
          });
      }
      
      return FBAPI;
    }
  };
  
  ////// Generate helper methods on FBAPI ////////
  
  //Generates methods on FBAPI like FBAPI.getFriends(id, callback)
  each(facebook_connection_types, function(index, name) {
    FBAPI["get" + camelCase(name, true)] = function(id, callback) {
      return FBAPI.get(name, id, callback);
    };
  });
  //Generates methods on FBAPI like FBAPI.onCommentCreate() 
  //from the facebook API event name "comment.create".
  //However, any event names prefixed with "auth.", such as "auth.login" 
  //will have "auth." removed and become FBAPI.onLogin()
  each(facebook_api_events, function(index, name) {
    FBAPI["on" + camelCase(name.replace(/^auth\./i, ""), true)] = function(callback) {
      return FBAPI.bind(name, callback);
    };
  })
  
  
  
  window.FBAPI = FBAPI;
  
  ///// Helper functions /////
  

  //each loop
  function each(items, callback) {
    if (items) {
      for (var i = 0; i < items.length; i++) {
        if (callback.apply(items[i], [i, items[i]]) === false) {
          break;
        }
      }
    }
  }
  function isUndefined(value) {
    return value === undefined;
  }
  //0, "", and [] are false if compared to boolean "false"...
  //![] will equal false, so need to compare to boolean
  function isFalsey(value) {
    return value == false;
  }
  function isFunction(item) {
    return item && typeof item == "function";
  }
  function isArray(item) {
    return item && item.constructor === Array;
  }
  function isObject(item) {
    return item && item + "" == "[object Object]";
  }
  function argumentsToArray(items) {
    return Array.prototype.slice.call(items);
  }
  function orNull(value, checkFalsey) {
    return (isUndefined(value) || (checkFalsey && isFalsey(value))) ? null : value;
  }
  //Shallow copy
  function extend(target, values) {
    target = target || {};
    for (var property in values) {
      var value = values[property];
      if (!(property in target)) {
        target[property] = value;
      }
    }
    return target;
  }
  //pass in a callback, response, and list of properties.
  //the properties are retrieved from the response and passed as parameters to the callback. 
  //To pass the whole response as a callback param, pass in the boolean "true" in place of a property name.
  //EXAMPLE:
  //fireCallbackWithResponseData(callback, response, "status", "authResponse", "error")
  // - the parameters to the callback will be response.status, response.authResponse, 
  //   and response.error
  function fireCallbackWithResponseData(/*callback,response,property1,propery2,...*/) {
    var args = argumentsToArray(arguments),
      callback = args.shift(),
      response = args.shift();
    
    if (callback) {
      //map response property names to arguments
      each(args, function(index, propertyName) {
        //if the property name is a boolean OR 
        //if the property is "data" but it doesn't exist 
        //in the response and there was no error, 
        //assume it's a profile/object
        var use_response = propertyName === true || (propertyName == "data" && !response[propertyName] && !response.error);
        args[index] = (use_response) ? response : orNull(response[propertyName]);
      });
      //call callback with response data
      callback.apply(response, args);
    }
  }
  //create camel case name
  function camelCase(input, capitalizeFirstLetter) {
    //find non-method characters and remove them, 
    //at the same time capitalizing any trailing alpha characters 
    //to create a camel-case name
    input = input.replace(/[^a-z0-9]+(.|$)/ig, function(match, letter, index) {
      //test to see if the char following non-method name chars 
      //is a letter
      if (/[a-z]/i.test(letter)) {
        //if this is the first letter of the name, leave case, 
        //otherwise capitalize
        return (!index) ? letter : capitalize(letter); 
      }
      //return an empty string if non-method chars where found 
      //without any trailing letters
      return ""; 
    });
    //lastly, after camel-casing, 
    //remove any leading numbers 
    //.replace(/^\d+/, "");
    return (capitalizeFirstLetter) ? capitalize(input) : input;
  }
  //capitalize first letter
  function capitalize(value) {
    return value[0].toUpperCase() + value.slice(1);
  }
  //create FB api path (this creates a path that does NOT have a leading slash). 
  //e.g. "me/friends" is created, not "/me/friends", which works with FB.api(path, callback)
  function create_path() {
    return argumentsToArray(arguments).join("/").replace(/\/(profile|object)$/i, "");
  }


})(window, document);
