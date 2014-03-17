'use strict';

var spawn = require('child_process').spawn;
var fs = require('fs');

module.exports = function Shop (config, data)
{
	var my = this;

	for (var i in data)
	{
		this[i] = data[i];
	}
	this.url = config.rootURL + '/' + this.folderName;

	this.refreshData = function () {

		this.server = config.runningServers[this.folderName];
		this.serverStarted = config.runningServers[this.folderName] ? true : false;

		if (this.server)
		{
			this.frontOfficeURL = 'http://localhost:' + this.server.port + '/';
			var candidates = ['admin', 'admin-dev'];
			for (var i = 0; i < candidates.length; i++)
			{
				if (fs.existsSync(this.path + '/' + candidates[i]))
				{
					this.backOfficeURL = this.frontOfficeURL + candidates[i] + '/';
					break;
				}
			}

			candidates = ['install', 'install-dev'];
			for (var i = 0; i < candidates.length; i++)
			{
				if (fs.existsSync(this.path + '/' + candidates[i]))
				{
					this.installerURL = this.frontOfficeURL + candidates[i] + '/';
					break;
				}
			}
		}

		if (this.screenShotsFolder && fs.existsSync(this.screenShotsFolder))
		{
			this.screenshots = fs.readdirSync(this.screenShotsFolder).map(function (name) {
				return 'screenshots/' + my.folderName + '/' + name; 
			});
		}
	};

	this.getAPortNumber = function () {
		var port;

		// Use preferred port if available
		if (this.preferredPort && !config.portsInUse[this.preferredPort])
		{
			port = this.preferredPort;
		}
		//
		else
		{
			port = config.lastPortInUse || config.startPort;
			while (config.portsInUse[port])
			{
				port = port + 1;
			}
		} 
		config.lastPortInUse = port;
		config.portsInUse[port] = this.folderName;

		return port;
	};

	this.mongoUpdate = function (additionalProperties, callback)
	{
		var shops = config.mongo.collection('shops');
		shops.update({_id: this._id}, {$set: additionalProperties}, function (err) {
			callback(err);
		});
	};

	this.startServer = function (callback)
	{
		var port = this.getAPortNumber();

		this.mongoUpdate({preferredPort: port}, function () {
			var args = ['-S', 'localhost:' + port, '-t', my.path];

			var child = spawn('php', args, {stdio: 'inherit'});

			console.log(my.path);

			config.runningServers[my.folderName] = {
				process: child,
				port: port
			};

			my.preferredPort = port;

			callback(null, child);
		});
	};

	this.stopServer = function (callback)
	{
		var child = config.runningServers[this.folderName];

		if (child)
		{
			child.process.kill();
		}

		delete config.runningServers[this.folderName];
		delete config.portsInUse[this.preferredPort];

		this.server = null;

		callback(null);
	}

	this.refreshData();	
};