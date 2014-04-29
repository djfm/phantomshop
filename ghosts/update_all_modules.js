'use strict';

var system		= require('system');
var	argv		= require('minimist')(system.args);
var page		= require('webpage').create();
var seq			= require('promised-io/promise').seq;
var Deferred	= require('promised-io/promise').Deferred;

var components = require('./tools/components.js');
var I = components.actions;
var U = components.glue;

if (!argv.url)
{
	phantom.exit(components.errors.INVALID_URL);
}

page.viewportSize = {
	width: 1260,
	height: 1024
};

page.open(argv.url, function () {
	seq([
		I.willLogInBO(page, {
			email: argv.email || 'pub@prestashop.com',
			password: argv.password || '123456789'
		}),
		I.willClickMenuItem(page, 'AdminModules'),
		U.willWaitFor(page, '#desc-module-update-all, #desc-module-check-and-update-all', 'visible'),
		function () {

			var href = page.evaluate(function () {
				var href = $('#desc-module-update-all, #desc-module-check-and-update-all').attr('href');
				window.location.href = href;
				return href;
			});

			var d = new Deferred();

			var dt = 2000;
			var elapsed = 0;
			var timeout = 60000;
			var interval = setInterval(function () {
				var href = page.evaluate(function () {
					return $('#desc-module-update-all, #desc-module-check-and-update-all').attr('href');
				});
				if (href && href.indexOf("&update=") === -1)
				{
					d.resolve();
				}
				else if (elapsed > timeout)
				{
					d.reject('Update seems unsuccessful after '+timeout+'ms');
				}
			}, dt);

			return d.promise;
		}
	]).then(function () {
		console.log('Good!');
		phantom.exit(components.errors.SUCCESS);
	}, function () {
		console.log('Bad!', JSON.stringify(arguments));
		phantom.exit(components.errors.UNSPECIFIED_ERROR);
	});
});

