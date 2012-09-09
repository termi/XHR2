XHR2
====

XMLHttpRequest Level 2 shim

## Status

	beta (testing)

## Goal
- Made work with XHR2 easy and transparent in older browsers
- FormData and CORS
- xhr.response and xhr.responseType = arraybuffer/json/document/text (don't know how to emulate xhr.responseType=blob)
- xhr.timeout
- support for IE6+ (working in progress)

## Fixing XHR2 implementation
- xhr.responseType = "json" in Chrome
- xhr.responseType = "document" with HTMLDocument response support in Opera

## TODO
- Massive testing
- CORS (flash and iframe)

## License

    MIT
