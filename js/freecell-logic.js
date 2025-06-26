// Freecell Game Logic
// Extracted and prepared for freecellgame.online by Gemini

// Add a wrapper to ensure DOM is loaded before running game logic
document.addEventListener('DOMContentLoaded', (event) => {

// CONSTS
var CARD_DECK = {
	suits: [
		{ name:'club',    logo:'♣' },
		{ name:'diamond', logo:'♦' },
		{ name:'heart',   logo:'♥' },
		{ name:'spade',   logo:'♠' }
	],
	cards: [
		{ name:'ace',   numb:'A',  class:'suit' },
		{ name:'two',   numb:'2',  class:'suit' },
		{ name:'three', numb:'3',  class:'suit' },
		{ name:'four',  numb:'4',  class:'suit' },
		{ name:'five',  numb:'5',  class:'suit' },
		{ name:'six',   numb:'6',  class:'suit' },
		{ name:'seven', numb:'7',  class:'suit' },
		{ name:'eight', numb:'8',  class:'suit' },
		{ name:'nine',  numb:'9',  class:'suit' },
		{ name:'ten',   numb:'10', class:'suit' },
		{ name:'jack',  numb:'J',  class:'face' },
		{ name:'queen', numb:'Q',  class:'face' },
		{ name:'king',  numb:'K',  class:'face' }
	]
};
var SUIT_DICT = {
	club:    { color:'b', accepts:['diamond', 'heart'] },
	diamond: { color:'r', accepts:['club'   , 'spade'] },
	heart:   { color:'r', accepts:['club'   , 'spade'] },
	spade:   { color:'b', accepts:['diamond', 'heart'] }
};
var NUMB_DICT = {
	A: { cascDrop:''  , founDrop:'2' },
	2: { cascDrop:'A' , founDrop:'3' },
	3: { cascDrop:'2' , founDrop:'4' },
	4: { cascDrop:'3' , founDrop:'5' },
	5: { cascDrop:'4' , founDrop:'6' },
	6: { cascDrop:'5' , founDrop:'7' },
	7: { cascDrop:'6' , founDrop:'8' },
	8: { cascDrop:'7' , founDrop:'9' },
	9: { cascDrop:'8' , founDrop:'10'},
	10:{ cascDrop:'9' , founDrop:'J' },
	J: { cascDrop:'10', founDrop:'Q' },
	Q: { cascDrop:'J' , founDrop:'K' },
	K: { cascDrop:'Q' , founDrop:''  }
};
// VARIABLES
var gAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
var gTimer;

// GAME SETUP
{
	// SETUP: Table backgrounds
	var gGameTableBkgds = {};
	gGameTableBkgds.pattern = { url:'img/table_pattern.jpg' };
	gGameTableBkgds.circles = { url:'img/table_circles.jpg' };
	gGameTableBkgds.felt    = { url:'img/table_felt.jpg'    };
	gGameTableBkgds.plain   = { url:'img/table_plain.png'   };

	// SETUP: Game Options / Defaults
	var gGameOpts = {};
	gGameOpts.allowFounReuse = false;
	gGameOpts.cheatUnlimOpen = false;
	gGameOpts.debugOneLeft   = false;
	gGameOpts.showTips       = true;
	gGameOpts.sound          = true;
	gGameOpts.tableBkgdUrl   = gGameTableBkgds.felt.url; // Use felt for the new design

	// SETUP: Define / Start async load of sounds files
	// NOTE: iOS (as of iOS9) is unable to play ogg files, so we are using MP3 for everything
	var gGameSounds = {};
	gGameSounds.cardFlip    = { buffer:null, url:'sounds/cardFlip.mp3',    src:'freesound.org/people/f4ngy/sounds/240776/'    };
	gGameSounds.cardShuffle = { buffer:null, url:'sounds/cardShuffle.mp3', src:'freesound.org/people/deathpie/sounds/19245/'  };
	gGameSounds.crowdCheer  = { buffer:null, url:'sounds/crowdCheer.mp3',  src:'soundbible.com/1700-5-Sec-Crowd-Cheer.html'   };
	gGameSounds.sadTrombone = { buffer:null, url:'sounds/sadTrombone.mp3', src:'freesound.org/people/Benboncan/sounds/73581/' };
}

// PROTOTYPES
Array.prototype.shuffle = function(){
    var i = this.length, j, temp;
    if ( i == 0 ) return this;
    while ( --i ) {
        j = Math.floor( Math.random() * ( i + 1 ) );
        temp = this[i]; this[i] = this[j]; this[j] = temp;
    }
    return this;
}

// ==============================================================================================

function handleFounDrop(event, ui, drop) {
	// DOCS: "$(this) [drop] represents the droppable the draggable is dropped on. ui.draggable represents the draggable"
	// NOTE: jQuery UI draggables will revert no matter what (even if we func accept:ARG and return true/fasle), so revert:false is reqd!

	// RULE 1: Was only a single card provided?
	if ( ui.helper.children().length != 1 ) {
		if ( gGameOpts.showTips ) null; // TODO
		return false;
	}

	// RULE 2: Is card valid?
	if ( drop.children('.card').length == 0 ) {
		if ( ui.draggable.data('numb') != 'A' ) {
			if ( gGameOpts.showTips ) null; // TODO
			return false;
		}
	}
	else {
		var card = $(ui.draggable);
		var topCard = $(drop.children('.card').last());

		// Is card next in sequence?
		if ( topCard.data('suit') != card.data('suit') || NUMB_DICT[topCard.data('numb')].founDrop != card.data('numb') ) {
			if ( gGameOpts.showTips ) null; // TODO
			return false;
		}
	}

	// ------------------------------------------------------------------------

	// STEP 1: VFX/SFX update
	if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

	// STEP 2: "Grab" card and place it into this foundation
	{
		// A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
		ui.draggable.draggable('option', 'revert', false);
		// B: "Grab"/Deatch/Append CARD
		ui.draggable.detach().appendTo( $(drop) ).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
		// C: Unhide the card that we hid when we built draggable container
		ui.draggable.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
		// D: Reset z-index to mid-level
		ui.draggable.css('z-index', $(drop).find('.card').length);
		// E: "Stack" all cards by using position (0,0)
		ui.draggable.css({ position:'absolute', top:'0px', left:'0px' });
	}

	// STEP 3: Apply options
	if ( !gGameOpts.allowFounReuse ) {
		ui.draggable.draggable('disable');
		ui.draggable.css('cursor','default');
	}

	// STEP 4: CHECK: End of game?
	if ( $('#cardFoun .card').length == 52 ) doGameWon();
}

function handleOpenDrop(event, ui, drop) {
	// -------------------------------------------

	// RULE 1: Was only a single card provided?
	if ( ui.helper.children().length != 1 ) {
		if ( gGameOpts.showTips ) null; // TODO
		return false;
	}

	// -------------------------------------------

	// STEP 1: VFX/SFX update
	if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

	// STEP 2: "Grab" card and place it into this slow
	// A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
	ui.draggable.draggable('option', 'revert', false);
	// B: "Grab"/Detach/Append CARD
	ui.draggable.detach().appendTo(drop).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
	// C: Unhide the card that we hid when we built draggable container
	ui.draggable.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
	// D: Fix positioning CSS
	ui.draggable.css('top', '0px');
	ui.draggable.css('left', '0px');
	// E: Reset z-index to mid-level (use 99 so we're above any 500 but always under card which drags at 100)
	ui.draggable.css('z-index',99);

	// STEP 3: Turn off this slot until it frees up again
	if ( !gGameOpts.cheatUnlimOpen ) drop.droppable('disable');
	else $.each(drop.children('.card'), function(i,card){ $(card).css('position','relative').css('top',i*-1*($(card).height()-20)+'px').css('left','0px');});

	// STEP 4: Reset draggable params (esp. helper as prev one from cascades does things we no longer want to do)
	var strNeeded = $(drop).attr('id');
	ui.draggable.draggable({
		helper: 'original',
		start: function(event, ui){
			$(this).css('z-index', 100);
			$(this).draggable('option', 'revert', true);
			$('#'+strNeeded).droppable('enable');
		},
	});
}

function handleCascDrop(event, ui, drop) {
	// DESIGN: We check for valid sets upon dragStart, so assume set sequence is valid upon drop
	var cardTopCasc = $(drop).children().last();
	var card = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children()[0] : ui.draggable;
	var cards = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children() : [ui.draggable];

	// RULE 1: Is the single-card/container-top-card in run order?
	if ( $(drop).children().length > 0
		&& ( $.inArray($(cardTopCasc).data('suit'), SUIT_DICT[$(card).data('suit')].accepts) == -1
			|| NUMB_DICT[$(cardTopCasc).data('numb')].cascDrop != $(card).data('numb') )
	) {
		if ( gGameOpts.showTips ) null; // TODO
		return false;
	}

	// STEP 1: VFX/SFX update
	if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

	// STEP 2: "Grab" card(s) and place them into this cascade
	$.each(cards, function(i,obj){
		// NOTE: ui.helper.children()[0] != ui.draggable (!!!) - you can call .draggable() on the ui ene but not on the array element!!
		// ....: Correct way is to call object directly using its id - reference does not work
		var thisCard = $('#'+$(obj).prop('id'));

		// A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
		thisCard.draggable('option', 'revert', false);
		// B: "Grab"/Deatch/Append CARD
		thisCard.detach().appendTo( $(drop) ).removeAttr('style');
		// C: Unhide the card that we hid when we built draggable container
		thisCard.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
		// D: Reset z-index to something reasonable and stack it
		thisCard.css('z-index', $(drop).find('.card').length);
		thisCard.css({ 'position':'absolute', 'top':(($(drop).children().length-1) * getCardOffset())+'px', 'left':0 });
	});
}

function createCard(argSuit, argCard) {
	// i.e. "card-b-club-A"
	var strCardId = 'card-'+SUIT_DICT[argSuit.name].color+'-'+argSuit.name+'-'+argCard.numb;
	// i.e. ".card.club.A.suit"
	var strCardClasses = 'card '+argSuit.name+' '+argCard.numb+' '+argCard.class;

	// <div id="card-b-club-A" class="card club A suit" data-suit="club" data-numb="A">
	var card = $('<div/>').prop('id',strCardId).addClass(strCardClasses).data('suit',argSuit.name).data('numb',argCard.numb);

	// <div class="corner top"><span class="number">A</span><span>♣</span></div>
	var corner1 = $('<div/>').addClass('corner top');
	var corner2 = $('<div/>').addClass('corner bottom');
	corner1.append( $('<span/>').addClass('number').html(argCard.numb) ).append( $('<span/>').html(argSuit.logo) );
	corner2.append( $('<span/>').addClass('number').html(argCard.numb) ).append( $('<span/>').html(argSuit.logo) );
	card.append(corner1).append(corner2);

	if ( argCard.class == 'face' ) {
		// <div class="face"><img src="img/faces/face-jack-club.png"></div>
		var strFaceImg = 'img/faces/face-'+argCard.name+'-'+argSuit.name+'.png';
		card.append( $('<div/>').addClass('face').append( $('<img/>').prop('src',strFaceImg).prop('alt', argCard.name + ' of ' + argSuit.name) ) );
	}
	else {
        // Create a container for the suit icons
        var suitLogos = $('<div/>').addClass('suit');
        
        // Define the positions for each card number
        var suitPositions = {
            'A': ['middle_center'],
            '2': ['top_center', 'bottom_center'],
            '3': ['top_center', 'middle_center', 'bottom_center'],
            '4': ['top_left', 'top_right', 'bottom_left', 'bottom_right'],
            '5': ['top_left', 'top_right', 'middle_center', 'bottom_left', 'bottom_right'],
            '6': ['top_left', 'top_right', 'middle_left', 'middle_right', 'bottom_left', 'bottom_right'],
            '7': ['top_left', 'top_right', 'middle_top', 'middle_left', 'middle_right', 'bottom_left', 'bottom_right'],
            '8': ['top_left', 'top_right', 'middle_top', 'middle_left', 'middle_right', 'bottom_left', 'bottom_right', 'bottom_center'],
            '9': ['top_left', 'top_right', 'middle_top_left', 'middle_top_right', 'middle_center', 'bottom_left', 'bottom_right', 'bottom_middle_left', 'bottom_middle_right'],
            '10': ['top_left', 'top_right', 'middle_top_left', 'middle_top_right', 'middle_top_center', 'middle_bottom_center', 'bottom_left', 'bottom_right', 'bottom_middle_left', 'bottom_middle_right']
        };

        // Add only the necessary suit icons
        if (suitPositions[argCard.numb]) {
            $.each(suitPositions[argCard.numb], function(i, posClass) {
                 suitLogos.append($('<span/>').addClass(posClass).html(argSuit.logo));
            });
        }
		card.append(suitLogos);
	}

	// Make draggable
	card.draggable({
		revert: true,
		zIndex: 100,
		cursor: 'pointer',
		//containment: 'body',
		start: function(event, ui){
			// Clear any selections from the previous drop in case one is left over
			$('#draggingContainer').remove();

			// Visually, its better to see the card being dragged NOT change in any way (the helper does this)
			var helper = $(this).clone();

			// Can we drag more than one card?
			var cascCards = $(this).parent().children();
			var thisCardIdx = cascCards.index( $(this) );
			var validStack = true;

			// Is every card after this one a valid child of the one before it?
			// i.e.: Are they in order (4,3,2,A) and alternating colors?
			for ( var i=thisCardIdx; i < cascCards.length-1; i++ ) {
				var topCard = $(cascCards[i]);
				var btmCard = $(cascCards[i+1]);

				if ( $.inArray(topCard.data('suit'), SUIT_DICT[btmCard.data('suit')].accepts) == -1
					|| NUMB_DICT[topCard.data('numb')].cascDrop != btmCard.data('numb')
				) {
					validStack = false;
					break;
				}
			}

			// Add the other cards to the drag helper if they form a valid stack
			// (and so long as we dont have too many to legally move)
			var freeSlots = $('#cardOpen .slot:not(:has(.card))').length + $('#cardCasc .cascade:empty').length;
			if ( validStack ) {
				// Create a container so we can move all cards at once
				helper = $('<div/>').prop('id','draggingContainer');
				for ( var i=thisCardIdx; i < cascCards.length; i++ ) {
					// RULE: Is the number of cards being moved > than the number of free cells+empty cascades available?
					// NOTE: We test > instead of >= because you can move N+1 cards
					if ( (helper.children().length > freeSlots) && !gGameOpts.cheatUnlimOpen ) {
						if ( gGameOpts.showTips ) null; // TODO
						helper.empty().append( $(this).clone() ); // just drag one card
						break;
					}
					// Hide the card on the table so it looks like we picked it up
					// Have to do this to each individually as they are not children of this card, but of the cascade
					$(cascCards[i]).find('span').css('visibility','hidden');
					// Add to drag container
					helper.append( $(cascCards[i]).clone() );
				}
			}
			else {
				$(this).find('span').css('visibility','hidden');
			}

			// Add `revert` manually so we can disable it on a valid drop
			$(this).draggable('option', 'revert', true);

			return helper;
		},
		stop: function(event, ui){
			// Unhide the card (or cards) on the table in case the drop was invalid
			var cascCards = $(this).parent().children();
			var thisCardIdx = cascCards.index( $(this) );
			for ( var i=thisCardIdx; i < cascCards.length; i++ ) {
				$(cascCards[i]).find('span').css('visibility','visible');
			}
		}
	});

	return card;
}

function doGameNew() {
	// --------------------------------------------------
	// Reset/Clear Table
	// --------------------------------------------------
	// A. Foundations
	$('#cardFoun .slot').empty().droppable({
		hoverClass: "slotHover",
		drop: function(event, ui) { handleFounDrop(event, ui, $(this)); }
	});

	// B. Open Slots
	$('#cardOpen .slot').empty().droppable({
		hoverClass: "slotHover",
		drop: function(event, ui) { handleOpenDrop(event, ui, $(this)); }
	});

	// C. Cascades
	$('#cardCasc .cascade').empty().droppable({
		hoverClass: "cascHover",
		drop: function(event, ui) { handleCascDrop(event, ui, $(this)); }
	});

	// D. Stop Timer
	if (gTimer) clearInterval(gTimer);

	// E. Close any dialogs
	$('.ui-dialog-content').dialog('close');

	// --------------------------------------------------
	// Create Deck
	// --------------------------------------------------
	var cards = [];
	$.each(CARD_DECK.suits, function(i, suit){
		$.each(CARD_DECK.cards, function(j, card){
			cards.push( createCard(suit, card) );
		});
	});

	// --------------------------------------------------
	// "Deal"
	// --------------------------------------------------
	// A. Shuffle
	cards.shuffle();
	if (gGameOpts.sound) playSound(gGameSounds.cardShuffle);

	// B. Place cards into cascades
	var cascCell = 0;
	$.each(cards, function(i, card){
		var casc = $($('#cardCasc .cascade')[cascCell]);
		var cardPos = (casc.children().length * getCardOffset())+'px';
		card.css({ 'position':'absolute', 'top':cardPos, 'left':0 });
		card.css({ 'z-index': casc.children().length });
		casc.append(card);
		cascCell = cascCell == 7 ? 0 : cascCell+1;
	});

	// C. Start Timer
	var sec = 0;
	function pad ( val ) { return val > 9 ? val : "0" + val; }
	gTimer = setInterval( function(){
		$("#seconds").html(pad(++sec%60));
		$("#minutes").html(pad(parseInt(sec/60,10)));
	}, 1000);

	// DEBUG: Leave one card left to play so we can test the `You Won!` dialog
	if ( gGameOpts.debugOneLeft ) {
		// Almost there! (move all but one card to foundations)
		var lastCard = $($('#cardCasc .cascade')[0]).children().last();
		$('#cardFoun .slot').first().append( $('#cardCasc .card').not(lastCard) );
	}
}

function doGameWon() {
	// Stop timer
	if (gTimer) clearInterval(gTimer);
	// Play sound
	if (gGameOpts.sound) playSound(gGameSounds.crowdCheer);
	// Show dialog
	$('#dialogYouWon').dialog('open');
}

function getCardOffset() {
    // Dynamically calculate the offset for fanned cards based on card height.
    // This ensures the fanning is responsive.
    const cardHeight = $('.card').first().height();
    if (cardHeight > 100) return 50; // Desktop
    if (cardHeight > 75) return 40;  // Tablet
    return 30; // Mobile
}

function doOptionsSave() {
	// A. Get values from form
	gGameOpts.allowFounReuse = $('#optFounReuse').prop('checked');
	gGameOpts.sound = $('#optSound').prop('checked');
	gGameOpts.tableBkgdUrl = $('input[name=optBkgd]:checked').val();

	// B. Update Game
	$('#playArea').css('background-image', 'url('+gGameOpts.tableBkgdUrl+')');

	// C. Close dialog
	$('#dialogOptions').dialog('close');
}

function playSound(pSnd) {
	var source = gAudioCtx.createBufferSource();
	source.buffer = pSnd.buffer;
	source.connect(gAudioCtx.destination);
	source.start(0);
}

// MAIN/START
$(function(){

	// SETUP: Sounds
	$.each(gGameSounds, function(i,snd){
		var request = new XMLHttpRequest();
		request.open('GET', snd.url, true);
		request.responseType = 'arraybuffer';
		request.onload = function() {
			gAudioCtx.decodeAudioData(request.response, function(buffer) { snd.buffer = buffer; }, function(){});
		}
		request.send();
	});

	// SETUP: UI
	$('#playArea').css('background-image', 'url('+gGameOpts.tableBkgdUrl+')');

	// SETUP: Dialogs
	$('#dialogStart').dialog({
		autoOpen: true, modal: true, closeOnEscape: false,
		width: 600,
		buttons: [
			{ text: "New Game", click: function() { doGameNew(); } }
		]
	});
	$('#dialogOptions').dialog({
		autoOpen: false, modal: true,
		width: 600,
		buttons: [
			{ text: "Resume Game", click: function() { $(this).dialog('close'); } },
			{ text: "Save and Close", click: function() { doOptionsSave(); } }
		]
	});
	$('#dialogYouWon').dialog({
		autoOpen: false, modal: true,
		width: 600,
		buttons: [
			{ text: "Play Again", click: function() { doGameNew(); } }
		]
	});

	// SETUP: Buttons
	$('#btnNew').on('click', function(){ doGameNew(); });
	$('#btnOpts').on('click', function(){ $('#dialogOptions').dialog('open'); });

	// HACK: Stupid iOS/iPad `touch` event blocks `click` so we have to use `touchend` on mobile
	var clickOrTouch = (('ontouchend' in window)) ? 'touchend' : 'click';
	$('#btnNewGame').on(clickOrTouch, function(){ doGameNew(); });
	$('#btnResume').on(clickOrTouch, function(){ $('#dialogOptions').dialog('close'); });
	$('#btnSave').on(clickOrTouch, function(){ doOptionsSave(); });

}); // /MAIN

}); // /DOMContentLoaded
