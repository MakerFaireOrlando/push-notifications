(function(express, gcm, bodyParser, redis, keys, apn){
    var app = express(),
        sender = new gcm.Sender(keys.gcmSender),
        redisClient = redis.createClient(),
        clientIDsSetName = 'clientIDs',
        iOSClientIDsSetName = 'iOSClientIDs',
        apnConnection = new apn.Connection({});

        // clientIDsMap is used as a HashMap to see if the
        // clientIDs array contains a specific ID
    var clientIDsMap = {},
        clientIDs = [],
        iOSClientIDsMap = {},
        iOSClientIDs = [];
    redisClient.on('error', function(err) {
      console.log('Redis Error: ' + err);
    });

    redisClient.on('ready', function(){
      // Get the set of android device IDs from redis, iterate over them all
      // and add them to the clientIDsMap object and the clientIDs array
      redisClient.smembers(clientIDsSetName, function(err, reply){
        if(err){
          console.log("Error: " + err);
        } else {
          console.log(reply);
          for(var i = 0; i < reply.length; i ++){
            if(!clientIDsMap[reply[i]]){
              clientIDsMap[reply[i]] = true;
              clientIDs.push(reply[i]);
            }
          }
        }
      });
      redisClient.smembers(iOSClientIDsSetName, function(err, reply){
        if(err){
          console.log("Error: " + err);
        } else {
          console.log(reply);
          for(var i = 0; i < reply.length; i ++){
            if(!clientIDsMap[reply[i]]){
              clientIDsMap[reply[i]] = true;
              clientIDs.push(reply[i]);
            }
          }
        }
      });
    });

    // Helper function for GCM
    function newMessage(data) {
        return new gcm.Message({
            collapseKey: 'demo',
            delayWhileIdle: true,
            data: data
        });
    }

    function isValidID(id, fn){
      // TODO: actually validate the id
      fn();
    }

    function isValidiOSID(id, fn){
      // TODO: actually validate the id
      fn();
    }

    function saveID(id) {
      if(!clientIDsMap[id]){
        isValidID(id, function(){
          clientIDsMap[id] = true;
          clientIDs.push(id);
          redisClient.sadd(clientIDsSetName, id);
        })
      }
    }

    function saveiOSID(id) {
      if(!iOSClientIDsMap[id]){
        isValidiOSID(id, function(){
          iOSClientIDsMap[id] = true;
          iOSClientIDs.push(id);
          redisClient.sadd(iOSClientIDsSetName, id);
        })
      }
    }

    app.use(bodyParser());

    /*
     * Routes
     */
    app.route('/register/android')
        /**
         * POST /register/android {"id": "the_device_id"}
         */
        .post(function(req, res, next){
            var body = req.body,
                data = body.data,
                clientID = body.id;
            console.log('clientID = ' + clientID);  
            saveID(clientID);
            res.send(200);
        });
    app.route('/register/ios')
        /**
         * POST /register/ios {"id": "the_device_id"}
         */
        .post(function(req, res, next){
            var body = req.body,
                data = body.data,
                clientID = body.id;
            console.log('ios clientID = ' + clientID);  
            saveiOSID(clientID);
            res.send(200);
        });
    app.route('/broadcast/:text')
        /**
         * TODO: This is only a temporary way to send push notifications.
         *       We need to add some form of authentication.
         * GET /broadcast/:text
         */
        .get(function(req, res, next){
            var text = req.params.text;
            var message = newMessage({message:text}); 
  
            var registrationIds = clientIDs;
            console.log("in broadcast: clientIDs = " + clientIDs);

            /**
             * Params: message-literal, registrationIds-array, No. of retries, callback-function
             **/
            sender.send(message, registrationIds, 4, function (err, result) {
              if(err){
                console.log("Yep, there was an error... the regids were " + registrationIds);
                console.log("Error code: " + err);
              }
                console.log("Text: "+ text);
                console.log(result);
            });

            /*
              Send to iOS devices
             */

            for(var i = 0; i < iOSClientIDs.length; i++){
              var deviceID = iOSClientIDs[i];
              var myDevice = new apn.Device(deviceID);

              var note = new apn.Notification();

              note.expiry = Math.floor(Date.now() / 1000) + 3600;
              note.sound = "ping.aiff";
              note.alert = text;
              console.log('sending message to iOS device: ' + deviceID)
              note.payload = {'messageFrom': 'your mother'};

              apnConnection.pushNotification(note, myDevice);
            }

            res.send(200);
      })
    
    var port = process.env.PORT || 9999;
    app.listen(port, function () {
        console.log('Express server listening on port %s', port);
    });
}(require('express'), require('node-gcm'), require('body-parser'),
  require('redis'), require('./keys'), require("apn")));
