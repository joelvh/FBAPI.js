/*
 * Copyright 2011 Joel Van Horn (http://twitter.com/joelvh)
 * 
 * As of date: 8/28/2011
 * Use OAUTH2, old authentication methods are being deprecated 10/1/2011:
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
    facebook_lib_script = document.createElement('SCRIPT'),
    responseCache = {},
    is_select_regex = /^\s*select\s+/i,
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
    stdout = !isUndefined(console) ? function() { console.log.apply(console, arguments); } : null,
    debug = function() {
      if (isFunction(stdout)) {
        stdout.apply(FBAPI, arguments);
      }
    },
    //Queue of callbacks to fire once 
    //Facebook Javascript SDK is loaded
    sdkReadyQueue = [],
    sdkLoaded = false,
    //Queues callbacks to be triggered once the Facebook Javascript SDK loads. 
    //Optionally can pass in a method to call on FB and forward the callback
    // - sdkReady('login', function(response) { /*code*/ });
    //When the method name is not specified, 
    //the callback is triggered with FB as the only parameter
    // - sdkReady(function(FB) { /*code*/ })
    sdkReady = function(methodName) {
      var callback;
      //if it's a function, it's a callback that accepts FB as a param
      if (isFunction(methodName)) {
        callback = methodName;
      } else {
        //remove the first argument (which is methodName)
        var args = argumentsToArray(arguments, 1);
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
        sdkReadyQueue.push(callback);
      } else {
        callback(FB);
      }
      
      return FBAPI;
    },
    initialized = false,
    authResponseHandlerFactory = function(callback) {
      return function(response) {
        //"session" is legacy, "authResponse" is OAUTH2
        fireCallbackWithResponseData(callback, response, "status", "authResponse", "error");
      }
    };
    
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
        while (sdkReadyQueue.length) {
          sdkReadyQueue.shift()(FB);
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
    //access the Facebook API safely
    ready: sdkReady,
    $: sdkReady,
    //set the callback that gets all debug info
    stdout: function(callback) {
      if (isFunction(callback)) {
        stdout = callback;
      }
    },
    //dump data
    debug: debug,
    
    ////// auth functions ///////
    
    //Optionally pass in a comma-separated list of extended permissions.
    //Callback is passed these params: callback(status, session/authResponse, error)
    login: function(perms/*aka perms*/, callback) {
      if (isFunction(perms)) {
        callback = perms;
        perms = null;
      }
      sdkReady('login', authResponseHandlerFactory(callback), (perms) ? {scope: perms} : null);
    },
    logout: function(callback) {
      sdkReady('logout', authResponseHandlerFactory(callback));
    },
    //callback(status, session/authResponse, error)
    getLoginStatus: function(callback) {
      sdkReady('getLoginStatus', authResponseHandlerFactory(callback));
    },
    //alias for FB.login()
    requestPermission: function(perms, callback) {
      FBAPI.login(perms, callback);
    },
    
    ////// subscribe/unsubscribe aliases renamed from facebook API ////////
    
    bind: function(eventName, callback) {
      sdkReady('Event.subscribe', eventName, callback);
      
      return FBAPI;
    },
    unbind: function(eventName, callback) {
      //if no event name is specified, loop through all events 
      //that we generated a helper method for
      each((eventName) ? [eventName] : facebook_api_events, function(index, eventName) {
        sdkReady('Event.unsubscribe', eventName, callback);
      });
      
      return FBAPI;
    },
    
    ////// Data requests to facebook API ///////
    
    //Execute an FQL query.  FBAPI.query() receives these parameters:
    // - query = a string for single query or object map.
    // - params = (optional) single query parameter or an array of parameters that get passed into query. 
    //   A param can be a nested query, which will be converted to a waitable and is passed to the callback 
    //   as the 3rd parameter.
    // - callback(results, error, dependencies) - receives the results, 
    //   "error" will have an error message (which includes query, multiple query, and nested query errors), 
    //   "dependencies" are waitables created when subqueries were specified as params to a query
    //
    //A single query can specify optional "params":
    // - FBAPI.query("SELECT col FROM table WHERE uid = {0}", ["me()"], callback)
    //
    //The callback receives the queried data, error message, and dependencies array.
    //Multiple queries can be specified by a map, "params" property is optional:
    // - { friends: { query: "SELECT col FROM friends WHERE uid={0}", params: ["me()"]}, checkins: /*map*/ }
    //
    //Multiple queries can be specified in a map with a flatter format if no params are needed:
    // - { friends: "SELECT col FROM friends WHERE uid=me()", checkins: /*query*/ }
    //
    //The callback receives the queried data as a map, error message, and dependencies in an array.
    //Nested queries are specified as parameters:
    // - FBAPI.query("SELECT col FROM table WHERE uid IN ({0})", { query: "SELECT uid FROM user WHERE uid1 = me()" }, callback)
    //
    //Nested queries can also be inline if there are no params (params can be in an array if there are more than 1):
    // - FBAPI.query("SELECT col FROM table WHERE uid IN ({0})", "SELECT uid FROM user WHERE uid1 = me()", callback)
    //
    //EXAMPLE: data passed to callback
    // - { friends: /*results*/, checkins: /*results*/ }
    //
    //EXAMPLE: waitables passed to callback
    // - { friends: /*waitable*/, checkins: /*waitable*/ }
    query: function(query, params, callback) {
      if (isFunction(params)) {
        callback = params;
        params = [];
      }
      
      var single_query,
        queries = query;
      
      sdkReady(function(FB) {
        //if query is NOT an object, it should be a string, 
        //otherwise it's a map with multiple queries.
        if (!isObject(query)) {
          queries = {};
          queries[single_query = FB.guid()] = { query: query, params: params };
        }

        //process multiple queries
        
        var error_reported = false,
          //could use the dependencies array to store all waitables. 
          //is there value in returning dependencies instead of all queries?
          waitables = [],
          //query parameters that consisted of nested queries converted to waitables
          dependencies = [],
          //checks for nested queries, creates waitables, then passes back a query object.
          //this could be a map or it could be a string query
          create_waitable = function(map) {
            var is_map = isObject(map);
            //throw an error if the query is blank because the map could be in the wrong format
            if (!map || (is_map && !map.query)) {
              throw Error("FBAPI.query error: no query specified.");
            }
            var query = map.query, 
              params = map.params;
            //not a map, must be a string
            if (!is_map) {
              query = map;
            }
            //make sure the params are in an array
            params = isArray(params) ? params : (params != null) ? [params] : [];
            //loop through each pram looking for another query
            each(params, function(index, param) {
              //if the param has a query property, it's a map, 
              //else if it starts with "select", it's a query.
              if (param.query || is_select_regex.test(param)) {
                //create a waitable, update parent param array, and add to dependency list
                dependencies.push(params[index] = create_waitable(param));
              }
            });
            
            var waitable = FB.Data.query.apply(FB.Data, [query].concat(params));
            //FB.Data.waitOn() does not trigger a callback if there is an error.
            //It dies after the first error.
            //waitable.wait(alert, alert)
            waitable.subscribe("error", function(error) {
              //only report the first error since FB.Data.waitOn() triggers 
              //the same error on all waitables.
              !error_reported && callback(null, error.message, dependencies);
              error_reported = true;
            });
            
            return waitable;
          };
        
        for (var name in queries) {
          debug("name", name, "value", queries[name])
          //the property value could be a string (query) directly embedded, no params
          waitables.push(queries[name] = create_waitable(queries[name]));
        }
        
        FB.Data.waitOn(waitables.concat(dependencies), function() {
          //map waitable values back to return object
          for (var name in queries) {
            queries[name] = orNull(queries[name].value);
          }
          //return data, remove map if FBAPI.query was called with one query as a string
          callback((single_query) ? queries[single_query] : queries, null, dependencies);
        });
      });
      
      return FBAPI;
    },
    testResults: function(query, params) {
      if (!stdout) {
        alert("Pass console.log (or other callback) to FBAPI.stdout() to receive the debug output from FBAPI.testResults()")
      }
      
      FBAPI.query(query, params, function(data, error, dependencies) {
        if (error) {
          debug("FBAPI.testResults... ERROR:", error);
        } else {
          var table = function(data, prefix) {
            //loop through records
            each(data, function(index, data) {
              var args = [];
              //output prefix (e.g. indenting)
              prefix && args.push(prefix);
              //add columns
              for (var name in data) {
                var value = data[name];
                if (isArray(value) && value.length) {
                  debug(prefix + "  ", "NESTED LIST:", name);
                  table(value, prefix + "  ");
                } else {
                  args.push("  [" + name + "]:", value);
                }
              }
              //output columns
              debug.apply(console, args);
            });
          };
          
          if (isObject(data)) {
            //go through map to output data for each result set
            for (var name in data) {
              debug("FBAPI.testResults... RESULTS FOR:", name);
              table(data[name], ">>  ");
            }
          } else {
            debug("FBAPI.testResults... RESULTS");
            
            table(data, "  ");
          }
          
          debug("FBAPI.testResults... DONE");
        }
      });
      
      return FBAPI;
    },
    //Batch requests:
    //if one name is specified, returns the data or error object, e.g. callback(data, error)
    //returns an object map of responses if a batch, where each property of the first callback argument
    //is the name of the function called and the value is the data that would be returned for a single request...
    //in a batch, errors are aggregated into an array as the second callback argument
    //EXAMPLES:
    //FBAPI.get('profile', function(data, error) { /*callback code*/ })
    // - gets the profile for "me" (currently logged-in user), data is NULL if there was an error
    //
    //FBAPI.get('profile', 'username', callback)
    // - gets the profile for the specified username (the 'profile' parameter is optional when getting a profile)
    //
    //FBAPI.get('object', '1234567', callback)
    // - gets the object specified by the ID
    //
    //FBAPI.get('1234567', callback)
    // - gets the object specified by the ID (can be a profile or other object)
    //
    //FBAPI.get(['profile', 'friends', 'checkins'], function(dataMap, errorArray) { /*callback code*/ })
    // - dataMap = { profile: /*data*/, friends: /*data*/, checkins: /*data*/ }
    // - errorArray = [ profileError, friendsError, checkinsError ]
    // - gets each of the pieces of data for "me", callback receives a map of data and array of errors
    // - *overload: can pass in a string with spaces or commas instead of an array 
    //   (e.g. 'profile friends checkins' or 'profile,friends,checkins')
    //
    //FBAPI.get(['profile', 'friends', 'checkins'], '1234567', callback)
    // - gets each of the pieces of data for the specified ID
    get: function(names, id, callback) {
      //if no id, set to "me"
      if (!id || isFunction(id)) {
        callback = id;
        id = "me";
      }

      //allow names to be separated by space
      if (!isArray(names)) {
        names = names.split(/[\s,]+/);
      }
      
      if (names.length == 1) {
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
      sdkReady("api", "/", "POST", batchRequest, 
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
        sdkReady('api', path, 
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
    FBAPI[camelCase("get", name)] = function(id, callback) {
      return FBAPI.get(name, id, callback);
    };
  });
  //Generates methods on FBAPI like FBAPI.onCommentCreate() 
  //from the facebook API event name "comment.create".
  //However, any event names prefixed with "auth.", such as "auth.login" 
  //will have "auth." removed and become FBAPI.onLogin()
  each(facebook_api_events, function(index, name) {
    var auth_event_regex = /^auth\./i;
    FBAPI[camelCase("on", name.replace(auth_event_regex, ""))] = function(callback) {
      //if this is an auth event, proxy callback to to pass specific parameters to original callback
      // - callback(status, authResponse, error);
      return FBAPI.bind(name, auth_event_regex.test(name) ? authResponseHandlerFactory(callback) : callback);
    };
    //subscribe for debugging
    FBAPI.bind(name, function() {
      FBAPI.debug.apply(FBAPI, ["FB.Event", name].concat(arguments));
    })
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
    return !isArray(item) && item + "" == "[object Object]";
  }
  //Accepts an arguments object or an array as the first parameter. 
  //Optionally can pass in the number of arguments to remove from 
  //the beginning of the array.
  function argumentsToArray(items, howManyToRemove) {
    return Array.prototype.slice.call(items).splice(howManyToRemove || 0);
  }
  function orNull(value, checkFalsey) {
    return (isUndefined(value) || (checkFalsey && isFalsey(value))) ? null : value;
  }
  //Shallow copy
  function extend(target, values) {
    target = target || {};
    for (var property in values) {
      if (!(property in target)) {
        target[property] = values[property];
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
  function fireCallbackWithResponseData(callback, response/*property1,propery2,...*/) {
    var args = argumentsToArray(arguments, 2);
    
    FBAPI.debug("fireCallbackWithResponseData response", response)
    
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
  //Takes multiple parameters and concatenates each value 
  //to create a camel-case name.  Also splits parameter values 
  //on non-alphanumeric values to create additional camel-cases.
  // - camelCase("on", "login") returns "onLogin"
  // - camelCase("on", "comment.create") returns "onCommentCreate"
  function camelCase() {
    //concatenate arguments with non-alphanumeric character
    //as place holder for creating camel-case
    var input = argumentsToArray(arguments).join(".");
    //find non-method characters and remove them, 
    //at the same time capitalizing any trailing alpha characters 
    //to create a camel-case name
    return input.replace(/[^a-z0-9]+(.|$)/ig, function(match, letter, index) {
      //capitalize if it's not the first letter. 
      //(the value could be a number or blank, 
      //but capitalizing doesn't affect those)
      return (!index) ? letter : capitalize(letter);
    });
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
