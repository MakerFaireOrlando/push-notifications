(function(express, gcm, bodyParser, redis, keys, apn){
    var app = express(),
        sender = new gcm.Sender(keys.gcmSender),
        redisClient = redis.createClient(),
        clientIDsSetName = 'clientIDs',
        iOSClientIDsSetName = 'iOSClientIDs',
        apnConnection = new apn.Connection({});

    var clientIDsMap = {},
        clientIDs = [],
        iOSClientIDsMap = {"f44182de 1688fcd9 27b87925 547b5035 0bfbbc83 2d415c1e a5e48a59 3616ef57":true},
        iOSClientIDs = ["f44182de 1688fcd9 27b87925 547b5035 0bfbbc83 2d415c1e a5e48a59 3616ef57"];

    redisClient.on('error', function(err) {
      console.log('Redis Error: ' + err);
    });

    redisClient.on('ready', function(){
      // smembers = set members. Returns all of the elements of a set.
      redisClient.smembers('clientIDs', function(err, reply){
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
      })
    })

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
     * i forgot what i was going to write here... 
     */
    app.route('/register/android')
        .post(function(req, res, next){
            var body = req.body,
                data = body.data,
                clientID = body.id;
            console.log('clientID = ' + clientID);  
            saveID(clientID);
            res.send(200);
        });
    app.route('/register/ios')
        .post(function(req, res, next){
            var body = req.body,
                data = body.data,
                clientID = body.id;
            console.log('ios clientID = ' + clientID);  
            saveiOSID(clientID);
            res.send(200);
        });
    app.route('/broadcast/:text')
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
              note.alert = message;
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
