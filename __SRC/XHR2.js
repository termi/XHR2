/** @license XMLHttpRequest Level 2 polyfill | @version 0.1 | MIT License | github.com/termi */

// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @warning_level VERBOSE
// @jscomp_warning missingProperties
// @output_file_name a.ielt8.js
// @check_types
// ==/ClosureCompiler==

/*
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

 https://raw.github.com/jquery/jquery/master/src/ajax.js
 https://raw.github.com/jquery/jquery/1d1d4fe112c49cbd704d880b27cc646f2bfe1737/src/ajax/xhr.js
*/

// [[[|||---=== GCC DEFINES START ===---|||]]]
/** @define {boolean} */
var __GCC__INCLUDE_DOMPARSER_SHIM__ = false;
/** @define {boolean} */
var __GCC__IELT10_SUPPORT__ = true;
// [[[|||---=== GCC DEFINES END ===---|||]]]


// CONFIG START
/** @type {string} @const */
var FLASH_CORS_TRANSPORT_SRC = "/cors/flashCORS.swf";
/** @type {string} @const */
var IFRAME_CORS_TRANSPORT_DEFAULT_SRC = "/__CORS_iframe_remote_domain.html";
//CONFIG END

(function(global) {


var
	/** type {Object} original XHR */
	_XMLHttpRequest_ =  global.XMLHttpRequest

	, getNewXhr =
		_XMLHttpRequest_ ?
			function() { return new _XMLHttpRequest_ }
			:
			function() {
				return new ActiveXObject("Microsoft.XMLHTTP");
			}

	, _test_XHR = getNewXhr()
	, _responseType_values_map = {
		"json" : void 0
		, "document" : void 0
		, "arraybuffer" : void 0
		, "text" : void 0
		//TODO::, "blob" : void 0//The is no shim for sending blob for now
	}
	, _FormData = global["FormData"]
	, IS_XHR_SUPPORT_FORMDATA = !!_FormData
	, IS_XHR_SUPPORT_UPLOAD = "upload" in _test_XHR
	, IS_XHR_SUPPORT_TIMEOUT = "timeout" in _test_XHR
	, IS_XHR_SUPPORT_MOZRESPONSETYPE = "mozResponseType" in _test_XHR
	, IS_XHR_SUPPORT_RESPONSE = "response" in _test_XHR
	, IS_XHR_SUPPORT_WITHCREDENTIALS = "withCredentials" in _test_XHR
	, IS_XDOMAINREQUEST_SUPPORT = "XDomainRequest" in global
	, IS_XHR_SUPPORT_CORS = IS_XHR_SUPPORT_WITHCREDENTIALS
	, THE_BEST_BROWSER_EVAR = true
	, XHR_SUPPORT_MAP_RESPONSETYPE = IS_XHR_SUPPORT_RESPONSE && Object.keys(_responseType_values_map).reduce(function(result, key) {
		try {
			_test_XHR.responseType = key;
		}
		catch(e) {}

		if(_test_XHR.responseType === key) {
			result[key] = void 0;
		}
		else {
			THE_BEST_BROWSER_EVAR = false;
		}

		return result;
	}, {})
	, _FormData_encodeSimpleFormData
	, _FormData_encodeDifficaltFormData
	, _FormData_shim_send
;

if(
	IS_XHR_SUPPORT_FORMDATA
	/*TODO:: && IS_XHR_SUPPORT_UPLOAD*/
	&& IS_XHR_SUPPORT_TIMEOUT
	&& IS_XHR_SUPPORT_RESPONSE
	&& THE_BEST_BROWSER_EVAR
	) {
	//Super browser
	return;
}



/** @const */
var UUID_PREFIX = "uuid" + +new Date

	/** @const */
	, _hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
	/** @const */
	, _Function_apply_ = Function.prototype.apply

	, _function_noop = function(){}

	, _DOMParser

	, UUID = 1

	, _Document = global["Document"] || global["HTMLDocument"]

	, _ArrayBuffer = global["ArrayBuffer"]

	, IEBinaryToArray_ByteStr__NAME = __GCC__IELT10_SUPPORT__ && UUID_PREFIX + "IEBinaryToArray_ByteStr"

	, removeScriptTagsFromHTML

	, IS_FILE_SUPPORT = "File" in global
	, IS_XHR_SUPPORT_SEND_AS_BINARY = "sendAsBinary" in _test_XHR
	, IS_XHR_IMPLIMENT_EVENT_TARGET = "addEventListener" in _test_XHR

;

if(__GCC__IELT10_SUPPORT__) {
	function convertResponseBodyToText(byteArray) {
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
		};
		result += "--" + boundary +"--";
		
		return result;
	}


	/**
	 * https://developer.mozilla.org/en/XMLHttpRequest/FormData
	 * https://developer.mozilla.org/en/DOM/XMLHttpRequest/FormData/Using_FormData_Objects
	 * @constructor
	 */
	_FormData = function(_form) {
		var options = this["_options"] = {}
			, _ = this["_"] = {}
		;
		this["__shim__"] = true;

		_.filesCount = 0;
		_.pairs = {};
		
		if(_form) {
			for(var i = 0, l = _form.length ; i < l ; i++) {
				this["append"](_form[i].name, _form[i].value, _form[i].type, _form[i]);
			};

			["method", "action", "enctype", "accept-charset"].forEach(function(attr, attrValue) {
				if((attrValue = _form.getAttribute(attr)) != null) {
					options[attr] = attrValue;
				}
			}, this);
		}
	};
	
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
	
	/** @this {_FormData} */
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
			xhr = _shim_XHR2_object.XHR1,
			frame,
			frameId,
			prevs,
			i = 0,
			l = this._.filesCount,
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

			Object.keys(this._pairs).forEach(function(name) {
				var input = document.createElement("input"),
					value = this._pairs[name];

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
					_shim_XHR2_object._fakeFormDataWithFileInputs_ondone(this.contentDocument.documentElement.innerText);
				}
				catch(e) {
					_shim_XHR2_object._fakeFormDataWithFileInputs_error({"status" : 404});
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

/*
 * https://developer.mozilla.org/en/XMLHttpRequest
 * @constructor

function _XMLHttpRequestUpload() {
	this.onabort = null;
	this.onerror = null;
	this.onload = null;
	this.onloadend = null;
	this.onloadstart = null;
	this.onprogress = null;
}
_XMLHttpRequestUpload.prototype = {
	constructor : _XMLHttpRequestUpload
	, addEventListener : function(a, b, c) {
		document.documentElement.addEventListener.call(this, a, b, c);
	}
	, dispatchEvent : function(e) {
		if(this["on" + e.type])this["on" + e.type](e);

		document.documentElement.dispatchEvent.call(this, e);
	}
	, removeEventListener : function(a, b, c) {
		document.documentElement.removeEventListener.call(this, a, b, c);
	}
}*/


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

	//http://stackoverflow.com/a/817225 //there is no standard that supports this(outerHTML), although IE 6+ and more recently several other browsers now support it
	serializedDocument = _document.documentElement[(_boolean_temp = ("outerHTML" in _document.documentElement)) ? 'outerHTML' : 'innerHTML'];
	if(!serializedDocument) {
		 //Note:: In IE we must do document.head = document.getElementsByTagName('head')[0] before
		serializedHead = _document.head[(_boolean_temp = ("outerHTML" in _document.head)) ? 'outerHTML' : 'innerHTML'];
		serializedDocument = _boolean_temp ? serializedHead : "<head>" + serializedHead + "</head>";
		serializedBody = _document.body[(_boolean_temp = ("outerHTML" in _document.body)) ? 'outerHTML' : 'innerHTML'];
		serializedDocument += _boolean_temp ? serializedBody : "<body>" + serializedBody + "</body>";

		//Note: In particular, if the document cannot be serialized an "InvalidStateError" exception is thrown.
		if(!(serializedHead + serializedBody))throw new Error("InvalidStateError");
	}
	else if(!_boolean_temp)serializedDocument = "<html>" + serializedDocument + "</html>";

	if(isXML) {//TODO:Do we realy need this???
		serializedDocument = '<?xml version="1.0" encoding="' + charset + '"?>' + serializedDocument;
	}

	//TODO:Do we realy need this???:
	//Let the request entity body be the result of getting the innerHTML attribute on data converted to Unicode and encoded as encoding
	//http://www.webtoolkit.info/javascript-utf8.html

	xhr.setRequestHeader("Content-Type", headerString);

	return serializedDocument;
}


/**
 * @constructor
 */
function XMLHttpRequest2() {
	if(IS_XHR_SUPPORT_UPLOAD) {
		//TODO:: this.upload = new _XMLHttpRequestUpload(this.XHR1.upload);
	}
	else {
		//TODO:: new _XMLHttpRequestUpload;
	}
	this._reset();

	/** @type {Function} */
	this.onreadystatechange = null;
	/** @type {number} */
	this.timeout = 0;
	/** @type {boolean} */
	this.withCredentials = false;
	/** @type {String} */
	this.responseType = "";
	/** @type {number} */
	this.status = 0;
}
XMLHttpRequest2["UNSET"] = 0;
XMLHttpRequest2["OPENED"] = 1;
XMLHttpRequest2["HEADERS_RECEIVED"] = 2;
XMLHttpRequest2["LOADING"] = 3;
XMLHttpRequest2["DONE"] = 4;
XMLHttpRequest2.prototype = {
	constructor : XMLHttpRequest2
	, addEventListener : IS_XHR_IMPLIMENT_EVENT_TARGET ? 
		function() {
			return this.XHR1.addEventListener.apply(this.XHR1, arguments)
		}
		:
		function(a, b) {	
			var _;
			if(!(_ = this["_"]))_ = this["_"] = {};
			if(!(_ = _[(a = UUID_PREFIX + a)]))_ = _[a] = {};
			if(!(a = b["uuid"]))a = b["uuid"] = UUID_PREFIX + ++UUID;
			if(!_[a])_[a] = b;
		}
	, dispatchEvent : IS_XHR_IMPLIMENT_EVENT_TARGET ? 
		function() {
			return this.XHR1.dispatchEvent.apply(this.XHR1, arguments)
		}
		:
		function(e) {
			var thisObj = this
			  , _ = thisObj["_"]
			  , handler = thisObj["on" + e.type]
			  , keys
			;

			keys = Object.keys(_ = _[UUID_PREFIX + e.type] || {});
			
			e.target = thisObj;

			do {
				if(handler) {
					if(typeof handler === "object") {
						thisObj = handler;
						if(!(handler = handler.handleEvent))continue;
					}
					handler.call(thisObj, e)
				}
			} while(handler = _[keys.shift()]);
			
		}
	, removeEventListener : IS_XHR_IMPLIMENT_EVENT_TARGET ? 
		function() {
			return this.XHR1.removeEventListener.apply(this.XHR1, arguments)
		}
		:
		function(a, b) {
			var _;
			if(b["uuid"] && (_ = this["_"]) && (_ = _[UUID_PREFIX + a])) {
				delete _[b["uuid"]];
			}
		}
	, _reset : function() {
		/** @type {number} */
		this.readyState = 0;
		/** @type {(Object|String|ArrayBuffer|Blob|Document)} */
		this.response = null;

		/** @type {String} */
		this.responseText = "";
		/** @type {Object} */
		this.responseXML = null;
		/** @type {String} */
		this.statusText = "";

		if(!IS_XHR_SUPPORT_RESPONSE) {
			delete this.XHR1["response"];
		}
	}
	/** @this {XMLHttpRequest2} */
	, _onreadystatechange : function(e) {
		var xhr = this.XHR1
			, _status
			, _statusText
			, _responseHeaders
			, _responseTypeIsObject
			, _responseType = this.responseType
		;

		if(this.timeout !== 0 && !IS_XHR_SUPPORT_TIMEOUT) {
			if(this._time <= Date.now() - this.timeout){ 
				this.XHR1.abort();
				//TODO:: this.dispatchEvent(new Event('abort'));
			}
		}

		//TODO::
		// [jQuery]
		// Firefox throws exceptions when accessing properties
		// of an xhr when a network error occured
		// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)

		if ((this.readyState = xhr.readyState) == 4) {
			_status = xhr.status;
			try { // [jQuery] Firefox throws an exception when accessing statusText for faulty cross-domain requests
				_statusText = xhr.statusText;
			} catch( e ) { }

			_responseHeaders = this.XHR1.getAllResponseHeaders();

			// [jQuery]
			// Filter status for non standard behaviours
			// (so many they seem to be the actual "standard")
			_status =
				// Opera returns 0 when it should be 304
				// Webkit returns 0 for failing cross-domain no matter the real status
				_status === 0 ?
					(
						! this._CORS || _statusText ? // Webkit, Firefox: filter out faulty cross-domain requests
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

			this.status = _status;

			// [jQuery] We normalize with Webkit giving an empty statusText
			this.statusText = _statusText || _status + "";

			if(_status === 200) {
				try {
					this.responseText = xhr.responseText;
					this.responseXML = xhr.responseXML;
				}
				catch(e) {
					this.responseText = "";
					this.responseXML = null;
				}

				_responseTypeIsObject = typeof this.response == "object" && this.response !== null;

				if(xhr.responseType === _responseType && IS_XHR_SUPPORT_RESPONSE && _responseType in XHR_SUPPORT_MAP_RESPONSETYPE) {
					//Good browser
					this.response = xhr.response;
				}
				else if(!!xhr.responseText) {
					switch(_responseType) {
						case "arraybuffer":
							// Array Buffer Firefox
							if ('mozResponseArrayBuffer' in xhr) {
								this.response = xhr.mozResponseArrayBuffer;
							}
							// Array Buffer Chrome //TODO: need this?
							else if (xhr.responseType == _responseType && _responseTypeIsObject) {
								this.response = xhr.response;
							}
							// Internet Explorer (Byte array accessible through VBScript -- convert to text)
							// http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie/3050364
							else if (__GCC__IELT10_SUPPORT__ && 'responseBody' in xhr) {
								this.response = convertResponseBodyToText(xhr.responseBody);
							}
							// Older Browsers
							else {
								//TODO:: arraybuffer for Opera < 12
								throw new Error("Can't get response as ArrayBuffer")
							}
						break;

						case "json":
							try {
								this.response = JSON.parse(xhr.responseText);
							}
							catch(e) {
								this.response = null;
							}
						break;

						case "document":
							if(this.responseXML && "querySelector" in this.responseXML) {
								this.response = this.responseXML;
							}
							else {
								//Note: we can use this.responseXML for IE < 9 but it's useless due to this.responseXML in IE < 9 is an ActiveXObject, so we can't add methods like "querySelector" to it
								this.response = null;
							}

							if(!this.response) {
								if(!_DOMParser)throw new Error("XMLHttpRequest.responseType=='document' not supported in this browser");

								this.response =
									(XMLHttpRequest2.DOMParser || (XMLHttpRequest2.DOMParser = new _DOMParser))["parseFromString"](this.responseText, "text/html");
							}
						break;

						case "blob":
							//TODO::
						break;

						case "text":
						default:
							this.response = xhr.responseText;
					}
				}
				else {
					if(!_responseType/* == ""*/ || _responseType === "text") {
						this.response = "";
					}
					else {
						this.response = null;
					}
				}

				this.XHR1.onreadystatechange = _function_noop;
			}
			else {
				this._onerror(e);
			}

			this._onload(e);
		}

		if(this.onreadystatechange)this.onreadystatechange(e);
	}
	, _onload : function(e) {
		if(!e || e.type != "load")e = new Event("load");
		this.dispatchEvent(e);
	}
	, _onerror : function(e) {
		if(!e || e.type != "error")e = new Event("error");
		this.dispatchEvent(e);
	}
	, _ontimeout : function(e) {
		if(!e || e.type != "timeout")e = new Event("timeout");
		this.dispatchEvent(e);
	}
	, _fakeFormDataWithFileInputs_ondone : function(response) {
		var xhr = this.XHR1 = {};
		xhr.readyState = 4;
		xhr.status = 200;
		xhr.responseText = xhr.response = xhr.responseBody = response;
		xhr.responseXML = null;
		xhr._onreadystatechange({});
	}
	, _fakeFormDataWithFileInputs_error : function(response) {
		var xhr = this.XHR1 = {};
		xhr.readyState = 4;
		xhr.status = response["status"] || -1;//error
		xhr.responseText = xhr.response = xhr.responseBody = "";
		xhr.responseXML = null;
		xhr._onreadystatechange({});
	}
	, "abort" : function() {
		this.XHR1.abort.apply(this.XHR1, arguments);
	}
	, "getAllResponseHeaders" : function () {
		return this.XHR1.getAllResponseHeaders();
	}
	, "getResponseHeader" : function (header) {
		return this.XHR1.getResponseHeader(header);
	}
	, "open" : function(method, uri, isAsync, username, password) {
		this.XHR1 = getNewXhr();

		this._reset();

		this.__method__ = method;
		this.__uri__ = uri;
		this.__isAsync__ = isAsync;

		// [jQuery]
		// Open the socket
		// Passing null username, generates a login popup on Opera (http://bugs.jquery.com/ticket/2865)
		if (username) {
			this.XHR1.open(method, uri, isAsync, username, password);
		} else {
			this.XHR1.open(method, uri, isAsync);
		}
		this.status = this.XHR1.status;
	}
	, "overrideMimeType" : function() {
		/* TODO:: ???
			if (xml.overrideMimeType) {
			    xml.overrideMimeType('text/plain; charset=x-user-defined');
			} else {
			    xml.setRequestHeader('Accept-Charset', 'x-user-defined');
			}
		*/
		this.XHR1.overrideMimeType.apply(this.XHR1, arguments);
	}
	, "setRequestHeader" : function() {
		// [jQuery] Need an extra try/catch for cross domain requests in Firefox 3
		try {
			this.XHR1.setRequestHeader.apply(this.XHR1, arguments);
		} catch(_) {
			if(global['console'])(global['console']['error'] || global['console']['log'])("Cant setRequestHeader")
		}
	}
	/**
	 * @param {(ArrayBuffer|Blob|Document|String|FormData)} data
	 */
	, "send" : function(data) {
		var thisObj = this
		   , xhr = thisObj.XHR1
		   , cors = !IS_XHR_SUPPORT_CORS && CORS_test(thisObj.__uri__)
		   , doNotSend_as_XHR
		   , _responseType = thisObj.responseType
		;
		
		if(thisObj.__method__ != "POST") {//TODO:: what about FormData?
			data = null;
		}

		if(cors && cors.state > 1) {
			if(!__GCC__IELT10_SUPPORT__ || !IS_XDOMAINREQUEST_SUPPORT) {
				throw new Error("CORS with defferent protocol or domain (except subdomain) currently unsupporting");
			}
			else {
				if(!thisObj.withCredentials) {
					xhr = new XDomainRequesr;
				}
				else {
					throw new Error("CORS request with credentials currently unsupporting");
				}
			}
			
			this._CORS = cors;
		}
		
		if((_responseType == "arraybuffer" || _responseType == "blob") && !(IS_XHR_SUPPORT_RESPONSE && _responseType in XHR_SUPPORT_MAP_RESPONSETYPE)) {
			if("overrideMimeType" in this.XHR1)this.XHR1.overrideMimeType('text\/plain; charset=x-user-defined');
		}

		if(!(_responseType in _responseType_values_map)) {
			_responseType = thisObj.responseType = "";
		}

		if(IS_XHR_SUPPORT_MOZRESPONSETYPE) {//FF
			xhr["mozResponseType"] = thisObj.responseType;
		}
		else {
			xhr.responseType = IS_XHR_SUPPORT_RESPONSE && _responseType in XHR_SUPPORT_MAP_RESPONSETYPE && _responseType || "";
		}

		xhr.withCredentials = thisObj.withCredentials;
		xhr.timeout = +thisObj.timeout >>> 0;
		if(thisObj.timeout !== 0 && !IS_XHR_SUPPORT_TIMEOUT)thisObj._time = +new Date;
		xhr.ontimeout = thisObj._ontimeout;

		xhr.onreadystatechange = this._onreadystatechange.bind(this);

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
				/*else {
					xhr.open(_method, _url);
					xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
					result = _FormData_encodeSimpleFormData(this._pairs);
				}*/
			}
			else if(data instanceof _Document ||
				data.nodeType === 9//IE lt 8
			   ) {
				//TODO::filter supported browsers
			   	data = _prepeareDocumentDataForSending(data, thisObj.XHR1);
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
			
			if(data && data.needSendAsBin) {
				thisObj.XHR1.sendAsBinary(data.data);
			}
			else {
				thisObj.XHR1.send(data);
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
		if(this.__isAsync__ && thisObj.XHR1.readyState === 4) {
			this.dispatchEvent(new Event("load"));
		}
	}
	, "UNSET" : 0
	, "OPENED" : 1
	, "HEADERS_RECEIVED" : 2
	, "LOADING" : 3
	, "DONE" : 4
};

if(!("overrideMimeType" in _test_XHR))delete XMLHttpRequest2.prototype["overrideMimeType"];

//EXPORT
global["FormData"] = _FormData;
global["XMLHttpRequest"] = XMLHttpRequest2;
//TODO::global["XMLHttpRequestUpload"] = _XMLHttpRequestUpload;

_test_XHR = void 0;

})(window);
