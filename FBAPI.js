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
  
  var protocol = document.location.protocol,
    facebook_lib_url = protocol + "//connect.facebook.net/en_US/all.js",
    cache = {},
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
      defer: false,
      //a function that accepts the facebook API lib URL 
      //to load the script using a custom loader (e.g. yepNope.js)
      loader: null
    },
    initialized = false,
    fbLoaded = false,
    //callback saved from FBAPI.init()
    fbLoadedCallback = null,
    fbAsyncInitPromises = [],
    fbAsyncInitCallback = function() {
      //loop through queue of callbacks
      while (fbAsyncInitPromises.length) {
        fbAsyncInitPromises.shift()(FB);
      }
      fbLoaded = true;
      //in case some FB.Event.subscribe calls are queued up, 
      //call fbLoadedCallback() after emptying queue because 
      //fbLoadedCallback() calls FB.getLoginStatus(), which 
      //may fire facebook events, which we'd want to notify 
      //event handlers of.
      fbLoadedCallback(FB);
    },
    //promise to make sure FB exists, queues callback if necessary
    promiseFB = function(callback) {
      if (!initialized) {
        throw "Run FBAPI.init(options) first";
      } else if (!fbLoaded) {
        fbAsyncInitPromises.push(callback);
      } else {
        callback(FB);
      }
    };
    
  ////// Init FBAPI //////
  
  //assign callback for when facebook API lib loads
  window.fbAsyncInit = fbAsyncInitCallback;
    
	//FB init configuration info
	var FBAPI = {
	  config: null,
	  // If a callback is specified, FB.getLoginStatus() is called 
	  // and the status and auth data is passed back
	  // - options = { appId, apiKey, perms }
	  // - callback = function(status, authResponse) { /*callback code*/ }
		init: function (options, callback) {
		  if (initialized) {
		    return FBAPI;
		  }
      
      initialized = true;
		  
		  //extend options to make sure all properties are present
		  FBAPI.config = options = extend(options, defaultOptions);
		  //save callback
		  fbLoadedCallback = function(FB) {
        //fire callback and pass session data if there is any
        if (callback) {
          FBAPI.getLoginStatus(callback);
        }
		  };
		  
      //queue callback for when facebook API lib is loaded
      promiseFB(function(FB) {
        FB.init(options);
      });
      
      //facebook's javascript API requires <div id="fb-root"></div> before loading
      if (!document.getElementById('fb-root')) {
        var fbRoot = document.createElement('DIV');
        fbRoot.id = 'fb-root';
        document.body.appendChild(fbRoot);
      }
      
      //load facebook API lib with custom loader
      if (options.loader) {
        options.loader(facebook_lib_url);
      } else {
        //load facebook API lib
        var script = document.createElement('SCRIPT');
        script.async = options.async;
        script.defer = options.defer;
        script.src = facebook_lib_url;
        script.onload = function() {
          script.parentNode.removeChild(script);
        };
        document.getElementsByTagName('HEAD')[0].appendChild(script);
      }
      
      return FBAPI;
		},
		
		////// auth functions ///////
		
		//Optionally pass in a comma-separated list of extended permissions.
		//Callback is passed these params: callback(status, session/authResponse, error)
    login: function(perms/*aka perms*/, callback) {
      if (isFunction(perms)) {
        callback = perms;
        perms = null;
      }
      promiseFB(function(FB) {
        FB.login(function(response) {
          //"session" is legacy, "authResponse" is OAUTH2
          fireCallbackWithResponseData(callback, response, "status", ["session", "authResponse"], "error");
        }, (perms) ? {scope: perms} : null);
      });
    },
    logout: function(callback) {
      promiseFB(function(FB) {
        FB.logout(function(response) {
          //"session" is legacy, "authResponse" is OAUTH2
          fireCallbackWithResponseData(callback, response, "status", ["session", "authResponse"], "error");
        });
      });
    },
    //callback(status, session/authResponse, error)
		getLoginStatus: function(callback) {
      promiseFB(function(FB) {
        FB.getLoginStatus(function(response) {
          //"session" is legacy, "authResponse" is OAUTH2
          fireCallbackWithResponseData(callback, response, "status", ["session", "authResponse"], "error");
        });
      });
		},
		//alias for FB.login()
		requestPermission: function(perms, callback) {
		  FBAPI.login(perms, callback);
		},
		
    ////// subscribe/unsubscribe aliases renamed from facebook API ////////
    
    bind: function(eventName, callback) {
      promiseFB(function(FB) {
        FB.Event.subscribe(eventName, callback);
      });
      
      return FBAPI;
    },
    unbind: function(eventName, callback) {
      promiseFB(function(FB) {
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
	    promiseFB(function(FB) {
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
            waitable.wait(callback);
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
			if (!isArray(names)) {
				names = [names];
			}
			//if no id, set to "me"
			if (!id || isFunction(id)) {
				callback = id;
				id = "me";
			}
			var responses = {},
				errors = [],
				count = names.length;
			//call the API for each named function
			each(names, function(index, name) {
				//reserved names "profile" and "object" used to get data by ID,
				//regex removes the name to get data by ID
				var path = "/" + id + '/' + name,
				  //callback to aggregate response data for batch
					batchCallback = function(data, error) {
						//aggregate errors
						if (error) {
							errors.push(error);
						} else {
							responses[name] = data;
						}
						//if the number of responses equals the number of method names, call callback
						if (!--count && callback) {
							callback(responses, errors);//orNull(errors, true));
						}
					};
				//use custom callback that aggregates responses, 
				//otherwise use direct callback if only one request
				FBAPI.getData(path, (count == 1) ? callback : batchCallback);
			});
			
			return FBAPI;
		},
		//get FB data and cache responses if not an error
		getData: function(path, callback) {
			var cached = cache[path],
			 regex = /\/(profile|object)$/i,
			 is_object = regex.test(path),
				//callback used to with live or cached response
				proxyCallback = function(response) {
				  if (is_object) {
            fireCallbackWithResponseData(callback, response, true, "error");
				  } else {
  				  fireCallbackWithResponseData(callback, response, "data", "error");
  				}
				};
			//use cached response if possible
			if (cached) {
				proxyCallback(cached);
			} else {
				//get a new response
				promiseFB(function(FB) {
  				FB.api(path.replace(regex, ""), function(response) {
  					//if not an error, cache response
  					if (!response.error) {
  						cache[path] = response;
  					}
  					proxyCallback(response);
  				});
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
  function extend(target, values, deep) {
    !target && (target = {});
    for (var property in values) {
      var value = values[property];
      if (!(property in target)) {
        target[property] = !deep ? value : 
          (value == null || isObject(value)) ? extend({}, value) : 
          (isArray(value)) ? value.slice(0) : value;
      // compares objects that already exist in target if "deep" is true
      // copies properties or object if the target is NULL or an object
      } else if (deep && isObject(value) && (target[property] == null || isObject(target[property]))) {
        //don't need to set property because the object is updated by reference
        /*target[property] = */extend(target[property] || {}, value, deep);
      }
    }
    return target;
  }
  function copy(values) {
    return extend({}, values);
  }
  function removeProperties(target, returnNewObject, attributes) {
    if (!isArray(attributes)) {
      attributes = argumentsToArray(arguments);
      //remove "target" arg
      attributes.shift();
      //if "returnNewObject" is a boolean, remove
      if (returnNewObject === true) {
        attributes.shift();
        target = copy(target);
      }
    }
    each(attributes, function(index, attribute) {
      delete target[attribute];
    });
    return target;
  }
  //pass in a callback, response, and list of properties.
  //the properties are retrieved from the response and passed as parameters to the callback. 
  //a property can be an array of strings, for which the first property that exists in the response 
  //is used as the callback parameter value.
  //To pass the whole response as a callback param, pass in the boolean "true" in place of a property name.
  //EXAMPLE:
  //fireCallbackWithResponseData(callback, response, "status", ["session", "authResponse"])
  // - the first parameter to the callback will be response.status, 
  //   and the second parameter will be either response.session or response.authResponse, 
  //   depending on which is the first one that exists in the response object
  function fireCallbackWithResponseData(/*callback,response,property1,propery2,...*/) {
    var args = argumentsToArray(arguments),
      callback = args.shift(),
      response = args.shift();
    
    if (!callback) {
      return;
    }
    //map response property names to arguments
    each(args, function(index, propertyName) {
      if (isArray(propertyName)) {
        //while the property name is not in the response, remove from the array
        while (propertyName !== true && !(propertyName[0] in response)) {
          propertyName.shift();
        }
        //if there is an array value left, use the first one as the property name
        args[index] = (!propertyName.length) ? null : (propertyName[0] === true) ? response : response[propertyName[0]];
      } else {
        args[index] = (propertyName === true) ? response : orNull(response[propertyName]);
      }
    });
    console.log("response args", args)
    //call callback with response data
    callback.apply(response, args);
  }
//create camel case name
  function camelCase(input, capitalizeFirstLetter) {
    //find non-method characters and remove them, 
    //at the same time capitalizing any trailing alpha characters 
    //to create a camel-case name
    input.replace(/[^a-z0-9]+(.|$)/ig, function(match, letter, index) {
      //test to see if the char following non-method name chars 
      //is a letter
      if (/[a-z]/i.test(letter)) {
        //if this is the first letter of the name, leave case, 
        //otherwise capitalize
        return (index == 0) ? letter : letter.toUpperCase(); 
      }
      //return an empty string if non-method chars where found 
      //without any trailing letters
      return ""; 
    });
    //lastly, after camel-casing, 
    //remove any leading numbers 
    //.replace(/^\d+/, "");
    return (capitalizeFirstLetter) ? input[0].toUpperCase() + input.slice(1) : input;
  }


})(window, document);
