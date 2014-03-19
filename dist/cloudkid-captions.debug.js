!function() {
    function _timeCodeToMilliseconds(input) {
        var lastPeriodIndex = input.lastIndexOf("."), ms = parseInt(input.substr(lastPeriodIndex + 1), 10), parts = input.substr(0, lastPeriodIndex).split(":"), h = 36e5 * parseInt(parts[0], 10), m = 6e3 * parseInt(parts[1], 10), s = 1e3 * parseInt(parts[2], 10);
        return h + m + s + ms;
    }
    var Audio = cloudkid.Audio, Captions = function(captionDictionary, isSlave) {
        this.isSlave = !!isSlave, this.initialize(captionDictionary);
    }, p = Captions.prototype;
    p._captionDict = null, p._textField = null, p._completeCallback = null, p._lines = null, 
    p._currentDuration = 0, p._currentTime = 0, p._currentLine = -1, p._lastActiveLine = -1, 
    p._playing = !1;
    var _instance = null, _muteAll = !1;
    p.isSlave = !1, p.textIsProp = !0, p._isDestroyed = !1, p._boundUpdate = null, p._boundComplete = null, 
    Captions.VERSION = "1.0.0", Captions.init = function(captionDictionary, isSlave) {
        _instance = new Captions(captionDictionary, isSlave);
    }, Object.defineProperty(Captions, "instance", {
        get: function() {
            return _instance;
        }
    }), p.initialize = function(captionDictionary) {
        if (this._lines = [], !(this.isSlave || Audio && Audio.instance)) throw "cloudkid.Audio must be loaded before captions are available";
        this.setDictionary(captionDictionary), this._boundUpdate = this._updatePercent.bind(this), 
        this._boundComplete = this._onSoundComplete.bind(this);
    }, Captions.setMuteAll = function(muteAll) {
        _muteAll = muteAll, _instance && _instance._updateCaptions();
    }, Captions.getMuteAll = function() {
        return _muteAll;
    }, p.setDictionary = function(dict) {
        if (dict) {
            this._captionDict = dict;
            var timeFormat = /[0-9]+\:[0-9]{2}\:[0-9]{2}\.[0-9]{3}/;
            for (var alias in dict) {
                var lines = Array.isArray(dict[alias]) ? dict[alias] : dict[alias].lines;
                if (lines) for (var i = 0, len = lines.length; len > i; ++i) {
                    var l = lines[i];
                    "string" == typeof l.start && (l.start = timeFormat.test(l.start) ? _timeCodeToMilliseconds(l.start) : parseInt(l.start, 10)), 
                    "string" == typeof l.end && (l.end = timeFormat.test(l.end) ? _timeCodeToMilliseconds(l.end) : parseInt(l.end, 10));
                } else Debug.log("alias '" + alias + "' has no lines!");
            }
        }
    }, p.setTextField = function(field) {
        this._textField && (this.textIsProp ? this._textField.text = "" : this._textField.setText("")), 
        this._textField = field || null;
    }, p.hasCaption = function(alias) {
        return this._captionDict ? !!this._captionDict[alias] : !1;
    }, p._load = function(data) {
        return this._isDestroyed ? void 0 : (this._reset(), data ? (this._lines = data.lines, 
        void 0) : (this._lines = null, void 0));
    }, p._reset = function() {
        this._currentLine = -1, this._lastActiveLine = -1;
    }, p.isPlaying = function() {
        return this._playing;
    }, p._calcCurrentDuration = function() {
        var lines = this._lines;
        return lines ? lines[lines.length - 1].end : 0;
    }, Object.defineProperty(p, "currentDuration", {
        get: function() {
            return this._currentDuration;
        }
    }), p.play = function(alias, callback) {
        this._completeCallback = callback, this._playing = !0, this._load(this._captionDict[alias]), 
        this.isSlave ? this._currentDuration = this._calcCurrentDuration() : (this._currentDuration = 1e3 * Audio.instance.getLength(alias), 
        Audio.instance.play(alias, this._boundComplete, this._boundUpdate)), this.seek(0);
    }, p.run = function(alias) {
        return this._completeCallback = null, this._load(this._captionDict[alias]), this._currentDuration = this.isSlave ? this._calcCurrentDuration() : 1e3 * Audio.instance.getLength(alias), 
        this.seek(0), this._boundUpdate;
    }, p._onSoundComplete = function() {
        var callback = this._completeCallback;
        this.stop(), callback && callback();
    }, p.stop = function() {
        !this.isSlave && this._playing && (Audio.instance.stop(), this._playing = !1), this._lines = null, 
        this._completeCallback = null, this._reset(), this._updateCaptions();
    }, p.seek = function(time) {
        var currentTime = this._currentTime = time, lines = this._lines;
        if (!lines) return this._updateCaptions(), void 0;
        if (currentTime < lines[0].start) return currentLine = this._lastActiveLine = -1, 
        this._updateCaptions(), void 0;
        for (var len = lines.length, i = 0; len > i; i++) {
            if (currentTime >= lines[i].start && currentTime <= lines[i].end) {
                this._currentLine = this._lastActiveLine = i, this._updateCaptions();
                break;
            }
            currentTime > lines[i].end && (this._lastActiveLine = i, this._currentLine = -1);
        }
    }, p._updatePercent = function(progress) {
        this._isDestroyed || (this._currentTime = progress * this._currentDuration, this._calcUpdate());
    }, p.updateTime = function(elapsed) {
        this._isDestroyed || (this._currentTime += elapsed, this._calcUpdate());
    }, p._calcUpdate = function() {
        var lines = this._lines;
        if (lines) {
            var len = lines.length, nextLine = this._lastActiveLine + 1, lastLine = len - 1, currentTime = this._currentTime;
            currentTime >= lines[lastLine].end ? (this._currentLine = -1, this._updateCaptions()) : lastLine >= nextLine && currentTime >= lines[nextLine].start && currentTime <= lines[nextLine].end ? (this._currentLine = this._lastActiveLine = nextLine, 
            this._updateCaptions()) : -1 != this._currentLine && currentTime > lines[this._currentLine].end && (this._lastActiveLine = this._currentLine, 
            this._currentLine = -1, this._updateCaptions());
        }
    }, p._updateCaptions = function() {
        if (this._textField) {
            var text = -1 == this._currentLine || _muteAll ? "" : this._lines[this._currentLine].content;
            this.textIsProp ? this._textField.text = text : this._textField.setText(text);
        }
    }, p.destroy = function() {
        this._isDestroyed || (this._isDestroyed = !0, _instance === this && (_instance = null), 
        this._captionDict = null, this._lines = null);
    }, namespace("cloudkid").Captions = Captions;
}();