(function(){
	
	// Imports
	var Audio = cloudkid.Audio;
	
	/**
	* A class that creates captioning for multimedia content. Captions are
	* created from a dictionary of captions and can be played by alias. Captions 
	* is a singleton class and depends on `cloudkid.Audio` for the progress update.
	*
	* @example
		var captionsDictionary = {
			"Alias1": [
				{"start":0, "end":2000, "content":"Ohh that looks awesome!"}
			],
			"Alias2": [
				{"start":0, "end":2000, "content":"Love it, absolutely love it!"}
			]
		};
	
		var captions = new cloudkid.Captions(captionsDictionary);
		captions.play("Alias1");
	*
	* @class cloudkid.Captions
	* @constructor
	* @namespace cloudkid
	* @param {Dictionary} captionDictionary The dictionary of captions
	* @author Matt Moore, matt@cloudkid.com
	*/
	var Captions = function(captionDictionary, isSlave)
	{
		this.isSlave = !!isSlave;
		this.initialize(captionDictionary);
	};
	
	/** 
	* Reference to the inherieted task 
	* 
	* @private
	* @property {Object} p
	*/
	var p = Captions.prototype;
	
	/** 
	* An object used as a dictionary with keys that should be the same as sound aliases
	* 
	* @private
	* @property {Dictionary} _captionDict
	*/
	p._captionDict = null;
	
	/** 
	* A reference to the CreateJS Text object that Captions should be controlling. 
	*	Only one text field can be controlled at a time.
	*
	* @private
	* @property {Text} _textField
	*/
	p._textField = null;
	
	/** 
	* The function to call when playback is complete. 
	*
	* @private
	* @property {Function} _completeCallback
	*/
	p._completeCallback = null;
	
	/** 
	* The collection of line objects {start:0, end:0, content:""} 
	* 
	* @private
	* @property {Array} _lines
	*/
	p._lines = null;
	
	/** 
	* The duration in milliseconds of the current sound. 
	*
	* @private
	* @property {int} _currentDuration
	*/
	p._currentDuration = 0;
	
	/** 
	* The current playback time 
	*
	* @private
	* @property {int} _currentTime
	*/
	p._currentTime = 0;
	
	/** 
	* Save the current line index 
	*
	* @private
	* @property {int} _currentLine 
	*/
	p._currentLine = -1;
	
	/** 
	* Cache the last active line
	*
	* @private
	* @property {int} _lastActiveLine
	*/
	p._lastActiveLine = -1;
	
	/** 
	* If we're playing 
	*
	* @private
	* @property {bool} _playing 
	*/
	p._playing = false;
	
	/** 
	* The singleton instance of Captions 
	*
	* @private
	* @property {cloudkid.Captions} _instance
	*/
	var _instance = null;
	
	/** 
	* If you want to mute the captions, doesn't remove the current caption 
	*
	* @private 
	* @property {bool} _muteAll
	*/
	var _muteAll = false;
	
	/**
	* If this Captions instance is a 'slave', that doesn't run cloudkid.Audio
	* and must have update() called manually (and passed milliseconds).
	* Default is false.
	*
	* @private
	* @property {bool} isSlave
	*/
	p.isSlave = false;
	
	/**
	* If text should be set on the text field with '.text = ' instead of '.setText()'.
	* Default is true.
	*
	* @private
	* @property {bool} textIsProp
	*/
	p.textIsProp = true;
	
	/**
	* If this instance has been destroyed already 
	* 
	* @private
	* @property {bool} _isDestroyed
	*/
	p._isDestroyed = false;
	
	/** 
	* A bound update function to get the progress from Sound with 
	* 
	* @private
	* @property {Function} _boundUpdate
	*/
	p._boundUpdate = null;
	
	/** 
	* A bound completion callback for when Sound has finished playing. 
	* 
	* @private
	* @property {Function} _boundComplete
	*/
	p._boundComplete = null;
	
	/** 
	* The version number of this library 
	*
	* @public 
	* @property {String} VERSION
	* @static
	*/
	Captions.VERSION = "${version}";
	
	/** 
	* Creates the singleton instance of Captions, with an optional dictionary ready to go 
	*
	* @public
	* @method init
	* @param captionDictionary An object set up in dictionary format of caption objects.
	* @static
	*/
	Captions.init = function(captionDictionary, isSlave)
	{
		_instance = new Captions(captionDictionary, isSlave);
	};
	
	/**
	*  The singleton instance of Captions 
	*
	*  @static
	*  @readOnly
	*  @public
	*  @property {cloudkid.Captions} instance
	*/
	Object.defineProperty(Captions, "instance", {
		get:function(){ return _instance; }
	});
	
	/**
	* Constructor for caption.
	*
	* @private
	* @method initialize
	* @param captionDictionary An object set up in dictionary format of caption objects.
	*/
	p.initialize = function(captionDictionary)
	{
		this._lines = [];
		
		if (!this.isSlave && (!Audio || !Audio.instance))
		{
			throw "cloudkid.Audio must be loaded before captions are available";
		}
		
		//this._captionDict = captionDictionary || null;
		this.setDictionary(captionDictionary);
		this._boundUpdate = this._updatePercent.bind(this);
		this._boundComplete = this._onSoundComplete.bind(this);
	};
	
	/**
	* Mute all of the captions.
	*
	* @public
	* @method setMuteAll
	* @param {bool} muteAll Whether to mute or unmute
	* @static
	*/
	Captions.setMuteAll = function(muteAll)
	{
		_muteAll = muteAll;
		
		if(_instance)
			_instance._updateCaptions();
	};
	
	/**
	* If the captions are all currently muted.
	*
	* @public
	* @method getMuteAll
	* @static
	* @return {bool} Whether the captions are all muted
	*/
	Captions.getMuteAll = function()
	{
		return _muteAll;
	};
	
	/**
	* Sets the dictionary object to use for captions. This overrides the current dictionary, if present.
	*
	* @public
	* @method setDictionary
	* @param {Dictionary} dict The dictionary object to use for captions.
	*/
	p.setDictionary = function(dict)
	{
		if(dict)
		{
			this._captionDict = dict;
			var timeFormat = /[0-9]+\:[0-9]{2}\:[0-9]{2}\.[0-9]{3}/;
			//Loop through each line and make sure the times are formatted correctly
			for(var alias in dict)
			{
				var lines = Array.isArray(dict[alias]) ? dict[alias] : dict[alias].lines;
				if(!lines)
				{
					Debug.log("alias '" + alias + "' has no lines!");
					continue;
				}
				for(var i = 0, len = lines.length; i < len; ++i)
				{
					var l = lines[i];
					if(typeof l.start == "string")
					{
						if(timeFormat.test(l.start))
							l.start = _timeCodeToMilliseconds(l.start);
						else
							l.start = parseInt(l.start, 10);
					}
					if(typeof l.end == "string")
					{
						if(timeFormat.test(l.end))
							l.end = _timeCodeToMilliseconds(l.end);
						else
							l.end = parseInt(l.end, 10);
					}
				}
			}
		}
	};
	
	/** 
	* Sets the CreateJS Text or Pixi BitmapText/Text object that Captions should control the text of. 
	* Only one text field can be controlled at a time. 
	*
	* @public
	* @method setTextField
	* @param {Text} field The CreateJS Text object 
	*/
	p.setTextField = function(field)
	{
		if(this._textField)
		{
			if(this.textIsProp)
				this._textField.text = "";
			else
				this._textField.setText("");
		}
		this._textField = field || null;
	};
	
	/** 
	 * Returns if there is a caption under that alias or not. 
	 * 
	 * @method  hasCaption
	 * @param {String} alias The alias to check against
	 * @return {bool} Whether the caption was found or not
	 */
	p.hasCaption = function(alias)
	{
		return this._captionDict ? !!this._captionDict[alias] : false;
	};
	
	/**
	* Sets an array of line data as the current caption data to play.
	*
	* @private
	* @method _load
	* @param {String} data The string
	*/
	p._load = function(data)
	{
		if (this._isDestroyed) return;
		
		// Set the current playhead time
		this._reset();
		
		//make sure there is data to load, otherwise take it as an empty initialization
		if (!data)
		{
			this._lines = null;
			return;
		}
		this._lines = data.lines;
	};
	
	/**
	*  Reset the captions
	*  
	*  @private
	*  @method _reset
	*/
	p._reset = function()
	{
		this._currentLine = -1;
		this._lastActiveLine = -1;
	};
	
	/**
	*  Take the captions timecode and convert to milliseconds
	*  format is in HH:MM:ss:mmm
	*  
	*  @private
	*  @method _timeCodeToMilliseconds
	*  @param {String} input The input string of the format
	*  @return {int} Time in milliseconds
	*/
	function _timeCodeToMilliseconds(input)
	{
		var lastPeriodIndex = input.lastIndexOf(".");
		var ms = parseInt(input.substr(lastPeriodIndex + 1), 10);
		var parts = input.substr(0, lastPeriodIndex).split(":");
		var h = parseInt(parts[0], 10) * 3600000;//* 60 * 60 * 1000;
		var m = parseInt(parts[1], 10) * 6000;// * 60 * 1000;
		var s = parseInt(parts[2], 10) * 1000;
		
		return h + m + s + ms;
	}
	
	/**
	* The playing status.
	*
	* @public
	* @method isPlaying
	* @return {bool} If the caption is playing
	*/
	p.isPlaying = function()
	{ 
		return this._playing; 
	};
	
	p._calcCurrentDuration = function()
	{
		var lines = this._lines;
		return lines ? lines[lines.length - 1].end : 0;
	};
	
	Object.defineProperty(p, "currentDuration",
	{
		get: function() { return this._currentDuration; }
	});
	
	/**
	*  Start the caption playback. Captions will tell cloudkid.Audio to play the proper sound.
	*  
	*  @public
	*  @method play
	*  @param {String} alias The desired caption's alias
	*  @param {function} callback The function to call when the caption is finished playing
	*/
	p.play = function(alias, callback)
	{
		this._completeCallback = callback;
		this._playing = true;
		this._load(this._captionDict[alias]);
		if(this.isSlave)
			this._currentDuration = this._calcCurrentDuration();
		else
		{
			this._currentDuration = Audio.instance.getLength(alias) * 1000;
			Audio.instance.play(alias, this._boundComplete, this._boundUpdate);
		}
		this.seek(0);
	};
	
	/** 
	* Starts caption playback without controlling the sound. Returns the update
	* function that should be called to control the Captions object.
	* 
	* @public
	* @method run
	* @param {String} alias The caption/sound alias
	* @return {function} The update function that should be called
	*/
	p.run = function(alias)
	{
		this._completeCallback = null;
		this._load(this._captionDict[alias]);
		if(this.isSlave)
			this._currentDuration = this._calcCurrentDuration();
		else
			this._currentDuration = Audio.instance.getLength(alias) * 1000;
		this.seek(0);
		return this._boundUpdate;
	};
	
	/** 
	* Is called when cloudkid.Audio finishes playing. Is not called if 
	* a cloudkid.AudioAnimation finishes playing, as then stop() is called.
	* 
	* @private
	* @method _onSoundComplete
	*/
	p._onSoundComplete = function()
	{
		var callback = this._completeCallback;
		
		this.stop();
		
		if(callback)
			callback();
	};
	
	/**
	* Convience function for stopping captions. Is also called by 
	* cloudkid.AudioAnimation when it is finished.
	*
	* @public
	* @method stop
	*/
	p.stop = function()
	{
		if(!this.isSlave && this._playing)
		{
			Audio.instance.stop();
			this._playing = false;
		}
		this._lines = null;
		this._completeCallback = null;
		this._reset();
		this._updateCaptions();
	};
	
	/**
	* Goto a specific time.
	*
	* @public
	* @method seek
	* @param {int} time The time in milliseconds to seek to in the captions
	*/
	p.seek = function(time)
	{
		// Update the current time
		var currentTime = this._currentTime = time;
		
		var lines = this._lines;
		if(!lines)
		{
			this._updateCaptions();
			return;
		}
		
		if (currentTime < lines[0].start)
		{
			currentLine = this._lastActiveLine = -1;
			this._updateCaptions();
			return;
		}
		
		var len = lines.length;
		
		for(var i = 0; i < len; i++)
		{
			if (currentTime >= lines[i].start && currentTime <= lines[i].end)
			{
				this._currentLine = this._lastActiveLine = i;
				this._updateCaptions();
				break;
			}
			else if(currentTime > lines[i].end)
			{
				// this elseif helps us if there was no line at seek time, 
				// so we can still keep track of the last active line
				this._lastActiveLine = i;
				this._currentLine = -1;
			}
		}
	};
	
	/**
	* Callback for when a frame is entered.
	*
	* @private
	* @method _updatePercent
	* @param {number} progress The progress in the current sound as a percentage (0-1)
	*/
	p._updatePercent = function(progress)
	{
		if (this._isDestroyed) return;
		this._currentTime = progress * this._currentDuration;
		this._calcUpdate();
	};
	
	/**
	* Function to update the amount of time elapsed for the caption playback.
	* Call this to advance the caption by a given amount of time.
	*
	* @public
	* @method updateTime
	* @param {int} progress The time elapsed since the last frame in milliseconds
	*/
	p.updateTime = function(elapsed)
	{
		if (this._isDestroyed) return;
		this._currentTime += elapsed;
		this._calcUpdate();
	};
	
	/**
	* Calculates the captions after increasing the current time.
	*
	* @private
	* @method _calcUpdate
	*/
	p._calcUpdate = function()
	{
		var lines = this._lines;
		if(!lines)
			return;
		
		// Check for the end of the captions
		var len = lines.length;
		var nextLine = this._lastActiveLine + 1;
		var lastLine = len - 1;
		var currentTime = this._currentTime;
		
		// If we are outside of the bounds of captions, stop
		if (currentTime >= lines[lastLine].end)
		{
			this._currentLine = -1;
			this._updateCaptions();
		}
		else if (nextLine <= lastLine && currentTime >= lines[nextLine].start && currentTime <= lines[nextLine].end)
		{
			this._currentLine = this._lastActiveLine = nextLine;
			this._updateCaptions();
		}
		else if (this._currentLine != -1 && currentTime > lines[this._currentLine].end)
		{
			this._lastActiveLine = this._currentLine;
			this._currentLine = -1;
			this._updateCaptions();
		}
	};
	
	/**
	*  Updates the text in the managed text field.
	*  
	*  @private
	*  @method _updateCaptions
	*/
	p._updateCaptions = function()
	{
		if(this._textField)
		{
			var text = (this._currentLine == -1 || _muteAll) ? "" : this._lines[this._currentLine].content;
			if(this.textIsProp)
				this._textField.text = text;
			else
				this._textField.setText(text);
		}
	};
	
	/**
	*  Destroy this load task and don't use after this
	*  
	*  @method destroy
	*/
	p.destroy = function()
	{
		if (this._isDestroyed) return;
		
		this._isDestroyed = true;
		
		if(_instance === this)
			_instance = null;
		
		this._captionDict = null;
		this._lines = null;
	};
	
	// Assign to the namespacing
	namespace('cloudkid').Captions = Captions;
	
}());
