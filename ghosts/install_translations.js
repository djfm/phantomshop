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

// For this to work, we need to be already on the translations page
var willInstallAllLanguages = function ()
{
	var languages = components.tools.listLanguages(page);

	console.log('Will install the following languages: ' + languages.join(', '));

	var sequence = [];

	for (var i = 0; i < languages.length; i++)
	{
		sequence.push(I.willClickMenuItem(page, 'AdminTranslations'));
		sequence.push(U.willWaitFor(page, '#params_import_language'));
		sequence.push(I.willInstallLanguage(page, languages[i]));
		sequence.push(U.willDelay(2000));
		sequence.push(I.willTakeScreenshot(page, argv.screenshots, '3_installed_' + languages[i]));
	}

	return seq(sequence);
};

page.open(argv.url, function () {
	seq([
		I.willLogInBO(page, {
			email: argv.email || 'pub@prestashop.com',
			password: argv.password || '123456789'
		}),
		I.willTakeScreenshot(page, argv.screenshots, '1_after_login'),
		I.willClickMenuItem(page, 'AdminTranslations'),
		U.willWaitFor(page, '#params_import_language'),
		willInstallAllLanguages
	]).then(function () {
		console.log('Good!');
		phantom.exit(components.errors.SUCCESS);
	}, function () {
		console.log('Bad!', JSON.stringify(arguments));
		phantom.exit(components.errors.UNSPECIFIED_ERROR);
	});
});

