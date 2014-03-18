'use strict';
var system		= require('system');
var Deferred    = require('promised-io/promise').Deferred;
var seq			= require('promised-io/promise').seq;
var argv        = require('minimist')(system.args);
var components  = require('./tools/components.js');
var I           = components.actions;
var U           = components.glue;
var A           = require('./tools/actions.js');

var $ = null;

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


var clickNext = function clickNext()
{
	var deferred = new Deferred();

	A.trigger(page, '#btNext', 'click');

	deferred.resolve();

	return deferred.promise;
};

/* First Step */

var chooseLanguage = function chooseLanguage(code)
{
	console.log('Trying to select installer language: ' + code);
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
		return U.waitFor(page, '#btNext');
	}

	return deferred.promise;
};

/* Second Step */

var acceptLicense = function acceptLicense ()
{
	console.log('Going to accept license...');
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
	console.log('Setting non technical parameters...');

	var ok = true;

	ok = ok && A.setValue(page, '#infosShop', settings.shopName);
	ok = ok && A.setValueChosen(page, '#infosActivity', settings.activityId);
	ok = ok && A.setValue(page, 'input[name=db_mode]', settings.dbMode);
	ok = ok && A.setValueChosen(page, '#infosCountry', settings.countryCode);
	ok = ok && A.setValueChosen(page, '#infosTimezone', settings.timeZone);
	ok = ok && A.setValue(page, '#infosFirstname', settings.firstname);
	ok = ok && A.setValue(page, '#infosName', settings.lastname);
	ok = ok && A.setValue(page, '#infosEmail', settings.email);
	ok = ok && A.setValue(page, '#infosPassword', settings.password);
	ok = ok && A.setValue(page, '#infosPasswordRepeat', settings.password);
	ok = ok && A.checkCheckBox(page, '#infosNotification', settings.newsletter);

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

/* Fourth Step */

var setTechnicalParameters = function setTechnicalParameters()
{
	console.log('Setting technical parameters...');

	var ok = true;
	ok = ok && A.setValue(page, '#dbServer', settings.mysqlHost);
	ok = ok && A.setValue(page, '#dbName', settings.mysqlDatabase);
	ok = ok && A.setValue(page, '#dbLogin', settings.mysqlUser);
	ok = ok && A.setValue(page, '#dbPassword', settings.mysqlPassword);
	ok = ok && A.setValue(page, '#db_prefix', settings.tablesPrefix);

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
	console.log('Checking database...');
	var deferred = new Deferred();
	U.waitFor(page, '#btTestDB').then(function () {
		A.trigger(page, '#btTestDB', 'click');
		U.waitFor(page, '#dbResultCheck').then(function () {
			U.waitFor(page, '#btNext').then(function () {
				console.log('Seems fine, will now install!');
				deferred.resolve();
			});
		});
	});

	return deferred.promise;
};

if (!argv.url)
{
	phantom.exit(components.errors.INVALID_URL);
}

page.open(argv.url, function () {
	seq([
		chooseLanguage,
		I.willTakeScreenshot(page, argv.screenshots, '1_installer_language'),
		clickNext,
		U.willWaitFor(page, '#set_license', 'visible'),
		acceptLicense,
		I.willTakeScreenshot(page, argv.screenshots, '2_installer_license'),
		clickNext,
		U.willWaitFor(page, '#btNext', 'visible'),
		setNonTechnicalParameters,
		U.willDelay(), // Wait before taking screenshot so that jQuery UI has updated
		I.willTakeScreenshot(page, argv.screenshots, '3_installer_infos'),
		clickNext,
		U.willWaitFor(page, '#dbServer', 'visible'),
		setTechnicalParameters,
		I.willTakeScreenshot(page, argv.screenshots, '4_installer_technical_settings'),
		checkDB,
		I.willTakeScreenshot(page, argv.screenshots, '5_installer_check_db'),
		clickNext,
		U.willWaitFor(page, 'a.BO', 'visible'),
		U.willDelay(),
		I.willTakeScreenshot(page, argv.screenshots, '6_installer_done')
	], settings.language)
	.then(function () {
		console.log('Seems installed! :)');
		phantom.exit(components.errors.SUCCESS);
	}, function (error) {
		console.log('Some step failed with: ' + error);
		phantom.exit(components.errors.UNSPECIFIED_ERROR);
	});
});

