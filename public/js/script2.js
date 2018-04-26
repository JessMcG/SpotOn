
/**
 * Author: Allan
 * General javascript and jquery.
 */
$(document).ready(function(){
   //switch between playlists and songs on profile
	$("#profileSongSwitch").hide();

	$(".mySongs").click(function(){

		$(".mySongs").addClass( "activeInner" );
		$(".myPlaylists").removeClass( "activeInner" );

		$("#profilePlaylistSwitch").hide();
		$("#profileSongSwitch").show();

	});
	$("#example").hide();
	$("#closeRecentResults, #example").click(function(){

		$("#example2").animate({marginLeft: '-700px'},300);
		$("#example").delay(300).fadeOut("fast");


	});

	$("#exampleSearchResult").click(function(){

		$("#example2").delay(100).animate({marginLeft: '0px'},300);
		$("#example").fadeIn("fast");


	});

	$(".myPlaylists").click(function(){

		$(".myPlaylists").addClass( "activeInner" );
		$(".mySongs").removeClass( "activeInner" );

		$("#profilePlaylistSwitch").show();
		$("#profileSongSwitch").hide();
	});

	$("#waves,#waves2,#waves3").hide();

	$("#artistField").hide();
	$(".playTrackButton2").hide();

	$(".playTrackButton").click(function(){
		$(".playTrackButton").hide();
		$(".playTrackButton2").show();
    });
	$(".playTrackButton2").click(function(){
		$(".playTrackButton").show();
		$(".playTrackButton2").hide();
    });

	$(".bySong").click(function(){
        $(".bySong").removeClass("inactiveButton");
        $(".bySong").addClass("activeButton");
        $(".byArtist").removeClass("activeButton");
        $(".byArtist").addClass("inactiveButton");
		$("#artistField").hide();
		$("#songField").show();
    });

	$(".byArtist").click(function(){
        $(".byArtist").removeClass("inactiveButton");
        $(".byArtist").addClass("activeButton");
        $(".bySong").removeClass("activeButton");
        $(".bySong").addClass("inactiveButton");
		$("#artistField").show();
		$("#songField").hide();
    });

	$(".searchResult,#searchResults").hide();

	$("#dontWork").click(function(){
		  $("#searchResults").animate({marginTop: '-120px'},500);
		  $("#searchResults").show();
		  $(".searchResult").show();
		  $("#homeBoxes").hide();

    });
	//change colour of the nav bar on scrolling
	var scroll_pos = 0;

	$(document).scroll(function() {
		scroll_pos = $(this).scrollTop();
		if(scroll_pos > 80) {
			$("#nav").css('background-color', '#222');
		} else {
			$("#nav").css('background-color', 'transparent');
		}
	});


	$("#loginLink").click(function(){

		$("#loginOverlay").fadeIn(300);
		$("#loginBox").delay(100).slideDown(300);

    });
	$("#closeLoginForm").click(function(){

		$("#loginOverlay").delay(100).fadeOut(300);
		$("#loginBox").slideUp(300);

    });

	$("#respMenu").click(function(){
		  $("#container").animate({marginLeft: '-70%'},300);
		  $("#header").animate({marginLeft: '-70%'},300);
		  $("#nav").animate({marginLeft: '-70%'},300);
		  $("#respNav").animate({width: '70%'},300);
		  $("#respNav").addClass("respNavBoxShadow");
		  $("#respMenu").fadeOut(350);
		  $("#closeRespMenu").fadeIn(450);
		  $(".respContent").fadeIn(200);
    });

	$("#closeRespMenu").click(function(){
		  $("#container").animate({marginLeft: '0%'},300);
		  $("#header").animate({marginLeft: '0%'},300);
		  $("#nav").animate({marginLeft: '0%'},300);
		  $("#respNav").animate({width: '0%'},300);
		  $("#respMenu").fadeIn(450);
		  $("#closeRespMenu").fadeOut(250);
		  $("#respNav").removeClass("respNavBoxShadow");
		  $(".respContent").fadeOut(200);
    });

//grab data from the json file.

	$.ajax({
		url: 'data.json',
		dataType: 'json',
		type: 'get',
		cashe: false,
		success: function(data){
			$(data.tracks).each(function(index, value){


				var appendTrack = "<li class='trackOnProfile'><p class='ellipsis' title='"+ value.artist_name + " - " + value.track_name  +"'>" + value.artist_name + " - <span>" + value.track_name + " " + "</span></p><div class='playTrackProfile'><img class='playSingleTrack' src='img/play.png' alt='" + value.track_id +"' />";

				//$("ol li:even").css("background-color", "#fafafa");

				$("#allTracks").append(appendTrack);
				$(".profileMySongs").append(appendTrack);


			});
			// load first track into player on page loading
			var t = 0;

			$("#trackArt").attr("src",data.tracks[t].album_art);
			$("#coverArtBluredInner").attr("src",data.tracks[t].album_art);
			$("#playerArtistName").html(data.tracks[t].artist_name);
			$("#playerTrackName").html(data.tracks[t].track_name);
			$("#playerPlaylistTitle").html(data.tracks[t].playlist_title);
			$("#ffs").attr("src",data.tracks[t].track);
			var playListLength = data.tracks.length;

			//move to the next track on the playlist
			$("#playNext").click(function(){
				t++;
				if(t >= playListLength){
					t = 0;
				}
				else{
					console.log(data.tracks[t].artist_name);
					console.log(t);
					$("#trackArt").attr("src",data.tracks[t].album_art);
					$("#coverArtBluredInner").attr("src",data.tracks[t].album_art);
					$("#playerArtistName").html(data.tracks[t].artist_name);
					$("#playerTrackName").html(data.tracks[t].track_name);
					$("#playerPlaylistTitle").html(data.tracks[t].playlist_title);
					$("#ffs").attr("src",data.tracks[t].track);
					$("#ffs").attr("autoplay","true");
					$(".playTrackButton2").show();
					$(".playTrackButton").hide();
					$("#waves,#waves2,#waves3").fadeIn(600);
				}
			});
			//go to the previous track on the playlist
			$("#playPrev").click(function(){
				t--;
				if(t < 0){
					t = playListLength +1;
				}
				else{
					console.log(data.tracks[t].track);
					console.log(t);
					$("#trackArt").attr("src",data.tracks[t].album_art);
					$("#coverArtBluredInner").attr("src",data.tracks[t].album_art);
					$("#playerArtistName").html(data.tracks[t].artist_name);
					$("#playerTrackName").html(data.tracks[t].track_name);
					$("#ffs").attr("src",data.tracks[t].track);
					$("#ffs").attr("autoplay","true");
					$(".playTrackButton2").show();
					$(".playTrackButton").hide();
					$("#waves,#waves2,#waves3").fadeIn(600);
				}
			});

			//hide default player
			$("audio").hide();

			//play & pause audio player
			$(".playTrackButton").click(function(){

				$("#ffs").trigger('play');
				$("#waves,#waves2,#waves3").fadeIn(600);

			});
			$(".playTrackButton2").click(function(){

				$("#ffs").trigger('pause');
				$("#waves,#waves2,#waves3").fadeOut(600);

			});

			$("#ffs").on("ended", function() {
				t++;
				if(t >= playListLength){
					t = 0;
				}
				else{
					console.log(data.tracks[t].artist_name);
					console.log(t);
					$("#trackArt").attr("src",data.tracks[t].album_art);
					$("#coverArtBluredInner").attr("src",data.tracks[t].album_art);
					$("#playerArtistName").html(data.tracks[t].artist_name);
					$("#playerTrackName").html(data.tracks[t].track_name);
					$("#playerPlaylistTitle").html(data.tracks[t].playlist_title);
					$("#ffs").attr("src",data.tracks[t].track);
					$("#ffs").attr("autoplay","true");
					$(".playTrackButton2").show();
					$(".playTrackButton").hide();
				}
			});
			//
			$(".playSingleTrack").click(function(evt){
				var c = evt.target.alt;
				$("#ffs").attr("autoplay","true");
				$(".playTrackButton2").show();
				$(".playTrackButton").hide();
				$("#waves,#waves2,#waves3").fadeIn(600);

				$("#trackArt").attr("src",data.tracks[c].album_art);
				$("#coverArtBluredInner").attr("src",data.tracks[c].album_art);
				$("#playerArtistName").html(data.tracks[c].artist_name);
				$("#playerTrackName").html(data.tracks[c].track_name);
				$("#playerPlaylistTitle").html(data.tracks[c].playlist_title);
				$("#ffs").attr("src",data.tracks[c].track);

			});
		}


	});

	// iterate out serach result within div on page on page. - *not working*
	// doesnt recognise this ajax function just the other one.
	$.ajax({
		url: 'search.json',
		dataType: 'json',
		type: 'get',
		cashe: false,
		success: function(data2){
			$(data2.search).each(function(index, value){

				var appendSearch = "<li class='recentSearch'><p>" + value.type + " - <span>" + value.search + " " + "</span></p>";


				$("#recentSearchResults").append(appendSearch);


			});



		}

	});

});// END DOCUMENT READY
/**
 * End of general javascript and jquery.
 */

