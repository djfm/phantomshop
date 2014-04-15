'use strict';

var exec     = require('child_process').exec;
var spawn    = require('child_process').spawn;
var Deferred = require('promised-io/promise').Deferred;
var seq      = require('promised-io/promise').seq;
var fs       = require('fs');
var path     = require('path');

function shellify(str)
{
	return str.replace(/\s+/, '\\ ');
}

module.exports = {
	clone: function (target, repository, branch, submodules_branch, options)
	{
		var clone = function () {
			var d = new Deferred();

			spawn('git', ['clone', repository, '-b', branch, '--recursive', target])
			.on('close', function (code) {
				if (code !== 0)
				{
					d.reject('Could not clone to: ' + target);
				}
				else
				{
					d.resolve();
				}
			})
			.stdout.on('data', function (data) {
				console.log('Clone: ', data.toString());
			});

			return d.promise;
		};

		var checkoutSubmodules = function () {
			var d = new Deferred();

			fs.writeFileSync(path.join(target, '.submodules_branch'), submodules_branch);

			spawn('git', ['submodule', 'foreach', 'git', 'checkout', submodules_branch], {cwd: target})
			.on('close', function (code) {
				if (code !== 0)
				{
					d.reject('Could not checkout submodules in: ' + target);
				}
				else
				{
					d.resolve();
				}
			})
			.stdout.on('data', function (data) {
				console.log('Submodules Checkout: ', data.toString());
			});

			return d.promise;
		};

		return seq([clone, checkoutSubmodules]);
	},
	pull: function (target, remote, branch)
	{
		var d = new Deferred();
		var cmd = 'git config core.filemode false && git pull ' + remote + ' ' + branch + ' && git submodule foreach git pull';

		console.log(cmd);

		exec(cmd, {cwd: target}, function (error) {
			if (error)
			{
				d.reject(error);
			}
			else
			{
				d.resolve();
			}
		});
		return d.promise;
	},
	fetch: function (target)
	{
		var d = new Deferred();
		var cmd = 'git fetch';

		exec(cmd, {cwd: target}, function (error) {
			if (error)
			{
				d.reject(error);
			}
			else
			{
				d.resolve();
			}
		});
		return d.promise;
	},
	isRepository: function (target)
	{
		var d = new Deferred();

		exec('git status', {cwd: target}, function (error) {
			if (error)
			{
				d.resolve(false);
			}
			else
			{
				d.resolve(true);
			}
		});

		return d.promise;
	},
	getInfo: function (target)
	{
		var d = new Deferred;

		exec('git remote -vv', {cwd: target}, function (error, stdout) {
			if (error)
			{
				d.reject('Could not run git remote.');
			}
			else
			{
				var remotes = {};
				var lines = stdout.split("\n");
				for (var i = 0; i < lines.length; i++)
				{
					var m = lines[i].match(/(\S+)\s+(\S+)\s+\(fetch\)\s*$/);
					if (m)
					{
						remotes[m[1]] = m[2];
					}
				}

				exec('git branch -vv', {cwd: target}, function (error, stdout) {
					if (error)
					{
						d.reject('Could not run git branch.');
					}
					else
					{
						var m = /^\*\s+(\S+)\s+\w+\s+(?:\[([^\/]+)\/(.+?)(?::\s*(.*?))?\])?/m.exec(stdout);
						if (m)
						{
							var branch = m[1];
							var remote = m[2];
							var remoteName = remote;
							var remoteBranch = m[3];
							var distance = m[4];

							if (remote && remotes[remote])
							{
								remote = remotes[remote];
							}

							d.resolve({
								branch: branch,
								remoteName: remoteName,
								remote: remote,
								remoteBranch: remoteBranch,
								distance: distance
							});
						}
						else
						{
							d.reject('Could not find branch.');
						}
					}
				});

			}
		});

		return d.promise;
	}
};