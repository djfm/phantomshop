'use strict';

var exec = require('child_process').exec;

module.exports = {
	clone: function (target, repository, branch, then)
	{
		var cmd = 'git clone ' + repository + ' ';
		if (branch)
		{
			cmd = cmd + ' -b ' + branch + ' ';
		}
		cmd = cmd + target;

		exec(cmd, function (error) {
			console.log('Got: ' + error);
			then();
		});
	}
};