/** @license XMLHttpRequest Level 2 polyfill | @version 0.2 | MIT License | github.com/termi */

// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @warning_level VERBOSE
// @jscomp_warning missingProperties
// @output_file_name XHR2.js
// @check_types
// ==/ClosureCompiler==

/*
http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
http://stackoverflow.com/questions/11284728/how-do-i-access-8-bit-binary-data-from-javascript-in-opera?rq=1

 sendAsBinary shim for browsers with native Uint8Array http://javascript0.org/wiki/Portable_sendAsBinary
 http://habrahabr.ru/post/120917/ (Новые возможности XMLHttpRequest2)
 http://blogs.msdn.com/b/ie/archive/2012/02/09/cors-for-xhr-in-ie10.aspx

 About XDomainRequest
 http://msdn.microsoft.com/en-us/library/dd573303(v=VS.85).aspx
 http://bugs.jquery.com/ticket/8283
 http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
 XDomainRequest only support text sending and as response
 XDomainRequest only support methods GET and POST
 No custom headers may be added to the request

 TODO::
 1. https://raw.github.com/vjeux/jDataView/master/src/jdataview.js  (http://habrahabr.ru/post/144008/)
 2. http://readd.ru/read.php?aHR0cDovL2hhYnJhaGFici5ydS9ibG9ncy9odG1sNS8xMzMzNTEvXn5e0KXQsNCx0YDQsNGF0LDQsdGAXn5eMjUuMTEuMTEgMDE6NTg= (Воркараунд xhr.send(Blob) для Opera)
 3. http://www.w3.org/TR/progress-events/#interface-progressevent

 https://raw.github.com/jquery/jquery/master/src/ajax.js
 https://raw.github.com/jquery/jquery/1d1d4fe112c49cbd704d880b27cc646f2bfe1737/src/ajax/xhr.js
 
 http://stackoverflow.com/questions/11284728/how-do-i-access-8-bit-binary-data-from-javascript-in-opera?rq=1
 Opera 12.00 introduced support for responseType; unfortunately, there's a bug in it that means given a text/* MIME type you'll end up the file as 16-bit words. It's fixed in 12.01, but the simplest fix is to set the override type as application/octet-stream. (This is CORE-46938 for those of you desiring to stalk a closed bug-tracker.)
 setting the MIME type to application/octet-stream does fix the problem in Opera 12 (I must have changed it in the wrong place the first time, I will delete the comment that says it doesn't work). This was what I changed: this.req.overrideMimeType('application/octet-stream; charset=x-user-defined'); 
 */

// [[[|||---=== GCC DEFINES START ===---|||]]]
/** @define {boolean} */
var __GCC__INCLUDE_DOMPARSER_SHIM__ = false;
/** @define {boolean} */
var __GCC__IELT10_SUPPORT__ = false;//for IE9
/** @define {boolean} */
var __GCC__IELT9_SUPPORT__ = true;//for IE8-
// [[[|||---=== GCC DEFINES END ===---|||]]]


// CONFIG START
/** @type {string} @const */
//var FLASH_CORS_TRANSPORT_SRC = "/cors/flashCORS.swf";
/** @type {string} @const */
	//var IFRAME_CORS_TRANSPORT_DEFAULT_SRC = "/__CORS_iframe_remote_domain.html";
	//CONFIG END

