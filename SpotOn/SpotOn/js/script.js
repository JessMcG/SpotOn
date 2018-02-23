$(document).ready(function(){
   
	
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

});

$.ajax({
		url: 'data.json',
		dataType: 'json',
		type: 'get',
		cashe: false,
		success: function(data){
			$(data.tracks).each(function(index, value){


				var appendTrack = "<li class='trackOnProfile'><p>" + value.artist_name + " - <span>" + value.track_name + " " + "</span></p><div class='playTrackProfile'><img src='img/play.png' alt='play track' />";

				$("ol li:even").css("background-color", "#fafafa");

				$("#allTracks").append(appendTrack);  	


			});

			var t = 0;
			
			$("#trackArt").attr("src",data.tracks.[t].album_art);
			$("#coverArtBluredInner").attr("src",data.tracks[t].album_art);
			$("#playerArtistName").html(data.tracks[t].artist_name);
			$("#playerTrackName").html(data.tracks[t].track_name);
			$("#playerPlaylistTitle").html(data.tracks[t].playlist_title);
			$("#ffs").attr("src",data.tracks[t].track);				
			var playListLength = data.tracks.length;

			$("#playNext").click(function(){
				t++;
				if(t > playListLength +1){
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
					$(".playTrackButton2").hide();
					$(".playTrackButton").show();
				}
			});

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
					$(".playTrackButton2").hide();
					$(".playTrackButton").show();
				}
			});

			$("audio").hide();

			$(".playTrackButton").click(function(){

				$("#ffs").trigger('play');

			});
			$(".playTrackButton2").click(function(){

				$("#ffs").trigger('pause');

			});
		}
	});
