'use strict';

var exec     = require('child_process').exec;
var Deferred = require('promised-io/promise').Deferred;

module.exports = {
	clone: function (target, repository, branch)
	{
		var d = new Deferred();

		var cmd = 'git clone ' + repository + ' ';
		if (branch)
		{
			cmd = cmd + ' -b ' + branch + ' ';
		}
		cmd = cmd + target;

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
				console.log(remotes);
				d.resolve(true);
			}
		});

		return d.promise;
	}
};