# Push Notification Server
This server allows registration of android and iOS devices and push notifications to registered devices.

## Setting up GCM
* Todo
* Add your key to the keys.js.template
```
mv keys.js.template keys.js
```

## Setting up APNs
* Todo

## Running the Server

Run 
```
$ npm install
```
Make sure you have redis installed. Start Redis with default port and values.
```
$ redis-server
```
Start app with default port
```
$ node app.js
```
or with custom port
```
$ PORT=1234 node app.js
```