/**
 * Searching, top tracks and recommendations
 * Author: Nicky ter Maat
 */

/**
 * Pass artist or song search from the client to the server and return the resultsdata back from the server to the client
 */
function getSearchData(){
var artist = $('#artistField').val();
var song = $('#songField').val();
console.log("Receiving data from /search...");
	$.ajax({
		url: '/search?artist='+artist+'&song='+song,
		dataType: 'json',
		type: 'get',
		cashe: false,
		success: function(data){
			// Depending on the type, the track or artist data will be returned.
			// If you have searched for songs, data will contain tracks.
			$(data.tracks).each(function(index, value){
				console.log("Received tracks data from /search!");
				console.log(data);

				var appendSearchResults = "";		// Dynamically create the result-html-display
				appendSearchResults += "<p>Listing results for <span>" + song + "</span></p>"

				console.log("Amount of results: " + data.tracks.items.length);
				for (var i = 0; i <data.tracks.items.length; i++) {
					appendSearchResults += "<article class='searchResult'>"
					appendSearchResults += "<img class='searchResultImage' src='" + data.tracks.items[i].album.images[0].url +"' 'alt=''/>"
					appendSearchResults += "<h3>" + data.tracks.items[i].name + "</h3>"
					appendSearchResults += "<div class='addTrack addSearchedTrack'><img src='img/add.png' alt='add track' /></div>"
					appendSearchResults += "<div class='addTrack playSearchedTrack'><img src='img/play.png' alt='play track' /></div>"
					appendSearchResults += "</article>"
				}

				$("#searchResults").append(appendSearchResults);
			});

			// If you have searched for artists, data will contain artists
			$(data.artists).each(function(index, value){
				console.log("Received artist data from /search!");
				console.log(data);

				var appendSearchResults = ""; // Dynamically create the result-html-display
				appendSearchResults += "<p>Listing results for <span>" + artist + "</span></p>"

				console.log("Amount of results: " + data.artists.items.length);
				for (var i = 0; i <data.artists.items.length; i++) {
					appendSearchResults += "<article class='searchResult' id='"+data.artists.items[i].id+"'>"
					//appendSearchResults += "<img class='searchResultImage' src='" + data.artists.items[i].images[0].url +"' 'alt=''/>" //image does not want to display properly
					appendSearchResults += "<h3>" + data.artists.items[i].name + "</h3>"
					appendSearchResults += "<div class='addTrack addSearchedTrack' ><img src='img/next.png' alt='add track' /></div>"
					appendSearchResults += "<div class='addTrack addSearchedTrack'><img src='img/add.png' alt='add track' /></div>"
					appendSearchResults += "<div class='addTrack playSearchedTrack top_tracks' id='"+data.artists.items[i].id+"'><img src='img/play.png' alt='play track' /></div>"
					appendSearchResults += "</article>"
				}

				$("#searchResults").append(appendSearchResults);
			});
		}
	});
}

