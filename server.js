//Login function obtained from https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow

var express = require('express'); // Express web server framework
var session = require('express-session'); //Express Session Module
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/spot_on";

/*var jquery = require("node-jsdom");
jquery.env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }

    var $ = require("jquery")(window);
});*/


var client_id = '703c95bc02d947b9b49c0b5e50cfaa3f'; // Your client id
var client_secret = '911cbe0e20f847769f5981267259c13a'; // Your secret
var redirect_uri = req.protocol + '://' +req.get('host') + '/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({secret: 'rory_and_charlie'}));

//Initialise the database connection
var db;

MongoClient.connect(url, function(err, database){
  if(err) throw err;
  db = database;
  //app.listen(8080);
});

// /login
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-read-private';
  scope += ' user-library-read playlist-modify-public playlist-modify-private';
  scope += ' playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

// /callback
app.get('/callback/', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
    querystring.stringify({
      error: 'state_mismatch'
    }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
        refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
          //Search database for the current user ID
          db.collection('users').find({user_id: body.id}).toArray(function(err, result) {
            if (err) throw err;
            //If user_id already exists, update the database
            if (result.length>0){
              db.collection('users').update({user_id: body.id},{user_id: body.id, access_token: access_token, refresh_token: refresh_token}, function(err, result) {
                if (err) throw err;
                console.log('Saved to Database');
                //add user details to current Session
                req.session.user_id = body.id;
                req.session.access_token = access_token;
                console.log('session ID = '+ req.session.id);
                console.log('session User ID = '+ req.session.user_id);
                console.log('session Access Token = '+ req.session.access_token);
                //redirect to home
                res.redirect('/');
              });
            }
            //otherwise create a new user account
            else {
              db.collection('users').insert({user_id: body.id, access_token: access_token, refresh_token: refresh_token}, function(err, result) {
                if (err) throw err;
                console.log('Saved to Database');
                //add user details to current Session
                req.session.user_id = body.id;
                req.session.access_token = access_token;
                req.session.loggedin = true;
                console.log('session ID = '+ req.session.id);
                console.log('session User ID = '+ req.session.user_id);
                console.log('session Access Token = '+ req.session.access_token);
                //redirect to home
                res.redirect('/');
              });
            }

          });
        });
        //Change Login Button to Logout

      /*  $(".loginButton").click(function(){
    		    $(".loginButton").hide();
    		    $(".logoutButton").show();
      });*/
      } else {
        res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
      }
    });
  }
});

// /refresh_token
app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

//Profile Page
app.get('/profile', function(req, res) {
  //redirect if not logged in
  if(!req.session.loggedin){res.redirect('/login');return;}

  //Get User profile details from Spotify
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = req.session.access_token;

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        console.log(body);

        //Parse JSON to get user profile details
        if(body.display_name!=null){
          var display_name = body.display_name;
        }
        else {
          var display_name = body.id;
        }
        var image_url = body.images.url;
      });
    }
  });

  //Get User playlists from Spotify
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = req.session.access_token;
      var user_id = req.session.user_id;

      var options = {
        url: 'https://api.spotify.com/v1/users/'+req.session.user_id+'/playlists',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        console.log(body);

        //Parse JSON to get user playlist details
        var playlists = body;
        /*var playlist_name = body.name;
        var playlist_tracks = body.tracks.total;
        var playlist_image = body.images.url;*/
      });
    }
  });

  //Get User Tracks from Spotify
  	//https://api.spotify.com/v1/me/tracks

  //Get User Searches from Mongo
  db.collection('users').find({user_id: req.session.user_id}).toArray(function(err, result) {
    if (err) throw err;
    //Get user's searches from DB
    if (result.length>0){
        var searches = result.searches;
        console.log('Searches: '+searches);
        //Display searches on page
        for (var i = 0; i < searches.length; i++) {
          var type = searches[i].type;
          var name = searches[i].name;
        }
      }
  });

});

/**
 * Search for artist or track
 * name = artist_name or song_title
 * type = artist or track
 */
app.get('/search', function(req, res) {

  //TODO: Check if logged in
  // if(!req.session.loggedin){res.redirect('/login'); return;}

  var access_token = req.session.access_token;
  var query = req.query.q;
  var type = req.query.type;
  var searchoptions = {
    url: 'https://api.spotify.com/v1/search?' +
    querystring.stringify({
      q: query,
      type: type,
      limit: 8
    }),
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      res.send("Status 200 it worked");

      console.log(response.jsonData);

      request.get(searchoptions, function(error, response, body) {
        console.log(body);
        //console.log("SEARCH RESULTS \n" + "\tARTIST: " + body.artists + "\n\TRACK": body.track);
      });
    }
  });
});

/**
  * End of Search and Recommendations
  */

//Playlist functions
/*
app.post('/create_pl', function(req, res) {
  request.post(authOptions, function(err, res, body) {
    if(!error && response.statusCode === 200){
      var newpl = {
        name: "New Playlist",
        description: "New playlist description",
        public: false
      };
  $.ajax({
    type: 'POST',
    url: 'https://api.spotify.com/v1/users/{'+req.esssion.user_id+'}/playlists',
    dataType: 'json',
    data: ~jsonData~
    headers: {
      "name": "New Playlist",
      "description": "New playlist description",
      "public": false
    } else {
      console.log(err);
    });
  res.send("...")
});

app.get('/get_pl', function(req, res) {
  // GET https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}});

app.get('/addto_pl', function(req, res) {
  // POST https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks
  // get_pl, using user_id, then POST track uri(s) to res
  request.post(authOptions, function(err, res, body) {
    if ((!error && response.statusCode === 200) {
      $.ajax({
        dataType: 'text',
        type: 'post',
        url: 'https://api.spotify.com/v1/users/'+req.session.user_id+'/playlists/'+##PLAYLISTID##+'/tracks'
        headers: { 'Authorization': 'Bearer ' + access_token },
        success: function(response) {
          console.log(response);
        }
      });
    } else {
      console.log(err);
    });
  });
});

app.get('/rm_song', function(req, res) {
  // DELETE https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks
  // get_pl, using user_id, then DELETE track in req?  request.post(authOptions, function(err, res, body) {
    if ((!error && response.statusCode === 200) {
      $.ajax({
        dataType: 'text',
        type: 'delete',
        url: 'https://api.spotify.com/v1/users/'+req.session.user_id+'/playlists/'+##PLAYLISTID##+'/tracks'
        headers: { 'Authorization': 'Bearer ' + access_token },
        success: function(response) {
          console.log(response);
        }
      });
    } else {
      console.log(err);
    });
  });
});

app.get('/edit_detail', function(req, res) {
  // PUT https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}
  // get_pl then PUT newdeets in playlist_id
  var newdeets = {
  name: "Updated Playlist Name",
  description: "Updated playlist description",
  public: false
  }
});

//new route
//app.get('', function(req, res) {
//});

*/


app.get('/logout', function(req, res) {
  req.session.loggedin = false;
  req.session.destroy(function(err) {
    //no more session
    //change back to login Button
    /* $(".logoutButton").click(function(){
		    $(".logoutButton").hide();
		    $(".loginButton").show();
      }); */
  });
});

console.log('Listening on 8080');
app.listen(8080);
