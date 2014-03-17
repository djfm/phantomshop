'use strict';

module.exports = {};

module.exports.setValue = function (page, selector, value)
{
	return page.evaluate(function (selector, value) {
		return $(selector).val(value).val() == value;
	}, selector, value);
};

module.exports.checkCheckBox = function (page, selector, checked)
{
	return page.evaluate(function (selector, checked) {
		return $(selector).prop('checked', checked).is(':checked') == checked;
	}, selector, checked);
};

module.exports.trigger = function (page, selector, e)
{
	return page.evaluate(function (selector, e) {
		return $(selector).trigger(e).length;
	}, selector, e);
};

module.exports.clickMenuItem = function (page, controllerName)
{
	return page.evaluate(function (controllerName) {
		$('nav ul.menu a').each(function (i, a) {
			a = $(a);
			console.log(a.attr('href'));
		});
	}, controllerName);
};