(function(global) {


var
	/** type {Object} original XHR */
	_XMLHttpRequest_ =  global.XMLHttpRequest

	, getNewXhr =
		__GCC__IELT10_SUPPORT__ ?
			_XMLHttpRequest_ ?
				function() {
					var result = new _XMLHttpRequest_;
					result.xhrType = 1;//Simple XHR
					return result;
				}
				:
				function() {
					var result = new ActiveXObject("Microsoft.XMLHTTP");
					result.xhrType = 2;//Simple XHR via ActiveX
					return result;
				}
			:
			function() {
				var result = new _XMLHttpRequest_;
				result.xhrType = 1;//Simple XHR
				return result;
			}

	, _test_XHR = getNewXhr()
	, _responseType_values_map = {
		"json" : void 0
		, "document" : void 0
		, "arraybuffer" : void 0
		, "text" : void 0
		, "blob" : void 0//TODO:: The is no shim for sending/getting blob for now
	}
	, _FormData = global["FormData"]
	, IS_XHR_SUPPORT_FORMDATA = !!_FormData
	, IS_XHR_SUPPORT_UPLOAD = "upload" in _test_XHR
	, IS_XHR_SUPPORT_TIMEOUT = "timeout" in _test_XHR
	, IS_XHR_SUPPORT_RESPONSE = "response" in _test_XHR
	, IS_XHR_SUPPORT_WITHCREDENTIALS = "withCredentials" in _test_XHR
	, IS_XDOMAINREQUEST_SUPPORT = "XDomainRequest" in global
	, IS_XHR_SUPPORT_CORS = IS_XHR_SUPPORT_WITHCREDENTIALS
	, XMLHttpRequest2_createNewCORSXhr
	, THE_BEST_BROWSER_EVAR = true
	, XHR_SUPPORT_MAP_RESPONSETYPE = IS_XHR_SUPPORT_RESPONSE && Object.keys(_responseType_values_map).reduce(function(result, key) {
		//Do we need more bulletproof feature detection ?
		// http://stackoverflow.com/questions/8926505/how-to-feature-detect-if-xmlhttprequest-supports-responsetype-arraybuffer/8928272#8928272
		try {
			_test_XHR.responseType = key;
		}
		catch(e) {}

		if(_test_XHR.responseType === key) {
			result[key] = void 0;
		}
		else {
			THE_BEST_BROWSER_EVAR = false;// :[
		}

		return result;
	}, {})
;


//Test Opera for REAL support xhr.responseType = "document"
//Sorry for browser sniffing, but only Opera does lie that it support xhr.responseType = "blob" and xhr.responseType = "document", but it not true
//Opera support only XML in xhr.responseType = "document"
if(_XMLHttpRequest_ && IS_XHR_SUPPORT_RESPONSE && global["opera"]) {
	try {
		["blob", "document", "document", false, "text/html", "text/xml"].some(function(item, index, array) {
			if(item in XHR_SUPPORT_MAP_RESPONSETYPE) {

				//PGh0bWw%2BPGRpdj50PC9kaXY%2BPC9odG1sPg0K - <html><div>t></div></html>
				this.open("GET", "data:" + (array[index + 3] || array[index + 4]) + ";base64,PGh0bWw%2BPGRpdj50PC9kaXY%2BPC9odG1sPg0K", false);
				this.responseType = "document";
				this["onload"] = function() {
					var notSupported;
					try {
						notSupported = this.response == null;
					}
					catch(e) {
						//Uncaught exception: DOMException: NOT_SUPPORTED_ERR for xhr.responseType = "blob"
						//Uncaught exception: DOMException: INVALID_STATE_ERR for xhr.responseType = "document" with html response from server
						notSupported = true;
					}
					if(notSupported) {
						THE_BEST_BROWSER_EVAR = false;
						delete XHR_SUPPORT_MAP_RESPONSETYPE[item];
					}
				};
				this.send();

			}

			if(item === false)return true;
		}, new XMLHttpRequest);
	}
	catch(e) {
		//Note: We do sync request with xhr.responseType != "" and Opera support
		//Maybe in future, Opera will stop support sync request for requests with xhr.responseType != "" and will start fully support xhr.responseType = "blob" and xhr.responseType = "document"
	}
}

if(
	IS_XHR_SUPPORT_FORMDATA
		/*TODO:: && IS_XHR_SUPPORT_UPLOAD*/
		&& IS_XHR_SUPPORT_TIMEOUT
		&& IS_XHR_SUPPORT_RESPONSE
		&& THE_BEST_BROWSER_EVAR
	) {
	//Good browser
	return;
}



var
	/** Browser sniffing
	 * GCC W U NO SUPPORT @cc ?
	 * @type {boolean} */
	_browser_msie = __GCC__IELT10_SUPPORT__ && window.eval && eval("/*@cc_on 1;@*/") && +((/msie (\d+)/i.exec(navigator.userAgent) || [])[1] || 0) || void 0

	/** @const */
	, UUID_PREFIX = "uuid" + +new Date
	/** @const */
	, _hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
	/** @const */
	, _Function_apply_ = Function.prototype.apply

	, _function_noop = function(){}

	, _DOMParser

	, _FormData_encodeSimpleFormData
	, _FormData_encodeDifficaltFormData
	, _FormData_shim_send

	, UUID = 1

	, _Document = global["Document"] || global["HTMLDocument"]

	, _ArrayBuffer = global["ArrayBuffer"]

	, IEBinaryToArray_ByteStr__NAME = __GCC__IELT10_SUPPORT__ && UUID_PREFIX + "IEBinaryToArray_ByteStr"

	, _document_createEvent = document.createEvent || __GCC__IELT10_SUPPORT__ && __GCC__IELT9_SUPPORT__ && document.createEventObject
	, _Event_prototype
	, _ProgressEvent = global["ProgressEvent"]
	, _shimed_ProgressEvent
	, _ProgressEvent_prototype_initProgressEvent

	, IS_FILE_SUPPORT = "File" in global
	, IS_XHR_SUPPORT_SEND_AS_BINARY = "sendAsBinary" in _test_XHR
	, IS_XHR_SUPPORT_OVERRIDE_MIME_TYPE = "overrideMimeType" in _test_XHR
	, IS_XHR_IMPLIMENT_EVENT_TARGET = "addEventListener" in _test_XHR
	, IS_PROGRESS_EVENT_AS_CONSTRUCTOR_SUPPORT = _ProgressEvent && (function() {
		var event;
		try {
			event = new _ProgressEvent("load");
		}
		catch(e) {}
		return event && event.type == "load";
	})()
	, _xhr_onevents = ["load", "error", "abort", "loadend", "loadstart", "progress", "timeout"]
	, IS_XHR_SUPPORT_ON_EVENTS = "onload" in _test_XHR
	, XHR_SUPPORT_MAP_ON_EVENTS = IS_XHR_SUPPORT_ON_EVENTS && _xhr_onevents.reduce(function(result, eventType) {
		eventType = "on" + eventType;

		result[eventType] = eventType in _test_XHR;

		return result;
	}, {})
	//, IS_XHR_SUPPORT_ONPROGRESS = XHR_SUPPORT_MAP_ON_EVENTS["onprogress"]
	, IS_XHR_SUPPORT_ONABORT = XHR_SUPPORT_MAP_ON_EVENTS["onabort"]
	, XMLHttpRequest2_onevent
	, convertResponseBodyToText
/** @const */
	, _throwDOMException = function(errStr) {
		var ex = Object.create(DOMException.prototype);
		ex.code = DOMException[errStr];
		ex.message = errStr +': DOM Exception ' + ex.code;
		throw ex;
	}

	, XMLHttpRequest2_properties
	, XMLHttpRequest2_methods
	, XMLHttpRequest2_nativeXHRClear
	, shimOnreadystatechange
	, _fakeFormDataWithFileInputs_ondone
	, _fakeFormDataWithFileInputs_onerror
	
	, _Object_defineProperty = Object.defineProperty
	
	, IS_OBJECT_DEFINEPROPERTY_WORKS_ON_OBJECT = !(__GCC__IELT10_SUPPORT__ && __GCC__IELT9_SUPPORT__) || (function() {
		try {
			return _Object_defineProperty({}, "t", {get : function() {return 1}})["t"] === 1;
		}
		catch(e) {
			return false;
		}
	})()
	, __IElt9_createVBClass//this code ONLY for IE8-
	, safe_get_outerHTML_for_FF_and_others
;

if(__GCC__IELT10_SUPPORT__ && __GCC__IELT9_SUPPORT__ && _browser_msie && !IS_OBJECT_DEFINEPROPERTY_WORKS_ON_OBJECT) {//this code ONLY for IE8-
	_Object_defineProperty = function(obj, propName, propDescription) {//prepeare object for __IElt9_createVBClass
		if(!propDescription)return;

		if("value" in propDescription)obj[propName] = propDescription["value"];
		else {
			if("get" in propDescription)obj["get " + propName] = propDescription["get"];
			if("set" in propDescription)obj["set " + propName] = propDescription["set"];
		}
	}
	__IElt9_createVBClass = function(__IElt9_class_constructor__, __IElt9_class_prototype__) {
		//TODO::
	}
}

function __setProperties(target, _donor) {
	Object.keys(_donor).reduce(function(target, key) {
		var prop = this[key];
		
		if(typeof prop == "function") {
			prop = {"get" : prop};
		}
		else if(typeof prop != "object" || prop === null) {
			prop = {"value" : prop, "writable" : true};
		}
		
		if(prop["configurable"] == void 0)prop["configurable"] = true;
		if(prop["enumerable"] == void 0)prop["enumerable"] = true;
		
		_Object_defineProperty(target, key, prop);
		
		return target;
	}.bind(_donor), target);
}

if(__GCC__IELT10_SUPPORT__) {
	convertResponseBodyToText = function(byteArray) {
		// http://jsperf.com/vbscript-binary-download/6
		var scrambledStr;
		try {
			scrambledStr = global[IEBinaryToArray_ByteStr__NAME](byteArray);
		} catch (e) {
			// http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
			// http://miskun.com/javascript/internet-explorer-and-binary-files-data-access/
			var IEBinaryToArray_ByteStr_Script =
				"Function " + IEBinaryToArray_ByteStr__NAME + "\r\n"+
					"	" + IEBinaryToArray_ByteStr__NAME + " = CStr(Binary)\r\n"+
					"End Function\r\n"+
					"Function " + IEBinaryToArray_ByteStr__NAME + "_Last(Binary)\r\n"+
					"	Dim lastIndex\r\n"+
					"	lastIndex = LenB(Binary)\r\n"+
					"	if lastIndex mod 2 Then\r\n"+
					"		" + IEBinaryToArray_ByteStr__NAME + "_Last = AscB( MidB( Binary, lastIndex, 1 ) )\r\n"+
					"	Else\r\n"+
					"		" + IEBinaryToArray_ByteStr__NAME + "_Last = -1\r\n"+
					"	End If\r\n"+
					"End Function\r\n";

			// http://msdn.microsoft.com/en-us/library/ms536420(v=vs.85).aspx
			// proprietary IE function
			window.execScript(IEBinaryToArray_ByteStr_Script, 'vbscript');

			scrambledStr = global[IEBinaryToArray_ByteStr__NAME](byteArray);
		}

		var lastChr = global[IEBinaryToArray_ByteStr__NAME + "_Last"](byteArray)
			, result = ""
			, i = 0
			, l = scrambledStr.length % 8
			, thischar
		;
		
		while (i < l) {
			thischar = scrambledStr.charCodeAt(i++);
			result += String.fromCharCode(thischar & 0xff, thischar >> 8);
		}
		
		l = scrambledStr.length;
		while (i < l) {
			result += String.fromCharCode(
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8);
		}
		
		if (lastChr > -1) {
			result += String.fromCharCode(lastChr);
		}
		
		return result;
	}
}

if("DOMParser" in global) {
	//DOMParser HTML extension - Now a polyfill since HTML parsing was added to the DOMParser specification
	//https://gist.github.com/1129031
	(function(real_parseFromString) {
		// Firefox/Opera/IE throw errors on unsupported types
		try {
			// WebKit returns null on unsupported types
			if ((new DOMParser)["parseFromString"]("", "text/html")) {
				// text/html parsing is natively supported
				return;
			}
		} catch (ex) {}

		DOMParser.prototype["parseFromString"] = function(markup, type) {
			if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
				var
					doc = document.implementation.createHTMLDocument("")
					, doc_elt = doc.documentElement
					, first_elt
					;

				doc_elt.innerHTML = markup;
				first_elt = doc_elt.firstElementChild;

				if ( // are we dealing with an entire document or a fragment?
					doc_elt.childElementCount === 1
						&& first_elt.localName.toLowerCase() === "html"
					) {
					doc.replaceChild(first_elt, doc_elt);
				}

				return doc;
			} else {
				return real_parseFromString.apply(this, arguments);
			}
		};
	})(DOMParser.prototype["parseFromString"]);
}
else if(__GCC__INCLUDE_DOMPARSER_SHIM__) {//IE < 9, Old Safary
/*
TODO::
http://forums.mozillazine.org/viewtopic.php?f=19&t=1594275
This safely parses HTML to DOM - meaning gets rid of javascript in attributes, and tags like script, style, head, body, title, iframe.

Code: Select all
function  HTMLParser(aHTMLString){
   var parseDOM = content.document.createElement('div');
   parseDOM.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]  
      .getService(Components.interfaces.nsIScriptableUnescapeHTML)  
      .parseFragment(aHTMLString, false, null, parseDOM));
   return parseDOM;
},

Code: Select all
//sample
DOMObject = HTMLParser('<p>foo</p><p>bar</p>')
alert(DOMObject.getElementsByTagName('p').length)
*/
	(function(global){
		var _DOMParser = global["DOMParser"] = function(){};

		function prepareTextForIFrame(text) {
			return text
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')//remove script tags from HTML text
				//TODO:: not remove all <script (.*?)>, just <script>, <script type="text/javascript">, <script type="">, <script type="text/vbscript">. Due <script> can contains a template
				.replace(/"/g, '\\"')
				;
		}

		//http://stackoverflow.com/questions/4935664/how-to-create-a-new-htmldocument-in-ie
		_DOMParser.prototype["parseFromString"] = function(markup, type) {
			if(!type || type == "text/html" || /xml$/.test(type)) {
				markup = prepareTextForIFrame(markup);

				var iframe = document.createElement('iframe');
				iframe.style.display = 'none';
				iframe.src = 'javascript:document.write("' + markup + '")';
				document.body.appendChild(iframe);
				newHTMLDocument = iframe.contentDocument || iframe.contentWindow.document;

				newHTMLDocument["__destroy__"] = function() {
					var _doc = this.contentWindow.document;
					_doc.documentElement.innerHTML = "";
					_doc["_"] = _doc.documentElement["_"] = void 0;
					/*TODO:: filter build-in properties suche as "URL", "location", etc
					 Object.keys(_doc).forEach(function(key){
					 try{
					 _doc[key] = void 0;
					 }
					 catch(e){}
					 })
					 */
					document.body.removeChild(this);
				}.bind(iframe);

				markup = iframe = void 0;

				//TODO::
				//shimDocument(newHTMLDocument);
				newHTMLDocument.querySelector = document.querySelector;
				newHTMLDocument.querySelectorAll = document.querySelectorAll;

				return newHTMLDocument;
			}
			else {
				//Not supported
				return null;
			}
		}
	})(global);
}
_DOMParser = global["DOMParser"];



if(!IS_XHR_SUPPORT_FORMDATA) {
	/*
	 * //http://otvety.google.ru/otvety/thread?tid=254a35ce8ae1ca92&pli=1
	 * TODO: jsdoc
	 */
	_FormData_encodeSimpleFormData = function(data) {
		if(!data)return false;

		var pairs = [];

		for(var name in data) if(_hasOwnProperty(data, name)) {
			var value = data[name] + ""
				, pair =
					encodeURIComponent(name).replace(_FormData_encodeSimpleFormData.regexp, '+') +
						'=' +
						encodeURIComponent(value).replace(_FormData_encodeSimpleFormData.regexp, '+')
				;

			pairs.push(pair);
		}

		return pairs.join('&');
	}
	_FormData_encodeSimpleFormData.regexp = /%20/g;

	/**
	 * based on
	 * https://raw.github.com/francois2metz/html5-formdata/master/formdata.js
	 * Emulate FormData for some browsers
	 * MIT License
	 * (c) 2010 FranÃ§ois de Metz
	 * ---------------------------------
	 * TODO: jsdoc
	 *
	 */
	_FormData_encodeDifficaltFormData = function(data, boundary) {
		var result = ""
			, name
			, value
			;

		for(name in data) if(_hasOwnProperty(data, name)) {
			value = data[name];

			result += "--" + boundary + "\r\n";

			// file upload
			if ("name" in value) {
				result += "Content-Disposition: form-data; name=\""+ name +"\"; filename=\""+ value["name"] +"\"\r\n";
				result += "Content-Type: "+ value["type"] +"\r\n\r\n";
				result += value["getAsBinary"]() + "\r\n";
			} else {
				result += "Content-Disposition: form-data; name=\""+ name +"\";\r\n\r\n";
				result += value + "\r\n";
			}
		}
		result += "--" + boundary +"--";

		return result;
	};


	/**
	 * https://developer.mozilla.org/en/XMLHttpRequest/FormData
	 * https://developer.mozilla.org/en/DOM/XMLHttpRequest/FormData/Using_FormData_Objects
	 * @constructor
	 */
	function _local_scope_FormData(_form) {
		var options = this["_options"] = {}
			, _ = {}
			;
		this["__shim__"] = true;
		/** @type {Object} */
		this["_"] = _;

		_.filesCount = 0;
		_.pairs = {};

		if(_form) {
			for(var i = 0, l = _form.length ; i < l ; i++) {
				this["append"](_form[i].name, _form[i].value, _form[i].type, _form[i]);
			}

			["method", "action", "enctype", "accept-charset"].forEach(function(attr, attrValue) {
				if((attrValue = _form.getAttribute(attr)) != null) {
					options[attr] = attrValue;
				}
			}, this);
		}
	}

	_FormData = _local_scope_FormData;//_local_scope_FormData done for GCC

	_FormData.prototype = {
		constructor : _FormData
		, "append" : function(name, value) {
			var _ = this["_"];
			//TODO:: if(value instanceof Blob) {}
			//TODO:: if(value instanceof File) {}

			if(arguments[2] === "file") {//input.type
				this["_file" + _.filesCount++] = arguments[3];
			}
			else {
				_.pairs[name] = value;
			}
		}
		, toString : function() {return "[object FormData]"}
	};

	/** @this {_local_scope_FormData} */
	_FormData_shim_send = function(_shim_XHR2_object, cors) {
		var thisObj = this
			, _ = thisObj["_"]
			, isFiles = !!_.filesCount
			;

		if(IS_FILE_SUPPORT && IS_XHR_SUPPORT_SEND_AS_BINARY || !isFiles) {
			var boundary = isFiles && "--------FormData" + Math.random();
			return {
				needSendAsBin : IS_XHR_SUPPORT_SEND_AS_BINARY && isFiles
				, boundary : boundary
				, data : isFiles ?
					_FormData_encodeDifficaltFormData(_.pairs, boundary)
					:
					_FormData_encodeSimpleFormData(_.pairs)
			}
		}

		var _method = _shim_XHR2_object.__method__,
			_url = _shim_XHR2_object.__uri__,
			xhr = _shim_XHR2_object.nativeXHR,
			frame,
			frameId,
			prevs,
			i = 0,
			l = this["_"].filesCount,
			fileInputs = l !== 0,
			fileInput,
			tmp,
			options = this["_options"],
			form,
			result = null;


		if(fileInputs) {
			if(cors) {
				throw new Error("CORS is unsupporting with FormData with file inputs");
			}

			frame = this.frame = document.createElement("iframe");
			frameId = frame.name = frame.id = UUID_PREFIX + ++UUID;
			frame.src = "about:blank";
			frame.style.display = "none";
			document.body.appendChild(frame);

			form = document.createElement("form");
			prevs = [];

			Object.keys(options).forEach(function(attr) {
				this.setAttribute(attr, options[attr]);
			}, form);

			Object.keys(this["_"].pairs).forEach(function(name) {
				var input = document.createElement("input"),
					value = this["_"].pairs[name];

				input.type = "hidden";
				input.name = name;
				input.value = value;
				form.appendChild(input);
			}, this);

			while(i < l) {
				fileInput = this["_file" + i];
				prevs[i * 2] = fileInput.parentNode;
				prevs[i * 2 + 1] = fileInput.nextSibling;
				form.appendChild(fileInput);
				i++;
			}

			if(_url)form.action = _url;
			if(_method)form.method = _method;

			form.target = frameId;
			frame["_onload"] = function() {
				try {
					_fakeFormDataWithFileInputs_ondone(this.contentDocument.documentElement.innerText);
				}
				catch(e) {
					_fakeFormDataWithFileInputs_error({"status" : 404});
				}
				document.body.removeChild(frame);
				frame = null;
			};
			frame["_onerror"] = function() {
				_shim_XHR2_object._fakeFormDataWithFileInputs_error();
				document.body.removeChild(frame);
				frame = null;
			};
			frame.setAttribute("onload", "this._onload()");
			frame.setAttribute("onerror", "this._onerror()");

			//form.style = "visibility:hidden;position:absolute;top:0;left:0;height:0px;width:0px";
			form.style.display = "none";
			document.body.appendChild(form);
			form.submit();
			document.body.removeChild(form);

			i = 0;
			while(i < l) {
				fileInput = this["_file" + i];
				prevs[i * 2].insertBefore(fileInput, prevs[i * 2 + 1]);
				i++;
			}

			return {
				_isDefaultPrevented : true
			};
		}

	}
}//if(!IS_XHR_SUPPORT_FORMDATA)


/**
 * Check for CORS mode
 * @param uri
 * @return {(Object(state: number, from:string, to: string, fromProtocol: string, toProtocol: string)|null)}  return null if the is no CORS. state==1 if CORS with current subdomain, state==2 if CORS with same protocols, state==3 if CORS with same domains and diff protocols, state==4 diff protocols and domains
 */
function CORS_test(uri) {
	var _link = CORS_test.link || (CORS_test.link = document.createElement("a")),
		currentDomain = document.domain,
		currentProtocol = location.protocol,
		targetDomain,
		targetProtocol,
		result = {},
		_state;

	_link.href = uri;

	targetDomain = _link.hostname;
	targetProtocol = _link.protocol;

	if(targetDomain == currentDomain && targetProtocol == currentProtocol) {
		//No CORS
		return null
	}
	else if(targetProtocol == currentProtocol) {
		//CORS with diff domain, but same protocol
		/*if(targetDomain.substr(-currentDomain.length) == currentDomain) {//NOTE:: substr() must work with negative value as first parameter. FOR IE<9 use shim
		 //CORS with target subdomain
		 _state = 1;
		 ?????
		 }
		 else */
		if(currentDomain.substr(-targetDomain.length) == targetDomain) {
			//CORS with current subdomain
			_state = 1;
		}
		else _state = 2;
	}
	else if(targetDomain == currentDomain) {
		_state = 3;
	}
	else _state = 4;

	return {
		state : _state,
		from : currentDomain,
		to : targetDomain,
		fromProtocol : currentProtocol,
		toProtocol : targetProtocol
	};

	//TODO::
	//1. Test if uri in subdoment or super domen -> change document.domain
	//2. Test if we need CORS to another domain -> Use some CORS hack
}

function checkIsXML(elem) {
	var doc = elem.ownerDocument || elem;

	return !!doc['xmlVersion'] || //XHTML browsers
		!!doc['xml'] || //IE
		"createElement" in doc && doc.createElement("div").tagName == "div"//Major browsers. At least FF10+
	;
}

//FF support outerHTML since 11
//http://stackoverflow.com/questions/1700870/how-do-i-do-outerhtml-in-firefox
//http://stackoverflow.com/a/817225
//there is no standard that supports this(outerHTML), although IE 6+ and more recently several other browsers now support it
safe_get_outerHTML_for_FF_and_others = "outerHTML" in document.documentElement ?
	function(node) {
		return node.outerHTML
	}
	:
	function(node) {//for FF lt 11
		//WARNING: new XMLSerializer().serializeToString() returns rubbish if(xmlns != null && xmlns != "http://www.w3.org/1999/xhtml")
		var nodeNodeName = node.nodeName
			, outerHTML_firstPart
			, xmlns = node.getAttribute("xmlns")
			//, oldXMLNS
		;

		/*Do we realy need this???
		if(xmlns && xmlns != "http://www.w3.org/1999/xhtml") {
			//new XMLSerializer().serializeToString() returns rubbish if(xmlns != null && xmlns != "http://www.w3.org/1999/xhtml")
			node.removeAttribute("xmlns");
			oldXMLNS = xmlns;
			xmlns = null;
		}
		*/

		outerHTML_firstPart = new XMLSerializer().serializeToString(node);

		outerHTML_firstPart = outerHTML_firstPart.match(new RegExp("^<(" + nodeNodeName + ")(?:(?:( xmlns=['\"](.*?)['\"] )| ).*?)?>", "i"));
		if(outerHTML_firstPart[3] && !xmlns) {
			outerHTML_firstPart[0] = outerHTML_firstPart[0].replace(outerHTML_firstPart[2], " ");
		}
		nodeNodeName = outerHTML_firstPart[1];

		/*if(oldXMLNS) {
			node.setAttribute("xmlns", oldXMLNS);
		}*/

		return outerHTML_firstPart[0] + node.innerHTML + "</" + nodeNodeName + ">";
	}
;

function _prepeareDocumentDataForSending(_document, xhr) {
	var isXML = checkIsXML(_document)
		, charset = _document['charset'] || _document['characterSet'] || "utf-8"//TODO:: test for default "utf-8"
		, headerString =
			(checkIsXML(_document) ? "application/xml" : "text/html") +
				"; charset=" + charset
		, serializedDocument
		, serializedHead
		, serializedBody
		, _boolean_temp
	;

	serializedDocument = safe_get_outerHTML_for_FF_and_others(_document.documentElement);

	if(isXML) {//TODO:Do we realy need this???
		serializedDocument = '<?xml version="1.0" encoding="' + charset + '"?>' + serializedDocument;
	}

	//TODO:Do we realy need this???:
	//Let the request entity body be the result of getting the innerHTML attribute on data converted to Unicode and encoded as encoding
	//http://www.webtoolkit.info/javascript-utf8.html

	xhr.setRequestHeader("Content-Type", headerString);

	return serializedDocument;
}

if(!IS_PROGRESS_EVENT_AS_CONSTRUCTOR_SUPPORT) {//ProgressEvent shim
	_Event_prototype = global["Event"] && global["Event"].prototype || {};

	/**
	 * The initProgressEvent method must initialize the event in a manner analogous to the similarly-named method in the DOM Events interfaces.
	 * @param {string} typeArg
	 * @param {boolean} canBubbleArg
	 * @param {boolean} cancelableArg
	 * @param {boolean} lengthComputableArg
	 * @param {number} loadedArg
	 * @param {number} totalArg
	 */
	_ProgressEvent_prototype_initProgressEvent = function(typeArg, canBubbleArg, cancelableArg, lengthComputableArg, loadedArg, totalArg) {
		this.initEvent(typeArg, canBubbleArg, cancelableArg);
		this["lengthComputable"] = lengthComputableArg;
		this["loaded"] = loadedArg;
		this["total"] = totalArg;
	};

	_shimed_ProgressEvent = function(eventType, dict) {
		var e;

		try {
			e = _document_createEvent("ProgressEvent");
		}
		catch(__e__) {
			e = _document_createEvent("Event");
			e["initProgressEvent"] = _ProgressEvent_prototype_initProgressEvent;
		}

		//TODO::
		// dict.lengthComputable
		// dict.loadedArg
		// dict.totalArg
		this.initProgressEvent(eventType, dict.bubbles || false, dict.cancelable || false, false, 0, 0);

		return e;
	};
	if(!(_shimed_ProgressEvent.prototype = _ProgressEvent && _ProgressEvent.prototype)) {
		try {
			_shimed_ProgressEvent.prototype = Object.create(_Event_prototype);
			_shimed_ProgressEvent.prototype.constructor = _ProgressEvent;
		}
		catch(__e__) {
			_ProgressEvent.prototype = _Event_prototype;
		}
	}

	global["ProgressEvent"] = _shimed_ProgressEvent;
}

/**
 * @constructor
 */
function XMLHttpRequest2() {
	/** @type {XMLHttpRequest} */
	this.nativeXHR = getNewXhr();

	this["_"] = {};
}
XMLHttpRequest2["UNSET"] = 0;
XMLHttpRequest2["OPENED"] = 1;
XMLHttpRequest2["HEADERS_RECEIVED"] = 2;
XMLHttpRequest2["LOADING"] = 3;
XMLHttpRequest2["DONE"] = 4;

if(!IS_XHR_SUPPORT_ON_EVENTS) {
	/**
	 * @param {string} suspectEventType
	 * @param {Event} eventObj
	 * @this {XMLHttpRequest2}
	 */
	XMLHttpRequest2_onevent = function(suspectEventType, eventObj) {
		eventObj && eventObj.type == suspectEventType || (eventObj = _shimed_ProgressEvent(suspectEventType));
		this["dispatchEvent"](eventObj);
	}
}

XMLHttpRequest2_properties = {
	"response" : function() {
		return this.nativeXHR.shimResponse !== void 0 ? this.nativeXHR.shimResponse : this.nativeXHR.response;
	}

	, "responseText" : function() {
		return this.nativeXHR.shimResponseText !== void 0 ? this.nativeXHR.shimResponseText : this.nativeXHR.responseText;
	}

	, "responseXML" : function() {
		return this.nativeXHR.shimResponseXML !== void 0 ? this.nativeXHR.shimResponseXML : this.nativeXHR.responseXML;
	}

	, "responseType" : {
		"get" : function() {
			return this.nativeXHR.shimResponseType || this.nativeXHR.responseType;
		}
		, "set" : function(val) {
			var readySate
				, xhr = this.nativeXHR
			;
			
			if(!IS_XHR_SUPPORT_RESPONSE) {//TODO:: test error and message
				if((this["_"].__isAsync__ && val && val != "text")//Non-text async request not allowed
					|| xhr.readyState > 1) {
					_throwDOMException("INVALID_STATE_ERR");
				}
			}

			if(val in XHR_SUPPORT_MAP_RESPONSETYPE) {
				delete this.nativeXHR.shimResponseType;
				
				xhr.responseType = val;
			}
			else {
				if(xhr.readyState > 1) {
					throw new Error("INVALID_STATE_ERR");
				}

				xhr.shimResponseType = val;
			}
			return val;
		}
	}

	, "status" : function() {
		return this.nativeXHR.shimStatus || this.nativeXHR.status;
	}
	
	, "statusText" : function() {
		return this.nativeXHR.shimStatusText || this.nativeXHR.statusText;
	}

	, "readyState" : function() {
		return this.nativeXHR.readyState;
	}

	, "timeout" : {
		"get" : function() {
			return this.nativeXHR.timeout || 0;
		}
		, "set" : function(val) {
			this.nativeXHR.timeout = val || 0;
			return val;
		}
	}

	, "onreadystatechange" : null
	
	, "UNSET" : 0
	, "OPENED" : 1
	, "HEADERS_RECEIVED" : 2
	, "LOADING" : 3
	, "DONE" : 4
};

_xhr_onevents.forEach(function(key) {
	key = "on" + key;

	var _local__IS_SUPPORN_THIS_ON_EVENT = IS_XHR_SUPPORT_CORS && IS_XHR_IMPLIMENT_EVENT_TARGET && XHR_SUPPORT_MAP_ON_EVENTS[key];
	
	this[key] = {
		"get" : _local__IS_SUPPORN_THIS_ON_EVENT ?
			function() {
				return this.nativeXHR[key];
			}
			:
			function() {
				return this["_"]["__on__" + key];
			}
		, "set" : _local__IS_SUPPORN_THIS_ON_EVENT ?
			function(val) {
				return this.nativeXHR[key] = val.bind(this);
			}
			:
			function(val) {
				this["_"]["__on__" + key] = val.bind(this);
				this.nativeXHR[key] = function(e) {
					this["dispatchEvent"](e);
				}.bind(this);
				return val;
			}
	};
}, XMLHttpRequest2_properties);

if(IS_XHR_SUPPORT_UPLOAD) {//TODO:: remove this check and provide an upload shim
	XMLHttpRequest2_properties["upload"] = IS_XHR_SUPPORT_UPLOAD ? 
		function() {
			return this.nativeXHR.upload;
		}
		:
		function() {
			//TODO:: return this["_"].shimedUpload || (this["_"].shimedUpload = new _XMLHttpRequestUpload(this.nativeXHR);
		}
}
if(IS_XHR_SUPPORT_WITHCREDENTIALS /* || CORS_SHIM*/) {
	XMLHttpRequest2_properties["withCredentials"] = {
		"get" : function() {
			return this.nativeXHR.withCredentials;
		}
		, "set" : function(val) {
			this.nativeXHR.withCredentials = val || false;
		}
	}
}

XMLHttpRequest2.prototype["addEventListener"] = function(eventType, handler, capture) {
	var _ = this["_"]
		, a
	;

	if(!(_ = _[(a = UUID_PREFIX + eventType)]))_ = _[a] = {};
	if(!(a = handler["__uuid__"]))a = handler["__uuid__"] = (capture ? "0" : "1") + UUID_PREFIX + ++UUID;
	if(!_[a])_[a] = b.bind(this);

	if(IS_XHR_SUPPORT_CORS && IS_XHR_IMPLIMENT_EVENT_TARGET) {
		this.nativeXHR.addEventListener(eventType, _[a], capture)
	}
};

XMLHttpRequest2.prototype["dispatchEvent"] = IS_XHR_SUPPORT_CORS && IS_XHR_IMPLIMENT_EVENT_TARGET ?
	function() {
		return this.nativeXHR["dispatchEvent"].apply(this.nativeXHR, arguments)
	}
	:
	function(e) {
		var thisObj = this
			, _ = thisObj["_"]
			, handler = _["__on__on" + e.type]
			, keys
		;

		keys = Object.keys(_ = _[UUID_PREFIX + e.type] || {}).sort();

		e.target = thisObj;
		e.stopImmidiatePropagation = function() {
			this.__stopIt = true;
		};

		do {
			if(handler) {
				if(typeof handler === "object") {
					thisObj = handler;
					if(!(handler = handler.handleEvent))continue;
				}
				if(typeof handler === "function") {
					if((result = handler.call(thisObj, e)) === false || e.__stopIt)break;
				}
			}
		} while(handler = _[keys.shift()]);
			
		return result == void 0 ? true : result;
};
XMLHttpRequest2.prototype["removeEventListener"] = function(eventType, handler, capture) {
	var _
		, uuid = handler && handler["__uuid__"]
	;

	if(uuid && (_ = this["_"]) && (_ = _[UUID_PREFIX + eventType])) {
		if(IS_XHR_SUPPORT_CORS && IS_XHR_IMPLIMENT_EVENT_TARGET) {
			this.nativeXHR.removeEventListener(eventType, _[uuid], capture);
		}
		delete _[uuid];
	}
};

XMLHttpRequest2.prototype["abort"] = function() {
	this.nativeXHR.abort();
	if(!IS_XHR_SUPPORT_ONABORT) {
		this["dispatchEvent"](_shimed_ProgressEvent("abort"));
	}
};

XMLHttpRequest2.prototype["open"] = function(method, uri, isAsync, username, password) {
	// http://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#the-open()-method

	var thisObj = this
		, _ = thisObj["_"]
		, xhr = thisObj.nativeXHR
		, cors = !IS_XHR_SUPPORT_CORS && CORS_test(thisObj.uri)
	;
	
	if(xhr && xhr.xhrType < 3) {
		XMLHttpRequest2_nativeXHRClear.call(thisObj);
	}

	if(cors && cors.state > 1) {
		thisObj._CORS = cors;
		xhr = XMLHttpRequest2_createNewCORSXhr.call(thisObj);
	}
	else if(!xhr.xhrType) {
		thisObj.nativeXHR = xhr = getNewXhr();
	}

	isAsync = isAsync === void 0 ? true : isAsync;
	_.__method__ = method;
	_.__uri__ = uri;
	_.__isAsync__ = isAsync;
	_.__cors__ = cors; 

	// [jQuery]
	// Open the socket
	// Passing null username, generates a login popup on Opera (http://bugs.jquery.com/ticket/2865)
	if (username) {
		xhr.open(method, uri, isAsync, username, password);
	} else {
		xhr.open(method, uri, isAsync);
	}
};
/**
 * @param {(ArrayBuffer|Blob|Document|String|FormData)} data
 */
XMLHttpRequest2.prototype["send"] = function(data) {
	var thisObj = this
		, xhr = thisObj.nativeXHR
		, _ = thisObj["_"]
		, cors = _.__cors__
		, doNotSend_as_XHR
		, _responseType = thisObj.responseType
	;

	if(thisObj.readyState != 1)_throwDOMException("INVALID_STATE_ERR");

	//TODO::check if  11. If async is false, there is an associated XMLHttpRequest document and either the timeout attribute value is not zero, the withCredentials attribute value is true, or the responseType attribute value is not the empty string, throw an "InvalidAccessError" exception and terminate these steps.

	if(xhr.__method__ != "POST") {//TODO:: what about FormData?
		data = null;
	}

	if(cors && cors.state > 1) {
		if(!__GCC__IELT10_SUPPORT__ || !IS_XDOMAINREQUEST_SUPPORT) {
			throw new Error("CORS with defferent protocol or domain (except subdomain) currently unsupporting");
		}
		else {
			if(xhr.withCredentials) {
				xhr = new XDomainRequesr;//TODO:: this just woudn't work. Need more comples solution
			}
			else {
				throw new Error("CORS request with credentials currently unsupporting");
			}
		}
	}

	if((_responseType == "arraybuffer" || _responseType == "blob") && !(IS_XHR_SUPPORT_RESPONSE && _responseType in XHR_SUPPORT_MAP_RESPONSETYPE)) {
		if(IS_XHR_SUPPORT_OVERRIDE_MIME_TYPE)xhr.overrideMimeType('text\/plain; charset=x-user-defined');
	}

	// fix Opera 12.00 bug
	// http://stackoverflow.com/questions/11284728/how-do-i-access-8-bit-binary-data-from-javascript-in-opera?rq=1
	if(global.opera && global.opera.version() == "12.00" && (_responseType == "arraybuffer"/* || _responseType == "blob"*/) && /^text\//.test(_.overridenMimeType)) {
		this.overrideMimeType('application\/octet-stream; charset=x-user-defined');
	}

	if(!IS_XHR_SUPPORT_ON_EVENTS) {
		_xhr_onevents.forEach(function(func) {
			func = "on" + func;
			this[func] = XMLHttpRequest2_onevent.bind(this, func);
		}, thisObj);
	}

	xhr.onreadystatechange = shimOnreadystatechange.bind(this);

	if(data && typeof data == "object") {
		if(data instanceof _FormData) {
			if(!IS_XHR_SUPPORT_FORMDATA ) {
				data = _FormData_shim_send.call(data, thisObj, cors);

				if(!(doNotSend_as_XHR = data._isDefaultPrevented)) {
					if (data.boundary) {
						xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary="+ data.boundary);
					}
					else if(!!data.data) {
						xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
					}
				}
			}
			//TODO::
			//if(_method == "GET") {
			//	xhr.open(_method, _url + '?' + _FormData_encodeSimpleFormData(this._pairs));
			//	xhr.setRequestHeader('Content-Type', '*/*');
			//}
			//else {
			// xhr.open(_method, _url);
			// xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			// result = _FormData_encodeSimpleFormData(this._pairs);
			// }
		}
		else if(data instanceof _Document ||
			data.nodeType === 9//IE lt 8
			) {
			//TODO::filter supported browsers
			data = _prepeareDocumentDataForSending(data, xhr);
		}
		else if(data instanceof _ArrayBuffer) {
			//TODO:tested
			//FF https://developer.mozilla.org/en/DOM/XMLHttpRequest#sendAsBinary() ??????
			if(IS_XHR_SUPPORT_SEND_AS_BINARY) {
				data = {
					needSendAsBin : true,
					data : data
				};
			}
		}
		//TODO::else if(data instanceof _Blob) {}
	}

	if(!doNotSend_as_XHR) {
		if(cors && cors.state == 1) {
			document.domain = cors.to;
		}

		if(!IS_XHR_SUPPORT_TIMEOUT && thisObj.timeout !== 0)_.timeoutTimer = setTimeout(function() {
			this.abort();
			thisObj["dispatchEvent"](_shimed_ProgressEvent("timeout"));
		}.bind(thisObj), thisObj.timeout)
		
		if(data && data.needSendAsBin) {
			xhr.sendAsBinary(data.data);
		}
		else {
			xhr.send(data);
		}
		
		if(!IS_XHR_SUPPORT_ON_EVENTS) {
			thisObj["dispatchEvent"](_shimed_ProgressEvent("loadstart"));
		}

		if(cors && cors.state == 1) {
			try {
				document.domain = cors.from;
			}
			catch(e) {
				//Non-IE browsers throw error here
			}
		}
	}

	// [jQuery]
	// if we're in sync mode or it's in cache
	// and has been retrieved directly (IE6 & IE7)
	// we need to manually fire the callback
	if(this.__isAsync__ && xhr.readyState === 4 && !IS_XHR_SUPPORT_ON_EVENTS) {
		this["dispatchEvent"](_shimed_ProgressEvent("progress"));
		this["dispatchEvent"](_shimed_ProgressEvent("load"));
		this["dispatchEvent"](_shimed_ProgressEvent("loadend"));
	}
};

XMLHttpRequest2.prototype["getAllResponseHeaders"] = function () {
	return this.nativeXHR.getAllResponseHeaders();
};
XMLHttpRequest2.prototype["getResponseHeader"] = function (header) {
	return this.nativeXHR.getResponseHeader(header);
};

if(IS_XHR_SUPPORT_OVERRIDE_MIME_TYPE) {
	XMLHttpRequest2.prototype["overrideMimeType"] = function(val) {
		if(global.opera) {
			this["_"].overridenMimeType = val;
		}
		return this.nativeXHR.overrideMimeType.apply(this.nativeXHR, arguments);
	}
}
/*
TODO::
else {
function() {
	 xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
	 }
}
*/

XMLHttpRequest2.prototype["setRequestHeader"] = function() {
	// [jQuery] Need an extra try/catch for cross domain requests in Firefox 3
	try {
		this.nativeXHR.setRequestHeader.apply(this.nativeXHR, arguments);
	} catch(_) {
		if(global['console'])(global['console']['error'] || global['console']['log'])("Cant setRequestHeader")
	}
};



__setProperties(XMLHttpRequest2.prototype, XMLHttpRequest2_properties);

if(__GCC__IELT10_SUPPORT__ && __GCC__IELT9_SUPPORT__ && _browser_msie && !IS_OBJECT_DEFINEPROPERTY_WORKS_ON_OBJECT) {//this code ONLY for IE8-
	XMLHttpRequest2 = __IElt9_createVBClass(XMLHttpRequest2, XMLHttpRequest2_properties);
}



if(!IS_XHR_SUPPORT_CORS) {
	XMLHttpRequest2_createNewCORSXhr = function(xhr, corsDescription) {
		var thisObj = this
			, xhr = thisObj.nativeXHR
			, corsXhr
		;

		if(__GCC__IELT10_SUPPORT__ && IS_XDOMAINREQUEST_SUPPORT) {
			if(!xhr.withCredentials) {
				corsXhr = new XDomainRequesr;
				corsXhr.xhrType = 3;//cors via XDomainRequesr
			}	
		}

		if(!corsXhr) {
			//TODO:: shim
		}
		
		if(!corsXhr) {
			if(xhr.withCredentials) {
				throw new Error("CORS request with credentials currently unsupporting");
			}
			else throw new Error("CORS with defferent protocol or domain (except subdomain) currently unsupporting");
		}
		else {
			corsXhr.shimResponseType = xhr.shimResponseType;
			corsXhr.timeout = xhr.timeout;
			_xhr_onevents.forEach(function(key) {
				corsXhr["on" + key] = this["__on__on" + key];
			}, thisObj["_"]);
			XMLHttpRequest2_nativeXHRClear.call(this);
		}

		return thisObj.nativeXHR = corsXhr;
	}
}


/** @this {XMLHttpRequest2} */
XMLHttpRequest2_nativeXHRClear = function() {
	var xhr = this.nativeXHR;

	if(xhr.readyState == 2 || xhr.readyState == 3) {
			this.abort();
		}
		if(xhr.shimResponseText == "document" && xhr.shimResponse && xhr.shimResponse["__destroy__"]) {//document via iframe
			xhr.shimResponse["__destroy__"]();
		}
		delete xhr.shimResponse;
		delete xhr.shimResponseText;
		delete xhr.shimResponseXML;
		delete xhr.shimStatus;
		delete xhr.shimStatusText;
}
	
/** @this {XMLHttpRequest2} */
shimOnreadystatechange = function(e) {
		var thisObj = this
			, xhr = thisObj.nativeXHR
			, _status
			, _statusText
			, _responseHeaders
			, _responseTypeIsObject
			, _responseType
			, _responseText
			, _tmp_
		;

		//TODO::
		// [jQuery]
		// Firefox throws exceptions when accessing properties
		// of an xhr when a network error occured
		// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
		// http://helpful.knobs-dials.com/index.php/0x80004005_(NS_ERROR_FAILURE)_and_other_firefox_errors#0x80040111_.28NS_ERROR_NOT_AVAILABLE.29

		if (xhr.readyState == 4) {
			_responseType = thisObj.responseType;
			
			if(!IS_XHR_SUPPORT_TIMEOUT && thisObj.timeout !== 0) {
				clearTimeout(xhr["_"].timeoutTimer);
				delete xhr["_"].timeoutTimer;
			}

			_status = xhr.status;
			try { // [jQuery] Firefox throws an exception when accessing statusText for faulty cross-domain requests
				_statusText = xhr.statusText;
			} catch( __e__ ) { }

			_responseHeaders = !!xhr.getAllResponseHeaders();

			// [jQuery]
			// Filter status for non standard behaviours
			// (so many they seem to be the actual "standard")
			_status =
				// Opera returns 0 when it should be 304
				// Webkit returns 0 for failing cross-domain no matter the real status
				_status === 0 ?
					(
						! thisObj._CORS || _statusText ? // Webkit, Firefox: filter out faulty cross-domain requests
							(
								_responseHeaders ? // Opera: filter out real aborts http://bugs.jquery.com/ticket/6060
									304
									:
									0
								)
							:
							302 // We assume 302 but could be anything cross-domain related
						)
					:
					(
						_status == 1223 ?	// IE sometimes returns 1223 when it should be 204 (see http://bugs.jquery.com/ticket/1450)
							204
							:
							_status
						);

			xhr.shimStatus = _status;

			// [jQuery] We normalize with Webkit giving an empty statusText
			xhr.shimStatusText = _statusText || _status + "";

			if(_status === 200) {
				try {//accsess testing
					_tmp_ = xhr.responseXML;
					_responseText = xhr.responseText;
				}
				catch(__e__) {
					xhr.shimSesponseXML = null;
					xhr.shimResponseText = "";
					_responseText = void 0;
				}

				if(xhr.responseType === _responseType && IS_XHR_SUPPORT_RESPONSE && _responseType in XHR_SUPPORT_MAP_RESPONSETYPE) {
					//Good browser -> do nothing
				}
				else if(!!_responseText) {
					switch(_responseType) {
						case "arraybuffer":
							// Array Buffer Firefox
							if ('mozResponseArrayBuffer' in xhr) {
								xhr.shimResponse = xhr.mozResponseArrayBuffer;
							}
							// Internet Explorer (Byte array accessible through VBScript -- convert to text)
							// http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie/3050364
							else if (__GCC__IELT10_SUPPORT__ && 'responseBody' in xhr) {
								xhr.shimResponse = convertResponseBodyToText(xhr['responseBody']);
							}
							// Older Browsers
							else {
								//TODO:: arraybuffer for Opera < 12
								throw new Error("Can't get response as ArrayBuffer")
							}
							break;

						case "json":
							try {
								xhr.shimResponse = JSON.parse(_responseText);
							}
							catch(__e__) {
								xhr.shimResponse = null;
							}
							break;

						case "document":
							if(!this.responseXML || !("querySelector" in this.responseXML)) {
								//Note: we can use this.responseXML for IE < 9 but it's useless due to this.responseXML in IE < 9 is an ActiveXObject, so we can't add methods like "querySelector" to it
								if(!_DOMParser)throw new Error("XMLHttpRequest.responseType=='document' not supported in this browser");

								xhr.shimResponse =
									(XMLHttpRequest2.DOMParser || (XMLHttpRequest2.DOMParser = new _DOMParser))["parseFromString"](_responseText, "text/html");
							}
							break;

						case "blob":
							//TODO::
							break;

						case "text":
						default:
							xhr.shimResponse = xhr.responseText;
					}
				}
				else {
					if(!_responseType/* == ""*/ || _responseType === "text") {
						xhr.shimResponse = "";
					}
					else {
						xhr.shimResponse = null;
					}
				}

				xhr.onreadystatechange = _function_noop;

				if(!IS_XHR_SUPPORT_ON_EVENTS) {
					thisObj["dispatchEvent"](_shimed_ProgressEvent("load"));
					thisObj["dispatchEvent"](_shimed_ProgressEvent("loadend"));
				}
			}
			else if(!IS_XHR_SUPPORT_ON_EVENTS) {
				thisObj["dispatchEvent"](_shimed_ProgressEvent("error"));
				thisObj["dispatchEvent"](_shimed_ProgressEvent("loadend"));
			}
		}
		else {
			if(!IS_XHR_SUPPORT_ON_EVENTS) {
				thisObj["dispatchEvent"](_shimed_ProgressEvent("progress"));
			}
		}

		if(typeof thisObj.onreadystatechange == "function")thisObj.onreadystatechange(e);
	}

_fakeFormDataWithFileInputs_ondone = function(response) {
	var xhr = this.nativeXHR = {};
	xhr.readyState = 4;
	xhr.status = 200;
	xhr.responseText = xhr.response = xhr.responseBody = response;
	xhr.responseXML = null;
	xhr._onreadystatechange({});
};
_fakeFormDataWithFileInputs_onerror = function(response) {
	var xhr = this.nativeXHR = {};
	xhr.readyState = 4;
	xhr.status = response["status"] || -1;//error
	xhr.responseText = xhr.response = xhr.responseBody = "";
	xhr.responseXML = null;
	xhr._onreadystatechange({});
};

//EXPORT
if(!IS_XHR_SUPPORT_FORMDATA) {
	global["FormData"] = _FormData;
}
global["XMLHttpRequest"] = XMLHttpRequest2;
//TODO::global["XMLHttpRequestUpload"] = _XMLHttpRequestUpload;

_test_XHR = void 0;

})(window);
