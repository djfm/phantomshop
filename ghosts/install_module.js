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
	console.log('Please provide the URL! (--url some_url)');
	phantom.exit(components.errors.INVALID_URL);
}

if (!argv.module)
{
	console.log('Please provide the module name! (--module bob)');
	phantom.exit(42);
}

//http://localhost:8003/admin-dev/index.php?controller=AdminModules&token=64f75d5f2a55d470b96a237b1fe31f50&install=autoupgrade&tab_module=administration&module_name=autoupgrade&anchor=Autoupgrade

page.viewportSize = {
	width: 1260,
	height: 1024
};

var willInstallModule = function (moduleName) {
	return function () {
		var d = new Deferred();

		var previousURL = page.url;

		var clicked = page.evaluate(function (moduleName) {
			var found = false;
			var exp = new RegExp('\\binstall=' + moduleName + '\\b');
			$('a').each(function (i, a) {
				a = $(a);
				if (exp.exec(a.attr('href')))
				{
					found = a.attr('href');
					return false;
				}
				else if (exp.exec(a.attr('data-link')))
				{
					found = a.attr('data-link');
					return false;
				}
			});
			if (found)
			{
				window.location = found;
				return true;
			}
			else
			{
				return false;
			}
		}, moduleName);

		if (!clicked)
		{
			d.reject('Could not find link');
		}
		else
		{
			console.log('Got the link to click to install: ' + moduleName);
			console.log('Now wait and see...');
			var elapsed = 0;
			var dt = 500;
			var interval = setInterval(function () {
				elapsed += dt;
				if (page.url !== previousURL)
				{
					var ok = false;
					if (page.url.indexOf('controller=AdminModules') > 0)
					{
						ok = (page.url.indexOf('conf=12') > 0);
					}
					else
					{
						ok = true;
					}

					if (ok)
					{
						clearInterval(interval);
						d.resolve();
					}
					else
					{
						clearInterval(interval);
						d.reject();
					}
				}
				else if (elapsed > 60000)
				{
					clearInterval(interval);
					d.reject('Module installation timed out: ' + moduleName);
				}
			}, dt);
		}

		return d.promise;
	};
};

page.open(argv.url, function () {
	seq([
		I.willLogInBO(page, {
			email: argv.email || 'pub@prestashop.com',
			password: argv.password || '123456789'
		}),
		I.willClickMenuItem(page, 'AdminModules'),
		U.willWaitFor(page, 'a.action_module'),
		I.willTakeScreenshot(page, argv.screenshots, 'on_modules_page'),
		willInstallModule(argv.module),
		I.willTakeScreenshot(page, argv.screenshots, 'location_set'),
	]).then(function () {
		console.log('Good!');
		phantom.exit(components.errors.SUCCESS);
	}, function (error) {
		console.log('Bad!', error);
		phantom.exit(components.errors.UNSPECIFIED_ERROR);
	});
});

