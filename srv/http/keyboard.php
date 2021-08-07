<?php
if ( $localhost ) { ?>
<link rel="stylesheet" href="/assets/css/simple-keyboard.min.<?=$time?>.css">
<link rel="stylesheet" href="/assets/css/keyboard.<?=$time?>.css">
<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>
<script src="/assets/js/plugin/simple-keyboard.min.<?=$time?>.js"></script>
<script src="/assets/js/keyboard.<?=$time?>.js"></script>
<script>
	$( 'body' ).on( 'click', 'input[type=checkbox], input[type=radio]', function() {
		var $kb = $( '#keyboard' );
		$kb.css( 'opacity', 0 );
		setTimeout( function() {
			$kb.addClass( 'hide' );
			$kb.css( 'opacity', '' );
		}, 0 );
	} );
</script>
<?php }
