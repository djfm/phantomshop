'use strict';
var system = require('system');
var Deferred = require("promised-io/promise").Deferred;
var when = require("promised-io/promise");
var seq = require("promised-io/promise").seq;

var argv = require('minimist')(system.args);

var page = require('webpage').create();

var defaultDelay = 500;

var settings = {
	// Non technical info
	language: argv.language || 'fr',
	shopName: argv.shopName || 'My Shop',
	activityId: argv.activityId || 16, // Telecoms
	dbMode: argv.dbMode || 'full', // also possible: 'lite' => No demo products,
	countryCode: argv.countryCode || 'fr',
	timeZone: argv.timeZone || 'Europe/Paris',
	firstname: argv.firstname || 'John',
	lastname: argv.lastname || 'Doe',
	email: argv.email || 'pub@prestashop.com',
	password: argv.password || '123456789',
	newsletter: argv.newsletter || true,

	// Technical info

	mysqlHost: argv.mysqlHost || 'localhost',
	mysqlDatabase: argv.mysqlDatabase || 'phantomshop',
	mysqlUser: argv.mysqlUser || 'phantomshop',
	mysqlPassword: argv.mysqlPassword || '',
	tablesPrefix: null // defined later
};

settings.tablesPrefix = argv.tablesPrefix || settings.shopName.replace(/[^\w]+/g, '').toLowerCase();


var screenshotNumber = {};
var takeScreenshot = function takeScreenshot (category, name)
{
	var n = screenshotNumber[category] = (screenshotNumber[category] || 0) + 1;

	if (argv.screenshots)
	{
		page.render(argv.screenshots + '/' + category + '_' + n + '_' + name + '.png');
	}
};

var willTakeScreenshot = function (category, name)
{
	return function () {
		var deferred = new Deferred();

		takeScreenshot(category, name);

		deferred.resolve();

		return deferred.promise;
	};
};

var waitFor = function (selector, delay, interval, timeout)
{
	delay = delay || defaultDelay;
	interval = delay || defaultDelay;
	timeout = timeout || 300000; // 5 minutes timeout by default

	var deferred = new Deferred();

	// wait a bit before polling
	setTimeout(function () {
		var elapsed = 0;
		var interval = setInterval(function () {
			elapsed += interval;

			var ok = page.evaluate(function (selector) {
				return $(selector).is(':visible');
			}, selector);

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

		}, interval);

	}, delay);

	return deferred.promise;
};

var willWaitFor = function willWaitFor(selector, delay, interval, timeout)
{
	return function () {
		return waitFor(selector, delay, interval, timeout);
	};
};

/* Shortcuts to do stuff inside the host page */

var trigger = function trigger (selector, event)
{
	return page.evaluate(function (selector, event) {
		return $(selector).trigger(event).length;
	}, selector, event);
};

var setValue = function setValue (selector, value)
{
	return page.evaluate(function (selector, value) {
		return $(selector).val(value).val() == value;
	}, selector, value);
};

var setValueChosen = function setValue (selector, value)
{
	return page.evaluate(function (selector, value) {
		var select = $(selector);
		var ok = select.val(value).val() == value;
		if (ok)
		{
			select.change();
			select.trigger('chosen:updated');
		}
		return ok;
	}, selector, value);
};

var checkCheckBox = function checkCheckBox (selector, checked)
{
	return page.evaluate(function (selector, checked) {
		return $(selector).prop('checked', checked).is(':checked') == checked;
	}, selector, checked);
};

/* Main Program */

var clickNext = function clickNext ()
{
	var deferred = new Deferred();

	trigger('#btNext', 'click');

	deferred.resolve();

	return deferred.promise;
};

/* First Step */

var chooseLanguage = function chooseLanguage (code)
{
	var error = page.evaluate(function (code) {
		var languages = $.makeArray($('#langList option').map(function (i, option) {
			return $(option).val();
		}));

		if (languages.indexOf(code) >= 0)
		{
			$('#langList').val(code).change();
			return null;
		}
		else
		{
			return 'Could not find language: ' + code;
		}
	}, code);

	var deferred = new Deferred();

	if (error)
	{
		deferred.reject(error);
	}
	else
	{
		return waitFor('#btNext');
	}

	return deferred.promise;
};

