'use strict';

var git      = require('./git.js');
var tools    = require('./tools.js');
var Shop     = require('./shop.js');
var spawn    = require('child_process').spawn;
var fs       = require('fs');
var Deferred = require('promised-io/promise').Deferred;
var seq      = require('promised-io/promise').seq;

module.exports = {};

var Repo;
module.exports.Repo = Repo = function (directory, remote, branch)
{
	this.getDirectory = function ()
	{
		return directory;
	};

	this.getRemote = function () 
	{
		return remote;
	};

	this.getBranch = function ()
	{
		return branch;
	};
};

var buildRepo;
module.exports.buildRepo = buildRepo = function (directory)
{
	var d = new Deferred();

	git.isRepository(directory).then(function (yes) {
		if (yes)
		{
			git.getInfo(directory).then(function (info) {
				d.resolve(new Repo(directory, info.remote, info.branch));
			}, function () {
				d.reject('Could not get repository info.');
			});
		}
		else
		{
			d.reject('Not a git repository');
		}
	});

	return d.promise;
};

module.exports.list = function (directory)
{
	var entries = fs.readdirSync(directory);

	var directories = [];

	for (var i = 0; i < entries.length; i++)
	{
		var entry = directory + '/' + entries[i];
		if (fs.lstatSync(entry).isDirectory())
		{
			directories.push(entry);
		}
	}

	return tools.mapPromise(directories, buildRepo);
}