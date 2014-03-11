'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 3000;

var config = require('./config/config.js');
var mongoClient = require('mongodb').MongoClient;
var fs = require('fs');

var Installer = require('./lib/installer.js');

/*
 * Use Handlebars for templating
 */
var exphbs = require('express3-handlebars');

// For gzip compression
app.use(express.compress());
app.use(express.bodyParser());

/*
 * Config for Production and Development
 */
if (process.env.NODE_ENV === 'production') {
    // Set the default layout and locate layouts and partials
    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: 'dist/views/layouts/',
        partialsDir: 'dist/views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/dist/views');
    
    // Locate the assets
    app.use(express.static(__dirname + '/dist/assets'));

} else {
    app.engine('handlebars', exphbs({
        // Default Layout and locate layouts and partials
        defaultLayout: 'main',
        layoutsDir: 'views/layouts/',
        partialsDir: 'views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/views');
    
    // Locate the assets
    app.use(express.static(__dirname + '/assets'));
}

// Set Handlebars
app.set('view engine', 'handlebars');



/*
 * Routes
 */
// Index Page
app.get('/', function (request, response) {
    response.render('index');
});

app.get('/install', function (request, response) {
    response.render('install');
});

app.post('/install', function (request, response) {

    var installer = new Installer(config, request.body);

    installer.install(function () {
        response.render('after-install');
    });

});

app.get('/shops', function (request, response) {

    config.mongo.collection('shops').find({shopName: {$exists: true}}, function (err, data) {
        data.toArray(function (err, maybeShops) {
            var shops = [];
            for (var i = 0; i < maybeShops.length; i++)
            {
                var shop = maybeShops[i];
                if (fs.existsSync(shop.path))
                {
                    shop.url = config.rootURL + '/' + shop.folderName;
                    shops.push(shop);
                }
            }
            response.render('shops', {shops: shops});
        });
    });

});

/*
 * Start it up
 */

mongoClient.connect('mongodb://127.0.0.1:27017/phantomshop', function (err, db) {
    if (!err)
    {
        config.mongo = db;
        app.listen(process.env.PORT || port);
        console.log('Rocking on on port ' + port + '!');
    }
});

