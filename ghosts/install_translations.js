'use strict';

var system		= require('system');
var	argv		= require('minimist')(system.args);
var page		= require('webpage').create();
var seq			= require("promised-io/promise").seq;

var components = require('./tools/components.js');

if (!argv.url)
{
	phantom.exit(components.errors.INVALID_URL);
}

page.open(argv.url, function () {
	seq([
		components.actions.willLogInBO(page, {
			email: 'pub@prestashop.com',
			password: '123456789'
		})
	]).then(function () {
		phantom.exit(components.errors.SUCCESS);
	}, function () {
		phantom.exit(components.errors.UNSPECIFIED_ERROR);
	});
});