/**
 * If the searched artist is selected, its top tracks will be displayed. The artists id is sent from client to server, top tracks data is returned from server to client.
 */
// Unfortunately, I was unable to get the click events working on dynamically generated elements. Sorry for that..
$('.searchResult').click(function(e){var id=e.target.attr('id'); console.log(e)}); //getTopTracksFromArtist(id);});
function getTopTracksFromArtist() {
	// Using hardcoded artist ID to be able to display some top tracks
	var artistID = "12Chz98pHFMPJEknJQMWvI" //id;
	console.log("Receiving data from /top_tracks..." + artistID);

	var appendSearchResults = "";		// Dynamically create the result-html-display
	appendSearchResults += "<p>Listing results for <span>" + artistID + "</span></p>"

		$.ajax({
			url: '/top_tracks?artist='+artistID,
			dataType: 'json',
			type: 'get',
			cashe: false,
			success: function(data){

				console.log("Received tracks data from /top_tracks!");
				console.log(data);
				//console.log("Amount of results: " + data.tracks.length);
				$(data.tracks).each(function(index, value){
					appendSearchResults = "";
					appendSearchResults += "<article class='searchResult'>"
					appendSearchResults += "<img class='searchResultImage' src='" + data.tracks[index].album.images[0].url +"' 'alt=''/>"
					appendSearchResults += "<h3>" + data.tracks[index].name + "</h3>"
					appendSearchResults += "<div class='addTrack addSearchedTrack'><img src='img/add.png' alt='add track' /></div>"
					appendSearchResults += "<div class='addTrack playSearchedTrack'><img src='img/play.png' alt='play track' /></div>"
					appendSearchResults += "</article>"

					$("#searchResults").append(appendSearchResults);
				});

			}
		});
	}

