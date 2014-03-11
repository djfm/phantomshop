'use strict';

var git = require('./git.js');

module.exports = function Installer(config, settings)
{
	var my = this;

	this.install = function (then)
	{
		var shops = config.mongo.collection('shops');

		var baseFolderName = settings.shopName.replace(/[^\w]+/g, '');

		shops.count(function (err, n) {
			var folderName = n + baseFolderName;
			var path = config.rootDirectory + '/' + folderName;
			shops.insert({
				folderName: folderName,
				shopName: settings.shopName,
				path: path
			}, function () {
				my.getFilesTo(path, then);
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