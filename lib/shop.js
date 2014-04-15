'use strict';

var spawn 		= require('child_process').spawn;
var fs 			= require('fs.extra');
var Deferred 	= require('promised-io/promise').Deferred;
var seq      	= require('promised-io/promise').seq;
var path        = require('path');
var mongodb     = require('mongodb');
var mysql       = require('mysql');

var Shop;
module.exports = Shop = function(config, data)
{
	var my = this;

	for (var i in data)
	{
		this[i] = data[i];
	}
	this.url = config.rootURL + '/' + this.folderName;

	this.path = this.path.replace(/\/\/+/g, '/');

	this.refreshData = function () {

		this.server = config.runningServers[this.folderName];
		this.serverStarted = config.runningServers[this.folderName] ? true : false;

		if (this.server)
		{
			this.frontOfficeURL = 'http://' + config.listenOn + ':' + this.server.port + '/';
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
		var d = new Deferred();
		var portfinder  = require('portfinder');
		portfinder.basePort = this.preferredPort || config.startPort;

		portfinder.getPort(function (err, port) {
			if (err)
			{
				d.reject(err);
			}
			else
			{
				my.preferredPort = port;

				my.mongoUpdate({preferredPort: my.preferredPort}).then(function () {
					d.resolve(port);
				}, d.reject);

			}
		});

		return d.promise;
	};

	this.mongoUpdate = function (additionalProperties, callback)
	{
		var d = new Deferred();
		var shops = config.mongo.collection('shops');
		shops.update({_id: this._id}, {$set: additionalProperties}, function (err) {
			if (err)
			{
				d.reject(err);
			}
			else
			{
				for (var p in additionalProperties)
				{
					my[p] = additionalProperties[p];
				}
				d.resolve();
			}
		});
		return d.promise;
	};

	this.erase = function ()
	{
		var self = this;
		var shops = config.mongo.collection('shops');

		var removeFromMongo = function () {
			var d = new Deferred();
			shops.remove({folderName: self.folderName}, function (err) {
				if (err)
				{
					d.reject('Could not delete shop from mongo.');
				}
				else
				{
					d.resolve();
				}
			});
			return d.promise;
		};

		var cleanTheDatabase = function (){
			var d = new Deferred();

			var connection = mysql.createConnection({
				host: 'localhost',
				user: config.mysqlUser,
				password: config.mysqPassword,
				database: config.mysqlDatabase
			});

			connection.connect();

			var promiseDrop = function (tableName)
			{
				return function ()
				{
					var d = new Deferred();

					connection.query('DROP TABLE ' + tableName, function (error) {
						if (error)
						{
							d.reject('Could not drop table: ' + tableName);
						}
						else
						{
							d.resolve();
						}
					});

					return d.promise;
				};
			};

			var sql = 'SHOW TABLES LIKE \'' + self.folderName + '%\';';
			connection.query(sql, function (error, rows, fields) {
				if (error)
				{
					d.reject(error);
				}
				else
				{
					var dropTables = [];
					for (var i = 0; i < rows.length; i++)
					{
						var tableName = rows[i][fields[0].name];
						dropTables.push(promiseDrop(tableName));
					}
					seq(dropTables).then(d.resolve, function () {
						d.reject('Could not delete a table.');
					});
				}
			});

			return d.promise;
		};

		var deleteTheFiles = function ()
		{
			var d = new Deferred();

			fs.rmrf(self.path, function (err) {
				if (err) {
					d.reject("Could not delete the files: " + self.path);
				}
				else
				{
					d.resolve();
				}
			});

			return d.promise;
		}

		return seq([removeFromMongo, cleanTheDatabase, deleteTheFiles]);
	};

	this.startServer = function ()
	{
		var d = new Deferred();

		this.getAPortNumber().then(function (port) {

			var args = ['-S', config.listenOn + ':' + port, '-t', my.path];

			var child = spawn('php', args, {stdio: 'inherit'});

			config.runningServers[my.folderName] = {
				process: child,
				port: port
			};

			d.resolve(my);
		}, d.reject);

		return d.promise;
	};

	this.stopServer = function ()
	{
		var d = new Deferred();

		var child = config.runningServers[this.folderName];

		if (child)
		{
			child.process.kill();
		}

		delete config.runningServers[this.folderName];
		delete config.portsInUse[this.preferredPort];

		this.server = null;

		d.resolve(my);
		return d.promise;
	}

	this.postInstall = function ()
	{
		var d = new Deferred();

		var toRename = ['admin', 'install'];

		for (var i = 0; i < toRename.length; i++)
		{
			var src = path.join(this.path, toRename[i]);
			var dst = path.join(this.path, toRename[i] + '-dev');

			if (fs.existsSync(src))
			{
				fs.renameSync(src, dst);
			}
		}

		this.refreshData();

		d.resolve();

		return d.promise;
	};

	this.refreshData();	
};

module.exports.count = function (collection)
{
	var d = new Deferred();

	collection.count(function (err, n) {
		if (err)
		{
			d.reject(err);
		}
		else
		{
			d.resolve(n);
		}
	});

	return d.promise;
};