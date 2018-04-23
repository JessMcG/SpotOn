function getPlaylists(user_id, access_token){
  //Get User playlists from Spotify
  var playlists;

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = req.session.access_token;
      var user_id = req.session.user_id;

      var options = {
        url: 'https://api.spotify.com/v1/me/playlists',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        console.log(body);

        //Parse JSON to get user playlist details
        playlists = body;
        /*var playlist_name = body.name;
        var playlist_tracks = body.tracks.total;
        var playlist_image = body.images.url;*/
      });
    }
  });
  return playlists;
}
