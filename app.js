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
var rest = require('restless');

var Installer = require('./lib/installer.js');
var Shop = require('./lib/shop.js');

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

app.post('/validuri', function (request, response) {
    var uri = request.param('uri');

    if (/^\w+:\/\//.exec(uri))
    {
        rest.head(uri, function (error, data) {
            response.send(error ? false : true);
        });
    }
    else if (/^\//.exec(uri))
    {
        response.send(fs.existsSync(uri));
    }
    else
    {
        response.send(false);
    }
});

app.get('/', function (request, response) {
    response.render('index');
});

app.get('/install', function (request, response) {
    response.render('install', {repository: config.prestaShopRepository});
});

app.post('/install', function (request, response) {

    var installer = new Installer(config, request.body);

    installer.install(function () {
        response.redirect('/shops/' + installer.folderName);
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
                    shop = new Shop(config, shop);
                    shops.push(shop);
                }
            }
            response.render('shops', {shops: shops});
        });
    });

});

var withShop = function withShop (folderName, callback)
{
    config.mongo.collection('shops').find({'folderName': folderName}, function (err, data) {
        if (err)
        {
            callback("Shop query failed.", null);
        }
        else
        {
            data.toArray(function (err, data) {
                if (err)
                {
                    callback('Could not convert Shop data to array.', null);
                }
                else
                {
                    var maybeShop = data[0];
                    if (maybeShop)
                    {
                        var shop = new Shop(config, maybeShop);
                        callback(null, shop);
                    }
                    else
                    {
                        callback("Could not find shop.", null);
                    }
                }
            });
        }
    });
};

app.get('/shops/:folderName', function (request, response) {
    withShop(request.param('folderName'), function (err, shop) {
        response.render('shop', {shop: shop});
    });
});

app.post('/start/:folderName', function (request, response) {
    var folderName = request.param('folderName');
    withShop(folderName, function (err, shop) {
        shop.startServer(function () {
            response.redirect('/shops/' + folderName);
        });
    });
});

app.post('/stop/:folderName', function (request, response) {
    var folderName = request.param('folderName');
    withShop(folderName, function (err, shop) {
        shop.stopServer(function () {
            response.redirect('/shops/' + folderName);
        });
    });
});

/*
 * Start it up
 */

config.appRoot = __dirname;

config.runningServers = {};
config.portsInUse = {};

function cleanup(andExit)
{
    console.log("Cleaning up!");
    for (var s in config.runningServers)
    {
        var child = config.runningServers[s];
        child.process.kill();
    }

    if (andExit !== false)
    {
        process.exit();
    }
}

process.on('SIGUSR2', cleanup);
process.on('SIGINT', cleanup);

mongoClient.connect('mongodb://' + config.mongoHost + ':' + config.mongoPort + '/' + config.mongoDatabase, function (err, db) {
    if (!err)
    {
        config.mongo = db;
        app.listen(process.env.PORT || port);
        console.log('Rocking on on port ' + port + '!');
    }
});

