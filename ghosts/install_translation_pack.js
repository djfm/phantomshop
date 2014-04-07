'use strict';

var system		= require('system');
var	argv		= require('minimist')(system.args);
var page		= require('webpage').create();
var seq			= require('promised-io/promise').seq;
var Deferred	= require('promised-io/promise').Deferred;
var fs          = require('fs');

var components = require('./tools/components.js');
var I = components.actions;
var U = components.glue;

if (!argv.url)
{
	phantom.exit(components.errors.INVALID_URL);
}

if (!argv.pack || !fs.exists(argv.pack))
{
	console.log('Please provide a valid pack with the --pack some_path argument.');
	phantom.exit(42);
}

page.viewportSize = {
	width: 1260,
	height: 1024
};

page.onUrlChanged = function(targetUrl) {
    console.log('New URL: ' + targetUrl);
};

var uploadPack = function () {
	var d = new Deferred();

	page.uploadFile('#importLanguage', argv.pack);

	page.evaluate(function () {
		$('#importLanguage').closest('div.panel').find('button').click();
	});

	
	var n = 0;
	setInterval(function () {
		n = n + 1;
		//I.takeScreenshot(page, argv.screenshots, 'test_'+n);
		console.log('Files: ' + page.evaluate(function () {
			return $('#importLanguage').get(0).files.length;
		}));
	}, 1000);

	U.waitForURLParameter(page, 'conf', '15').then(d.resolve, d.reject)

	return d.promise;
}

page.open(argv.url, function () {
	seq([
		I.willLogInBO(page, {
			email: argv.email || 'pub@prestashop.com',
			password: argv.password || '123456789'
		}),
		I.willClickMenuItem(page, 'AdminTranslations'),
		U.willWaitFor(page, '#importLanguage'),
		uploadPack
	]).then(function () {
		console.log('Good!');
		phantom.exit(components.errors.SUCCESS);
	}, function () {
		console.log('Bad!', JSON.stringify(arguments));
		phantom.exit(components.errors.UNSPECIFIED_ERROR);
	});
});

