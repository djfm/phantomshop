'use strict';

var spawn    = require('child_process').spawn;
var Deferred = require('promised-io/promise').Deferred;

module.exports = {
	run: function (path, params) {
		var d = new Deferred();

		var args = [path];

		for (var i in params)
		{
			args.push('--' + i);
			args.push(params[i]);
		}

		var cmd = 'running: phantomjs ' + args.join(' ');
		console.log(cmd);

		var child = spawn('phantomjs', args, {stdio: 'inherit'});
		child.on('exit', function (code) {
			if (code === 0)
			{
				d.resolve();
			}
			else
			{
				d.reject('Oops, ghost busted! Command was: ' + cmd);
			}
		});

		return d.promise;
	}
};