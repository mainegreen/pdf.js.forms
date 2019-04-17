"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PDFDataTransportStream = void 0;

var _util = require("../shared/util");

var PDFDataTransportStream = function PDFDataTransportStreamClosure() {
  function PDFDataTransportStream(params, pdfDataRangeTransport) {
    (0, _util.assert)(pdfDataRangeTransport);
    this._queuedChunks = [];
    this._progressiveDone = params.progressiveDone || false;
    const initialData = params.initialData;

    if (initialData && initialData.length > 0) {
      let buffer = new Uint8Array(initialData).buffer;

      this._queuedChunks.push(buffer);
    }

    this._pdfDataRangeTransport = pdfDataRangeTransport;
    this._isStreamingSupported = !params.disableStream;
    this._isRangeSupported = !params.disableRange;
    this._contentLength = params.length;
    this._fullRequestReader = null;
    this._rangeReaders = [];

    this._pdfDataRangeTransport.addRangeListener((begin, chunk) => {
      this._onReceiveData({
        begin,
        chunk
      });
    });

    this._pdfDataRangeTransport.addProgressListener((loaded, total) => {
      this._onProgress({
        loaded,
        total
      });
    });

    this._pdfDataRangeTransport.addProgressiveReadListener(chunk => {
      this._onReceiveData({
        chunk
      });
    });

    this._pdfDataRangeTransport.addProgressiveDoneListener(() => {
      this._onProgressiveDone();
    });

    this._pdfDataRangeTransport.transportReady();
  }

  PDFDataTransportStream.prototype = {
    _onReceiveData: function PDFDataTransportStream_onReceiveData(args) {
      let buffer = new Uint8Array(args.chunk).buffer;

      if (args.begin === undefined) {
        if (this._fullRequestReader) {
          this._fullRequestReader._enqueue(buffer);
        } else {
          this._queuedChunks.push(buffer);
        }
      } else {
        var found = this._rangeReaders.some(function (rangeReader) {
          if (rangeReader._begin !== args.begin) {
            return false;
          }

          rangeReader._enqueue(buffer);

          return true;
        });

        (0, _util.assert)(found);
      }
    },

    get _progressiveDataLength() {
      return this._fullRequestReader ? this._fullRequestReader._loaded : 0;
    },

    _onProgress: function PDFDataTransportStream_onDataProgress(evt) {
      if (evt.total === undefined) {
        let firstReader = this._rangeReaders[0];

        if (firstReader && firstReader.onProgress) {
          firstReader.onProgress({
            loaded: evt.loaded
          });
        }
      } else {
        let fullReader = this._fullRequestReader;

        if (fullReader && fullReader.onProgress) {
          fullReader.onProgress({
            loaded: evt.loaded,
            total: evt.total
          });
        }
      }
    },

    _onProgressiveDone() {
      if (this._fullRequestReader) {
        this._fullRequestReader.progressiveDone();
      }

      this._progressiveDone = true;
    },

    _removeRangeReader: function PDFDataTransportStream_removeRangeReader(reader) {
      var i = this._rangeReaders.indexOf(reader);

      if (i >= 0) {
        this._rangeReaders.splice(i, 1);
      }
    },
    getFullReader: function PDFDataTransportStream_getFullReader() {
      (0, _util.assert)(!this._fullRequestReader);
      var queuedChunks = this._queuedChunks;
      this._queuedChunks = null;
      return new PDFDataTransportStreamReader(this, queuedChunks, this._progressiveDone);
    },
    getRangeReader: function PDFDataTransportStream_getRangeReader(begin, end) {
      if (end <= this._progressiveDataLength) {
        return null;
      }

      var reader = new PDFDataTransportStreamRangeReader(this, begin, end);

      this._pdfDataRangeTransport.requestDataRange(begin, end);

      this._rangeReaders.push(reader);

      return reader;
    },
    cancelAllRequests: function PDFDataTransportStream_cancelAllRequests(reason) {
      if (this._fullRequestReader) {
        this._fullRequestReader.cancel(reason);
      }

      var readers = this._rangeReaders.slice(0);

      readers.forEach(function (rangeReader) {
        rangeReader.cancel(reason);
      });

      this._pdfDataRangeTransport.abort();
    }
  };

  function PDFDataTransportStreamReader(stream, queuedChunks, progressiveDone = false) {
    this._stream = stream;
    this._done = progressiveDone || false;
    this._filename = null;
    this._queuedChunks = queuedChunks || [];
    this._loaded = 0;

    for (const chunk of this._queuedChunks) {
      this._loaded += chunk.byteLength;
    }

    this._requests = [];
    this._headersReady = Promise.resolve();
    stream._fullRequestReader = this;
    this.onProgress = null;
  }

  PDFDataTransportStreamReader.prototype = {
    _enqueue: function PDFDataTransportStreamReader_enqueue(chunk) {
      if (this._done) {
        return;
      }

      if (this._requests.length > 0) {
        var requestCapability = this._requests.shift();

        requestCapability.resolve({
          value: chunk,
          done: false
        });
      } else {
        this._queuedChunks.push(chunk);
      }

      this._loaded += chunk.byteLength;
    },

    get headersReady() {
      return this._headersReady;
    },

    get filename() {
      return this._filename;
    },

    get isRangeSupported() {
      return this._stream._isRangeSupported;
    },

    get isStreamingSupported() {
      return this._stream._isStreamingSupported;
    },

    get contentLength() {
      return this._stream._contentLength;
    },

    async read() {
      if (this._queuedChunks.length > 0) {
        var chunk = this._queuedChunks.shift();

        return {
          value: chunk,
          done: false
        };
      }

      if (this._done) {
        return {
          value: undefined,
          done: true
        };
      }

      var requestCapability = (0, _util.createPromiseCapability)();

      this._requests.push(requestCapability);

      return requestCapability.promise;
    },

    cancel: function PDFDataTransportStreamReader_cancel(reason) {
      this._done = true;

      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({
          value: undefined,
          done: true
        });
      });

      this._requests = [];
    },

    progressiveDone() {
      if (this._done) {
        return;
      }

      this._done = true;
    }

  };

  function PDFDataTransportStreamRangeReader(stream, begin, end) {
    this._stream = stream;
    this._begin = begin;
    this._end = end;
    this._queuedChunk = null;
    this._requests = [];
    this._done = false;
    this.onProgress = null;
  }

  PDFDataTransportStreamRangeReader.prototype = {
    _enqueue: function PDFDataTransportStreamRangeReader_enqueue(chunk) {
      if (this._done) {
        return;
      }

      if (this._requests.length === 0) {
        this._queuedChunk = chunk;
      } else {
        var requestsCapability = this._requests.shift();

        requestsCapability.resolve({
          value: chunk,
          done: false
        });

        this._requests.forEach(function (requestCapability) {
          requestCapability.resolve({
            value: undefined,
            done: true
          });
        });

        this._requests = [];
      }

      this._done = true;

      this._stream._removeRangeReader(this);
    },

    get isStreamingSupported() {
      return false;
    },

    async read() {
      if (this._queuedChunk) {
        let chunk = this._queuedChunk;
        this._queuedChunk = null;
        return {
          value: chunk,
          done: false
        };
      }

      if (this._done) {
        return {
          value: undefined,
          done: true
        };
      }

      var requestCapability = (0, _util.createPromiseCapability)();

      this._requests.push(requestCapability);

      return requestCapability.promise;
    },

    cancel: function PDFDataTransportStreamRangeReader_cancel(reason) {
      this._done = true;

      this._requests.forEach(function (requestCapability) {
        requestCapability.resolve({
          value: undefined,
          done: true
        });
      });

      this._requests = [];

      this._stream._removeRangeReader(this);
    }
  };
  return PDFDataTransportStream;
}();

exports.PDFDataTransportStream = PDFDataTransportStream;