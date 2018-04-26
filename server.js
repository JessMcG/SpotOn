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
// var redirect_uri = req.protocol + '://' +req.get('host') + '/callback'; // Your redirect uri

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

  var redirect_uri = req.protocol + '://' +req.get('host') + '/callback/';
  console.log(redirect_uri);

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

  //var redirect_uri = req.protocol + '://' +req.get('host') + '/callback/';
  //console.log(redirect_uri);

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;
  var playlist_id = '4dXHVSoRU19YNOvRxKH8Xr'
  var search = '0c6xIDDpzE81m2q797ordA';

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
        redirect_uri: req.protocol + '://' +req.get('host') + '/callback/',
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
          if(body.display_name!=null){
            var display_name = body.display_name;
          }
          else {
            var display_name = body.id;
          }
          var image_url = body.images.url;
          //Search database for the current user ID
          db.collection('users').find({user_id: body.id}).toArray(function(err, result) {
            if (err) throw err;
            //If user_id already exists, update the database
            if (result.length>0){
              db.collection('users').update({$eq: {user_id: body.id}},{user_id: body.id, display_name: display_name, image_url: image_url, access_token: access_token, refresh_token: refresh_token, search: search, playlist_id: playlist_id}, function(err, result) {
                if (err) throw err;
                console.log('Saved to Database');
                //add user details to current Session
                req.session.user_id = body.id;
                req.session.access_token = access_token;
                req.session.loggedin = true;
                req.session.search = search;
                req.session.playlist_id = playlist_id;
                console.log('session ID = '+ req.session.id);
                console.log('session User ID = '+ req.session.user_id);
                console.log('session Access Token = '+ req.session.access_token);
                console.log('dummy playlist = '+ req.session.playlist_id);
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
  var code = req.query.code || null;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: req.protocol + '://' +req.get('host') + '/callback/',
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };

  //Get User profile details from Spotify - Getting details on login
  /*request.post(authOptions, function(error, response, body) {
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
  });*/

  //Get User playlists from Spotify
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = req.session.access_token;
      var user_id = req.session.user_id;

      var options = {
        url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists',
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
  //TODO Catch if no searches
  db.collection('users').find({user_id: req.session.user_id}).toArray(function(err, result) {
    if (err) throw err;
    //Get user's searches from DB
    if (result.length>0){
        var searches = result.searches;
        console.log('Searches: '+searches);
        //Display searches on page
        /*for (var i = 0; i < searches.length; i++) {
          var type = searches[i].type;
          var name = searches[i].name;
        }*/
      }
  });

});

/*
 * Search for artist or track
 * name = artist_name or song_title
 * type = artist or track

app.get('/search', function(req, res) {


  //TODO: Check if logged in
  // if(!req.session.loggedin){res.redirect('/login'); return;}

  var access_token = req.session.access_token;

  var query = req.query.q;
  var type = req.query.type;
  var searchoptions = {
    url: 'https://api.spotify.com/v1/search?' +
    querystring.stringify({
      query: query,
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

        console.log("\nSEARCH RESULTS \n");
        if (body.artists) {
          for (var i = 0; i < body.artists.items.length; i++) {
            console.log("\t ARTIST: " + body.artists.items[i].name);
          }
        } else if (body.tracks) {
          for (var i = 0; i < body.tracks.items.length; i++) {
            console.log("\t ARTIST: " + body.artists.items[i].name);
          }
        }
//=======
        //console.log("SEARCH RESULTS \n" + "\tARTIST: " + body.artists + "\n\TRACK": body.track);
//>>>>>>> ac65cc00feb7d32f9724e36c500ca4e9f389a3b7
      });
    }
  });
});
* End of Search and Recommendations
*/

// Playlist functions
// Lew McCullough / mcsmall1

app.get('/seedpl', function(req, res, body) {
// get global access token and user id
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
  var tracks = '';
// check if logged in
  if(access_token!=null){
    console.log('Start Seeding Playlist');


// query db for search term
    var query = {user_id: user_id};
    var proj = {'search': true};
    db.collection('users').find(query, proj).toArray(function(err, result) {
      if (result!=null){
        console.log('db.find result: ' +result);
      } else {
        console.log('No db.find result' +err);
      };
    });


// build request options
    var track = '0c6xIDDpzE81m2q797ordA';
    var querystring = '?limit=25&seed_tracks='+track //;
    var headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + access_token
    };
    var options = {
      url: 'https://api.spotify.com/v1/recommendations'+querystring,
      headers: headers
    };


// make GET request to Spotify API for 25 tracks seeded from search
    request.get(options, function(err, res, body) {
      if(!err && res.statusCode === 200){
        var pbody = JSON.parse(body);
        var trackuris = '';
        pbody.tracks.forEach(function(track){
          trackuris += track.uri + ',';
        });
        req.session.tracks = trackuris;
      } else {
        console.log('failed: ' + res.statusCode);
      };
    });
  } else {
    console.log('login required');
  };
});


app.get('/create_pl', function(req, res, body) {
// get global access token and user id
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
// check if logged in
  if(access_token!=null){
    console.log('Start Creating Playlist');


// build request options
    var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+ access_token
    };
    var datastring = '{"name": "SpotOn Playlist","description": "A playlist generated by the web app SpotOn","public": false}';
    var options = {
      url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists',
      method: 'POST',
      headers: headers,
      body: datastring
    };


// make POST to Spotify API to create a playlist on a given user_id's account
    request.post(options, function(err, res, body) {
      if(!err && res.statusCode === 201){
        console.log('success: ' + res.statusCode);
        var pbody = JSON.parse(body);
        console.log(body);
        var playlist_id = pbody.id;
        req.session.playlist_id = playlist_id;
        console.log('req.session.playlist_id ' +req.session.playlist_id);
      } else {
        console.log('failed: ' + res.statusCode);
      };
    });
  } else {
    console.log('login required');
  };
});



app.get('/addto_pl', function(req, res) {
// get global access token and user id
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
// check if logged in
  if(access_token!=null){
    console.log('Adding To Playlist');
    var playlist_id = req.session.playlist_id;
    var tracks = req.session.tracks;
    tracks = tracks.toArray.slice(tracks.length);
// build request options
    var headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer '+ access_token
    };
    var options = {
      url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists/'+playlist_id+'/tracks?position=0&uris='+tracks,
      headers: { 'Authorization': 'Bearer ' + access_token },
      body: tracks,
      method: 'POST',
      json: true
    };


// make POST request to Spotify API to add uris to a user_id's playlist_id
    request.post(options, function(err, res, body) {
      if(!err && res.statusCode === 201){
        console.log('success: ' + res.statusCode);
        var pbody = JSON.parse(body);
        console.log(body);
      } else {
        console.log('failed: ' + res.statusCode);
      };
    });
  } else {
    console.log('login required');
  };
});



app.get('/logout', function(req, res) {
  req.session.loggedin = false;
  req.session.destroy(function(err) {
    //no more session
    //change back to login Button
    $(".logoutButton").click(function(){
		    $(".logoutButton").hide();
		    $(".loginButton").show();
      });
  });

});

console.log('Listening on 8080');
app.listen(8080);
