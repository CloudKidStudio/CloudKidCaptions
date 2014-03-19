(function() {
	
	var Application = cloudkid.Application,
		OS = cloudkid.OS,
		Touch = createjs.Touch,
		Text = createjs.Text,
		Audio = cloudkid.Audio,
		Captions = cloudkid.Captions,
		MediaLoader = cloudkid.MediaLoader,
		DOMElement = createjs.DOMElement;
	
	var CaptionsApp = function()
	{
		this.initialize();
	}
	
	// Extend the createjs container
	var p = CaptionsApp.prototype = new Application();
	
	// The name of this app
	p.name = "CaptionsApp";
	
	// Private stage variable
	var stage;
	
	/** if the caption is loaded */
	p.loaded = false;
	
	/** The captions object */
	p.captions = null;
	
	var _audio;
	var text;
	
	/**
	* @protected
	*/
	p.init = function()
	{	
		stage = OS.instance.stage;
		
		if (!Touch.isSupported())
		{
			stage.enableMouseOver();
		}
		
		this.loaded = false;
		var app = this;
		
		// Add the UI to the dom
		var dom = new DOMElement($(".ui").get(0));
		stage.addChildAt(dom, 0);
		
		// Add the text field
		text = new Text("", "24px Arial", "#ff7700");
		text.x = 260;
		text.y = 360;
		text.textAlign = "center";
		stage.addChild(text);
		
		$(".ui button").click(function(e){
			var action = $(this).attr('data-action');
			switch(action)
			{
				case 'load':
				{
					if (app.loaded) break;
					
					// Get the sound data needed
					_audio = Audio.init(
						"sounds/DressUpAudio.json",
						function(){
							// Preload the audio
							// then load the captions
							_audio.load(function(){
								MediaLoader.instance.load(
									'captions/captions.json',
									app.onLoaded.bind(app)
								);
							})
						}
					);									
					break;
				}
				case 'stop' :
				{
					if (!app.loaded)
					{
						Debug.warn("Captions not loaded.")
						break;
					}
					app.captions.stop();
					break;
				}
				case 'unload' :
				{
					if (!app.loaded)
					{
						Debug.warn("Captions not loaded.")
						break;
					}
					if (_audio)
					{
						_audio.destroy();
						_audio = null;
					}
					text.text = "";
					app.captions.destroy();
					app.captions = null;
					app.loaded = false;
					
					$(".ui").addClass('disabled').removeClass('enabled');
					break;
				}
				default :
				{
					if (!app.loaded)
					{
						Debug.warn("Captions not loaded.")
						break;
					}
					app.captions.play(action, function(){
						Debug.log(action + " finished.");
					});
					break;
				}
				
			}
		});
	};
	
	p.onLoaded = function(result)
	{
		Debug.log("Finished loading.");
		
		this.captions = new Captions(result.content);
		this.captions.setTextField(text);
		this.loaded = true;
		
		$(".ui").removeClass('disabled').addClass('enabled');
	};
	
	p.onCompleted = function(e)
	{
		Debug.log("Captions completed!");
	};
	
	/**
	*  Destroy this app, don't use after this
	*/
	p.destroy = function()
	{
		this.removeAllChildren();
		stage = null;
	};
	
	namespace('cloudkid').CaptionsApp = CaptionsApp;
}());