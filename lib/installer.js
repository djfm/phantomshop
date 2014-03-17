'use strict';

var git = require('./git.js');
var Shop = require('./shop.js');
var spawn = require('child_process').spawn;
var fs = require('fs');

module.exports = function Installer(config, settings)
{
	var my = this;

	this.install = function (then)
	{
		var shops = config.mongo.collection('shops');

		var baseFolderName = settings.shopName.replace(/[^\w]+/g, '');

		shops.count(function (err, n) {
			var folderName = my.folderName = n + baseFolderName;
			var path = config.rootDirectory + '/' + folderName;
			if (path[0] !== '/')
			{
				path = config.appRoot + '/' + path;
			}

			var screenShotsFolder = config.appRoot + '/assets/screenshots/'+folderName;

			var shopData = {
				folderName: folderName,
				screenShotsFolder: screenShotsFolder,
				shopName: settings.shopName,
				path: path
			};
			shops.insert(shopData, function () {
				
				var shop = new Shop(config, shopData);

				my.getFilesTo(path, function () {
					shop.startServer(function (){

						shop.refreshData();

						var args = [config.appRoot + '/ghosts/install.js', '--url', shop.installerURL, '--screenshots', screenShotsFolder];

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
						child.on('exit', function () {
							then();
						});
					});
				});
			});
		});
	};

	this.getFilesTo = function (path, then)
	{
		var branch = settings.branch;
		var repo = settings.repository || config.prestaShopRepository;

		console.log('Cloning ' + repo + ' (branch ' + branch + ') to ' + path);

		git.clone(path, repo, branch, function () {
			then();
		});
	};
};