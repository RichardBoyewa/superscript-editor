// The main application script, ties everything together.

var mongoose = require('mongoose');
var sfact = require("sfacts");
var ss = require("superscript");

var express = require('express');
var app = express();

var appServer = require('http').Server(app);
var io = require('socket.io')(appServer);

var port = process.env.PORT || 3000;
var dbName = process.env.BOT || "testbot";

var config = { db: 'mongodb://localhost/' + dbName }
var options = { server: { socketOptions: { keepAlive: 1 } } };
var factSystem = sfact.create(dbName);
var users = [];

mongoose.connect(config.db, options, function(err){
  if (err) console.log("Error connecting to the MongoDB --", err);
});

var botOptions = {
  mongoose : mongoose,
  factSystem: factSystem
}
var botData = [];

app.projectName = dbName;
var conn = mongoose.connection;


conn.once('open', function() {

  var models = require('superscript/lib/topics/index')(mongoose, factSystem);

  require('./config/express')(app);
   

  new ss(botOptions, function(err, botInstance){
    require('./config/chat')(io, botInstance, models);

    var dashRoutes = require('./controllers/dashboard')(models, botInstance);
    var gambitRoute = require('./controllers/gambits')(models, botInstance);
    var topicsRoute = require('./controllers/topics')(models, botInstance);
    var pluginsRoute = require('./controllers/plugins')(models, botInstance);
    
    // General routs
    app.get('/', dashRoutes.index);
    app.get('/docs', dashRoutes.docs);
    app.get('/import', dashRoutes.load);
    app.post('/import', dashRoutes.postdata);

    // Plugin JSON
    app.get('/plugins', pluginsRoute.getJSON);

    // Gambits CRUD and nested replies
    app.get('/gambits', gambitRoute.index);
    app.post('/gambits', gambitRoute.post);
    
    app.post('/gambits/quick', gambitRoute.quickPost);
    app.post('/gambits/:id', gambitRoute.post); 
    
    app.get('/gambits/new', gambitRoute.new);
    app.put('/gambits/:id', gambitRoute.update); 
    app.get('/gambits/:id', gambitRoute.show);
    app.delete('/gambits/:id', gambitRoute.delete); 

    app.get('/gambits/:id/replies', gambitRoute.replies); 

    app.post('/gambits/:id/reply', gambitRoute.reply); 
    app.delete('/gambits/:id/reply', gambitRoute.deleteReply);
    app.put('/gambits/:id/reply/:rid', gambitRoute.updateReply); 
    app.post('/gambits/:id/test', gambitRoute.test)

    // Topics
    app.get('/topics', topicsRoute.index);
    app.post('/topics', topicsRoute.post); 
    app.post('/topics/:id/atf', topicsRoute.atf); 
    app.get('/topics/:id', topicsRoute.show);
    app.delete('/topics/:id', topicsRoute.delete);
  });

  var server = appServer.listen(port, function () {
    var host = server.address().address
    var port = server.address().port
    console.log('\n\n\tSuperScript Community Editor.\n\tListening at http://%s:%s\n\tBot Name: %s\n\n\tSwitch or create a new bot by starting `BOT=<name> node app.js`\n\n', host, port, dbName)
  });
});

module.exports = app;