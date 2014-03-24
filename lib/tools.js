'use strict';

var Deferred = require('promised-io/promise').Deferred;

var advance = function advance(fun, srcArray, srcPos, resultArray)
{
	var d = new Deferred();

	if (srcPos < srcArray.length)
	{
		fun(srcArray[srcPos]).then(function (value) {
			resultArray.push(value);
			advance(fun, srcArray, srcPos + 1, resultArray).then(d.resolve);
		}, function () {
			advance(fun, srcArray, srcPos + 1, resultArray).then(d.resolve);
		});
	}
	else
	{
		d.resolve(resultArray);
	}

	return d.promise;
};

module.exports.mapPromise = function (arr, fun) {
	var resultArray = [];
	return advance(fun, arr, 0, resultArray);
};

module.exports.makeEmptyPromise = function ()
{
	var d = new Deferred();
	d.resolve(true);
	return d.promise;
}