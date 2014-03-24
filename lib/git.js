'use strict';

var exec     = require('child_process').exec;
var Deferred = require('promised-io/promise').Deferred;

function shellify(str)
{
	return str.replace(/\s+/, '\\ ');
}

module.exports = {
	clone: function (target, repository, branch, options)
	{
		if (options === undefined)
		{
			options = {};
		}

		var d = new Deferred();

		var cmd = 'git clone ' + shellify(repository) + ' ';
		if (branch)
		{
			cmd = cmd + ' -b ' + branch + ' ';
		}
		cmd = cmd + shellify(target);

		cmd = cmd + ' --recursive';

		console.log(cmd);

		exec(cmd, function (error) {
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
	pull: function (target, remote, branch)
	{
		var d = new Deferred();
		var cmd = 'git config core.filemode false && git pull ' + remote + ' ' + branch;

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