/* Second Step */

var acceptLicense = function acceptLicense ()
{
	var ok = page.evaluate(function () {
		return $('#set_license').click().val() == 1;
	});

	var deferred = new Deferred();

	if (ok)
	{
		deferred.resolve();
	}
	else
	{
		deferred.reject('Could not accept license.');
	}

	return deferred.promise;
}

/* Third Step */

var setNonTechnicalParameters = function setNonTechnicalParameters ()
{
	var ok = true;

	ok = ok && setValue('#infosShop', settings.shopName);
	ok = ok && setValueChosen('#infosActivity', settings.activityId);
	ok = ok && setValue('input[name=db_mode]', settings.dbMode);
	ok = ok && setValueChosen('#infosCountry', settings.countryCode);
	ok = ok && setValueChosen('#infosTimezone', settings.timeZone);
	ok = ok && setValue('#infosFirstname', settings.firstname);				
	ok = ok && setValue('#infosName', settings.lastname);				
	ok = ok && setValue('#infosEmail', settings.email);				
	ok = ok && setValue('#infosPassword', settings.password);				
	ok = ok && setValue('#infosPasswordRepeat', settings.password);
	ok = ok && checkCheckBox('#infosNotification', settings.newsletter);

	var deferred = new Deferred();

	if (ok)
	{
		setTimeout(function () {
			deferred.resolve();
		}, defaultDelay);
	}
	else
	{
		deferred.reject();
	}

	return deferred.promise;
}

/* Fourth Step */

var setTechnicalParameters = function setTechnicalParameters()
{
	var ok = true;
	ok = ok && setValue('#dbServer', settings.mysqlHost);
	ok = ok && setValue('#dbName', settings.mysqlDatabase);
	ok = ok && setValue('#dbLogin', settings.mysqlUser);
	ok = ok && setValue('#dbPassword', settings.mysqlPassword);
	ok = ok && setValue('#db_prefix', settings.tablesPrefix);

	var deferred = new Deferred();

	if (ok)
	{
		setTimeout(function () {
			deferred.resolve();
		}, defaultDelay);
	}
	else
	{
		deferred.reject();
	}

	return deferred.promise;
};

var checkDB = function checkDB()
{
	var deferred = new Deferred();
	waitFor('#btTestDB').then(function () {
		trigger('#btTestDB', 'click');
		waitFor('#dbResultCheck').then(function () {
			waitFor('#btNext').then(function () {
				deferred.resolve();
			});
		});
	});

	return deferred.promise;
};

var wait = function wait(delay)
{
	return function () {
		var deferred = new Deferred();

		setTimeout(function () {
			deferred.resolve();
		}, delay);

		return deferred.promise;
	};
};

page.open(argv.url, function () {
	seq([
		chooseLanguage,
		willTakeScreenshot('installer', 'language'),
		clickNext,
		willWaitFor('#set_license'),
		acceptLicense,
		willTakeScreenshot('installer', 'license'),
		clickNext,
		willWaitFor('#btNext'),
		setNonTechnicalParameters,
		wait(defaultDelay), // Wait before taking screenshot so that jQuery UI has updated
		willTakeScreenshot('installer', 'infos'),
		clickNext,
		willWaitFor('#dbServer'),
		setTechnicalParameters,
		willTakeScreenshot('installer', 'technical_settings'),
		checkDB,
		willTakeScreenshot('installer', 'check_db'),
		clickNext,
		willWaitFor('a.BO'),
		wait(defaultDelay),
		willTakeScreenshot('installer', 'finished')
	], settings.language)
	.then(function () {
		console.log('OK! :)');
		phantom.exit();
	}, function (error) {
		console.log('Some step failed :/');
		phantom.exit(1);
	});
});