/**
 * Recommendations for the selected track.Sending artist and track ID from client to server, returning recommendation data from server to client.
 */
 // Unfortunately, I was unable to get the click events working on dynamically generated elements. Sorry for that..
	$('#recommend_button').click(function() {getRecommendations();});
	function getRecommendations() {
		// Using hardcoded artist and track ID to be able to display some recommendations.
		var artistID = "12Chz98pHFMPJEknJQMWvI" //$('#artist_id').val();
		var trackID = "0eFHYz8NmK75zSplL5qlfM" //$('#track_id').val();
		console.log("Receiving data from /recommendations..." + "Artist: " + artistID + "Song: " + trackID);

		var appendSearchResults = "";		// Dynamically create the result-html-display
		appendSearchResults += "<p>Listing results for <span>" + artistID + trackID + "</span></p>"

			$.ajax({
				url: '/recommend?artist='+artistID+'&song='+trackID,
				dataType: 'json',
				type: 'get',
				cashe: false,
				success: function(data){
					//$("#searchResults").remove();
					console.log("Received tracks data from /recommendations!");
					console.log(data);
					//console.log("Amount of results: " + data.tracks.length);
					$(data.tracks).each(function(index, value){
						appendSearchResults = "";
						appendSearchResults += "<article class='searchResult'>"
						appendSearchResults += "<img class='searchResultImage' src='" + data.tracks[index].album.images[0].url +"' 'alt=''/>"
						appendSearchResults += "<h3>" + data.tracks[index].name + "</h3>"
						appendSearchResults += "<div class='addTrack addSearchedTrack'><img src='img/add.png' alt='add track' /></div>"
						appendSearchResults += "<div class='addTrack playSearchedTrack'><img src='img/play.png' alt='play track' /></div>"
						appendSearchResults += "</article>"
						$("#searchResults").append(appendSearchResults);

					});

				}
			});
		}

/**
 * End of search, top tracks and recommendations.
 */
