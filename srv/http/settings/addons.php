<?php
$diraddons  = '/srv/http/data/addons';
$addons     = json_decode( file_get_contents( $diraddons.'/addons-list.json' ), true );
// ------------------------------------------------------------------------------------
$arrayalias = array_keys( $addons );
$list       = '<ul id="list">';
$blocks     = '';
foreach( $arrayalias as $alias ) {
	$addon            = $addons[ $alias ];
	$version          = $addon[ 'version' ] ?? '';
	// hide by conditions
	if ( isset( $addon[ 'hide' ] ) ) {
		$addonhide = $addon[ 'hide' ];
		if ( $addonhide === 1 || exec( $addonhide ) ) continue;
	}
	
	$buttonlabel      = $addon[ 'buttonlabel' ] ?? i( 'plus-circle' ).' Install';
	$installed = 'class="installed"';
	if ( isset( $addon[ 'verify' ] ) ) {
		$verify      = $addon[ 'verify' ];
		$notverified = exec( $verify[ 'command' ] ) ? $verify[ 'notverified' ] : '';
	}
	if ( $notverified ) {
		$btnin     = i( 'info-circle i-lg gr info' ).'<div class="info">'.$notverified.'</div>';
	} else {
		// !!! mobile browsers: <button>s submit 'formtemp' with 'get' > 'failed', use <a> instead
		$btnin     = '<a class="install infobtn infobtn-primary">'.$buttonlabel.'</a>';
	}
	$btnun     = '<a class="uninstall infobtn infobtn-default red">'.i( 'plus-circle' ).' Uninstall</a>';
	
	// addon list ---------------------------------------------------------------
	$title         = $addon[ 'title' ];
	$list         .= '<li class="'.$alias.'"data-alias="'.$alias.'" '.$installed.'>'.$title.'</li>';
	// addon blocks -------------------------------------------------------------
	$revisionclass = $version ? 'revision' : 'revisionnone';
	$addonrevision = $addon[ 'revision' ] ?? '';
	if ( $addonrevision ) {
		if ( is_array( $addonrevision ) ) $addonrevision = implode( '<br><gr>•</gr> ', $addonrevision );
		$revision  = str_replace( '\\', '', $addonrevision ); // remove escaped [ \" ] to [ " ]
		$revision  = '<p class="revisiontext hide"><gr>•</gr> '.$revision.'</p>';
	} else {
		$revision  = '';
	}
	$description   = $addon[ 'description' ];
	if ( is_array( $description ) ) $description = implode( '<br>', $description );
	$description   = str_replace( '\\', '', $description );
	$sourcecode    = $addon[ 'sourcecode' ];
	if ( $sourcecode && $buttonlabel !== 'Link' ) {
		$detail   = '<br><a href="'.$sourcecode.'" class="source">source '.i( 'github' ).'</a>';
	} else {
		$detail   = '';
	}
	$blocks      .= '
		<div id="'.$alias.'" class="boxed-group">';
	$thumbnail    = $addon[ 'thumbnail' ] ?? '';
	if ( $thumbnail ) $blocks .= '
		<div style="float: left; width: calc( 100% - 110px);">';
	$blocks      .= '
			<legend>
				<span class="'.$alias.'">'.$title.'</span>
				&emsp;<p><a class="'.$revisionclass.'">'.$version.( $version ? ' '.i( 'help' ) : '' ).'</a>
				</p>
			</legend>
			'.$revision.'
			<form class="form-horizontal" data-alias="'.$alias.'">
				<p class="detailtext">'.$description.$detail.'</p>';
	$blocks     .= $btnin.' &nbsp; '.$btnun;
	$blocks     .= '
			</form>';
	if ( $thumbnail ) $blocks .= '
		</div>
		<img src="'.$thumbnail.$hash.'" class="thumbnail">
		<div style="clear: both;"></div>';
	$blocks     .= '
		</div>';
}
// ------------------------------------------------------------------------------------
echo $list.'
	</ul>'.
	$blocks.'
	<p class="bottom"></p>
</div>';
