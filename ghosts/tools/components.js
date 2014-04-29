'use strict';

var actions  = require('./actions.js');
var Deferred = require('promised-io/promise').Deferred;

// Just so that JSHINT stops complaining when using $ in the host page because it's not defined outisde :)
var $ = function () {

};

module.exports = {};
module.exports.tools = {};

module.exports.settings = {
	defaultDelay: 500
};

module.exports.errors = {
	SUCCESS: 0,
	INVALID_URL: 1,
	UNSPECIFIED_ERROR: 24
};

module.exports.glue = {};


var metaWaitFor = function metaWaitFor(page, predicate, delay, pollingInterval, timeout)
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

			// Callback on poll
			if (predicate[2])
			{
				predicate[2]();
			}

			var ok = page.evaluate(predicate[0], predicate[1]);

			//console.log('delay:', delay);

			if (ok)
			{
				clearInterval(interval);
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

var waitFor;
module.exports.glue.waitFor = waitFor = function (page, selector, kind, delay, pollingInterval, timeout)
{
	return metaWaitFor(page, [function (args) {
		if (args.kind === 'visible')
		{
			return $(args.selector).is(':visible');
		}
		else
		{
			return $(args.selector).length > 0;
		}
	}, {selector: selector, kind: kind}], delay, pollingInterval, timeout);
};

var willWaitFor;
module.exports.glue.willWaitFor = willWaitFor = function (page, selector, kind, delay, interval, timeout)
{
	return function () {
		return module.exports.glue.waitFor(page, selector, kind, delay, interval, timeout);
	};
};

var waitForURLParameter;
module.exports.glue.waitForURLParameter = waitForURLParameter = function (page, parameter, value, delay, pollingInterval, timeout)
{
	return metaWaitFor(page, [function (args) {
		var parts = window.location.href.split('?');
		if (parts.length === 2)
		{
			var pairs = (parts[1].split('#')[0]).split('&');
			var params = {};
			for (var i = 0; i < pairs.length; i++)
			{
				var splat = pairs[i].split('=');
				params[splat[0]] = splat[1];
			}
			if (args.value)
			{
				return params[args.parameter] == args.value;
			}
			else
			{
				return args.parameter in params;
			}
		}
		return false;
	}, {parameter: parameter, value: value}], delay, pollingInterval, timeout);
};

var willWaitForUrlParameter;
module.exports.glue.willWaitForUrlParameter = function (page, parameter, value)
{
	return function () {
		return waitForURLParameter(page, parameter, value);
	};
};

var delay;
module.exports.glue.delay = delay = function (ms)
{
	ms = ms || module.exports.settings.defaultDelay;
	console.log('Waiting for ' + ms + 'ms...');
	var d = new Deferred();
	setTimeout(d.resolve, ms);
	return d.promise;
};

var willDelay;
module.exports.glue.willDelay = willDelay = function (ms)
{
	return function ()
	{
		return delay(ms);
	};
};

module.exports.actions = {};

var takeScreenshot;
module.exports.actions.takeScreenshot = takeScreenshot = function (page, dir, name)
{
	var d = new Deferred();
	if (dir)
	{
		var path = dir + '/' + name + '.png';
		page.render(path);
	}

	d.resolve();
	return d.promise;
};

var willTakeScreenshot;
module.exports.actions.willTakeScreenshot = willTakeScreenshot = function (page, dir, name)
{
	return function () {
		takeScreenshot(page, dir, name);
	};
};

var clickMenuItem;
module.exports.actions.clickMenuItem = clickMenuItem = function (page, controllerName)
{
	var deferred = new Deferred();

	var ok = page.evaluate(function (controllerName) {
		var links = $('nav ul.menu a');
		for (var i = 0; i < links.length; i++)
		{
			var m, a = $(links[i]);
			if ((m = /\bcontroller=(\w+)\b/.exec(a.attr('href'))) && m[1] === controllerName)
			{
				window.location = a.attr('href');
				return true;
			}
		}
		return false;
	}, controllerName);

	if (ok)
	{
		deferred.resolve();
	}
	else
	{
		deferred.reject();
	}

	return deferred.promise;
};

var willClickMenuItem;
module.exports.actions.willClickMenuItem = willClickMenuItem = function (page, controllerName)
{
	return function ()
	{
		return clickMenuItem(page, controllerName);
	};
};

var logInBO;
module.exports.actions.logInBO = logInBO = function (page, params)
{
	console.log('Logging in to the Back-Office...');
	var d = new Deferred();

	waitFor(page, '#email').then(function () {

		var ok = true;
		ok = ok && actions.setValue(page, '#email', params.email);
		ok = ok && actions.setValue(page, '#passwd', params.password);
		ok = ok && actions.checkCheckBox(page, '#stay_logged_in', true);

		if (ok)
		{
			actions.trigger(page, '#login_form button[name=submitLogin]', 'click');
			waitFor(page, '#footer').then(function () {
				console.log('Logged in!');
				d.resolve();
			}, function () {
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

var listLanguages;
module.exports.tools.listLanguages = listLanguages = function (page)
{
	return page.evaluate(function () {
		return $.makeArray($('#params_import_language option').map(function (i, o) {
			return $(o).attr('value').split('|')[0];
		}));
	});
};

// Prerequisite: be on the translations page!
var installLanguage;
module.exports.actions.installLanguage = installLanguage = function (page, code)
{
	console.log('Trying to install language: ' + code);
	var d = new Deferred();

	var ok = page.evaluate(function (code) {
		var options = $('#params_import_language option');
		for (var i = 0; i < options.length; i++)
		{
			var option = $(options[i]);
			var optionCode = option.attr('value').split('|')[0];
			if (optionCode === code)
			{
				var select = $('#params_import_language');
				if (select.val(option.attr('value')).val() === option.attr('value'))
				{
					select.change();
					select.trigger('chosen:updated');
					$('button[name=submitAddLanguage]').click();
					return true;
				}
			}
		}
		return false;
	}, code);

	if (ok)
	{
		console.log('Found language on page: ' + code);
		waitForURLParameter('conf').then(function () {
			console.log('Successfully installed language: ' + code);
			d.resolve();
		}, function () {
			var err = 'Could not install language: ' + code;
			console.log(err);
			d.reject(err);
		});
	}
	else
	{
		var err = 'Could not find language: ' + code;
		console.log(err);
		d.reject(err);
	}

	return d.promise;
};

var willInstallLanguage;
module.exports.actions.willInstallLanguage = willInstallLanguage = function (page, code)
{
	return function ()
	{
		return installLanguage(page, code);
	};
};