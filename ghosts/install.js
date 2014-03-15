'use strict';
var system = require('system');

var argv = require('minimist')(system.args);

var page = require('webpage').create();

var defaultDelay = 500;

//console.log(JSON.stringify(argv));

/* Helper Functions */

var whenReady = function whenReady (callback, delay)
{
	var intMs = defaultDelay;

	function checkRepeatedly ()
	{
		var interval = setInterval(function () {

			console.log("Checking if page ready...");

			var state = page.evaluate (function () {
				return document.readyState;
			});

			if (state === 'complete')
			{
				console.log('Page is ready! :)');
				clearInterval(interval);
				callback();
			}
		}, intMs);
	};

	if (delay === undefined)
	{
		delay = intMs;
	}

	console.log('Will check for ready in ' + delay + ' then every ' + intMs + 'ms')

	setTimeout(checkRepeatedly, delay);
};

var withElement = function withElement (selector, callback, delay)
{
	whenReady(function () {
		var interval = setInterval(function () {
			console.log('Checking if ' + selector + ' is visible...');
			var ok = page.evaluate(function (selector) {
				return $(selector).is(':visible');
			}, selector);
			if (ok)
			{
				console.log('Found element: ' + selector);
				clearInterval(interval);
				callback();
			}
		}, defaultDelay);
	}, delay);
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

var url = argv.url;

var settings = {

	// Non technical info

	shopName: argv.shopName || "My Shop",
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

var chooseLanguage = function chooseLanguage(code)
{
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
};

var acceptLicense = function acceptLicense ()
{
	return $('#set_license').click().val() == 1;
};

page.open(url, function () {
	var err = page.evaluate(chooseLanguage, 'de');

	withElement('#btNext', function () {

		if (argv.screenshots)
		{
			page.render(argv.screenshots + '/install_1_language.png');
		}
		trigger('#btNext', 'click');
		
		withElement('#set_license', function () {
			var license_accepted = page.evaluate(acceptLicense);

			console.log('License accepted?', license_accepted);

			if (argv.screenshots)
			{
				page.render(argv.screenshots + '/install_2_license.png');
			}

			trigger('#btNext', 'click');

			withElement('#btNext', function () {

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

				console.log("Non technical info set?", ok);

				// Wait a bit to take screenshot, in case jQuery chosen hasn't finished updating the UI
				setTimeout(function () {
					if (argv.screenshots)
					{
						page.render(argv.screenshots + '/install_3_shop_settings.png');
					}

					var clicked = trigger('#btNext', 'click') == 1;

					console.log ('Next button clicked?', clicked);

					withElement('#dbServer', function () {

						ok = ok && setValue('#dbServer', settings.mysqlHost);
						ok = ok && setValue('#dbName', settings.mysqlDatabase);
						ok = ok && setValue('#dbLogin', settings.mysqlUser);
						ok = ok && setValue('#dbPassword', settings.mysqlPassword);
						ok = ok && setValue('#db_prefix', settings.tablesPrefix);

						console.log("Technical info set?", ok);

						withElement('#btTestDB', function () {
							trigger('#btTestDB', 'click');
							withElement('#dbResultCheck', function () {
								if (argv.screenshots)
								{
									page.render(argv.screenshots + '/install_4_technical_settings.png');
								}
								withElement('#btNext', function () {
									trigger('#btNext', 'click');

									withElement('a.BO', function () {
										window.setTimeout(function () {
											if (argv.screenshots)
											{
												page.render(argv.screenshots + '/install_5_finished.png');
											}
											phantom.exit();
										}, defaultDelay);
									});
								});
							});
						});
					});
				}, defaultDelay);
			});
		});
	});
});

