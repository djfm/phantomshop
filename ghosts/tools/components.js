'use strict';

var actions  = require('./actions.js');
var Deferred = require('promised-io/promise').Deferred;

// Just so that JSHINT stops complaining when using $ in the host page because it's not defined outisde :)
var $ = function () {

};

module.exports = {};

module.exports.settings = {
	defaultDelay: 500
};

module.exports.errors = {
	SUCCESS: 0,
	INVALID_URL: 1,
	UNSPECIFIED_ERROR: 24
};

module.exports.glue = {};

var waitFor;
module.exports.glue.waitFor = waitFor = function (page, selector, kind, delay, pollingInterval, timeout)
{
	delay = delay || module.exports.settings.defaultDelay;
	pollingInterval = pollingInterval || module.exports.settings.defaultDelay;
	timeout = timeout || 300000; // 5 minutes timeout by default

	var deferred = new Deferred();

	// wait a bit before polling
	setTimeout(function () {
		var elapsed = 0;
		var interval = setInterval(function () {
			elapsed += interval;

			console.log('Polling for ' + selector + ' (every ' + pollingInterval + 'ms) ...');

			var ok = page.evaluate(function (selector, kind) {
				if (kind === 'visible')
				{
					return $(selector).is(':visible');
				}
				else
				{
					return $(selector).length > 0;
				}
			}, selector, kind);

			if (ok)
			{
				clearInterval(interval);
				console.log('Got ' + selector + '!');
				deferred.resolve();
			}
			else if (elapsed > timeout)
			{
				clearInterval(interval);
				deferred.reject('Timed out after ' + timeout + 'ms.');
			}

		}, pollingInterval);

	}, delay);

	return deferred.promise;
};

var willWaitFor;
module.exports.glue.willWaitFor = willWaitFor = function willWaitFor(page, selector, kind, delay, interval, timeout)
{
	return function () {
		return module.exports.glue.waitFor(page, selector, kind, delay, interval, timeout);
	};
};

var delay;
module.exports.glue.delay = delay = function (ms)
{
	var d = new Deferred();
	setTimeout(function () {
		d.resolve();
	}, ms || module.exports.settings.defaultDelay);
	return d.promise;
};

var willDelay;
module.exports.glue.willDelay = function (ms)
{
	return function (ms)
	{
		delay(ms);
	};
};

module.exports.actions = {};

var takeScreenShot;
module.exports.actions.takeScreenshot = takeScreenshot = function (page, name)
{

};

var clickMenuItem;
module.exports.actions.clickMenuItem = clickMenuItem = function (page, controllerName)
{
	return page.evaluate(function (controllerName) {
		var links = $('nav ul.menu a');
		for(var i = 0; i < links.length; i++)
		{
			var m, a = $(links[i]);
			if((m = /\bcontroller=(\w+)\b/.exec(a.attr('href'))) && m[1] == controllerName)
			{
				a.click();
				return true;
			}
		}
		return false;
	}, controllerName);
};

var logInBO;
module.exports.actions.logInBO = logInBO = function (page, params)
{
	var d = new Deferred();

	waitFor(page, '#email').then(function () {

		var ok = true;
		ok = ok && actions.setValue(page, '#email', params.email);
		ok = ok && actions.setValue(page, '#passwd', params.password);
		ok = ok && actions.checkCheckBox(page, '#stay_logged_in', true);

		if (ok)
		{
			console.log('Login parameters were input.');
			actions.trigger(page, '#login_form button[name=submitLogin]', 'click');
			waitFor(page, '#footer').then(function () {
				console.log('Ok, found footer!');
				d.resolve();
			}, function () {
				console.log('Did not see footer, giving up.');
				d.reject();
			});
		}
		else
		{
			console.log('Failed to input login parameters correctly.');
			d.reject();
		}
	}, function () {
		d.reject();
	});

	return d.promise;
};

var willLogInBO;
module.exports.actions.willLogInBO = willLogInBO = function (page, params)
{
	return function () {
		return logInBO(page, params);
	};
};