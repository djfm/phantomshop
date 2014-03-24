'use strict';

var git      = require('./git.js');
var tools    = require('./tools.js');
var Shop     = require('./shop.js');
var spawn    = require('child_process').spawn;
var fs       = require('fs');
var path     = require('path');
var Deferred = require('promised-io/promise').Deferred;
var seq      = require('promised-io/promise').seq;

module.exports = {};

var Repo;
module.exports.Repo = Repo = function (directory, branch, remote, remoteName, remoteBranch, distance)
{
	this.pull = function ()
	{
		return git.pull(directory, remoteName, remoteBranch);
	};

	this.getDirectory = function ()
	{
		return directory;
	};

	this.getBranch = function ()
	{
		return branch;
	};

	this.getRemote = function () 
	{
		return remote;
	};

	this.getRemoteName = function ()
	{
		return remoteName;
	};

	this.getRemoteBranch = function () 
	{
		return remoteBranch;
	};

	this.getName = function ()
	{
		return path.basename(directory);
	};

	this.getDistance = function ()
	{
		return distance;
	};

	this.getLongName = function ()
	{
		return this.getName() + ' (' + this.getBranch() + ':' + this.getRemoteBranch() + '@' + this.getRemote() + ')';
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
				d.resolve(new Repo(directory, info.branch, info.remote, info.remoteName, info.remoteBranch, info.distance));
			}, function (error) {
				error = 'Could not get repository info: ' + error;
				console.log(error);
				d.reject(error);
			});
		}
		else
		{
			d.reject('Not a git repository: ' + directory);
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