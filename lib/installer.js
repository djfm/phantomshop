'use strict';

var git      = require('./git.js');
var Repos    = require('./repos.js');
var Shop     = require('./shop.js');
var spawn    = require('child_process').spawn;
var fs       = require('fs');
var Deferred = require('promised-io/promise').Deferred;
var seq      = require('promised-io/promise').seq;


module.exports = function Installer(config, settings)
{
	var my = this;

	this.createShop = function (n)
	{
		var d = new Deferred();

		my.shopName = settings.shopName;
		my.folderName = n + settings.shopName.replace(/[^\w]+/g, '');
		my.path = config.rootDirectory + '/' + my.folderName;

		if (my.path[0] !== '/')
		{
			path = config.appRoot + '/' + my.path;
		}

		my.screenShotsFolder = config.appRoot + '/assets/screenshots/' + my.folderName;

		var shopData = {
			folderName: my.folderName,
			screenShotsFolder: my.screenShotsFolder,
			shopName: my.shopName,
			path: my.path
		};

		config.mongo.collection('shops').insert(shopData, function (err) {
			if (err)
			{
				d.reject('Could not save Shop in database.');
			}
			else
			{
				var shop = new Shop(config, shopData);
				d.resolve(shop);
			}
		});

		return d.promise;
	};

	this.startInstall = function (shop)
	{
		var d = new Deferred();

		shop.refreshData();

		var args = [config.appRoot + '/ghosts/install.js',
			'--url', shop.installerURL,
			'--screenshots', shop.screenShotsFolder,
			'--tablesPrefix', shop.folderName,
			'--shopName', my.shopName
		];

		if (settings.installLanguage)
		{
			args.push('--language');
			args.push(settings.installLanguage);
		}

		if (settings.installCountry)
		{
			args.push('--countryCode');
			args.push(settings.installCountry);
		}

		console.log('running: phantomjs ' + args.join(' '));

		var child = spawn('phantomjs', args, {stdio: 'inherit'});
		child.on('exit', function (code) {
			if (code === 0)
			{
				d.resolve(shop);
			}
			else
			{
				d.reject('The installation failed for some reason!');
			}
		});

		return d.promise;
	}

	this.install = function ()
	{
		return seq([
			Shop.count.bind({}, config.mongo.collection('shops')),
			my.createShop,
			my.fillShopFiles,
			function (shop) {
				return shop.startServer();
			},
			my.startInstall,
			function (shop) {
				return shop.postInstall();
			}
		]);
	};

	this.fillShopFiles = function (shop)
	{
		var d = new Deferred();

		var src = (config.appRoot + '/repos/' + settings.repository);
		console.log('Src: ' + src);

		require('ncp').ncp(src, shop.path, function (error) {
			if (error)
			{
				d.reject(error);
			}
			else
			{
				d.resolve(shop);
			}
		});

		return d.promise;
	};
};