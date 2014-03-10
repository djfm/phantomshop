var git = require('gift');

module.exports = function Installer(config, settings)
{
	this.install = function(then)
	{
		var error = null;

		var shops = config.mongo.collection('shops');

		shops.insert({shop_name: settings.shop_name}, function(err, objs){

			var folderName = "shop_" + objs[0]._id;

			console.log("Will attempt to create shop in folder named "+folderName);

			var path = config.rootDirectory + '/' + folderName;

			objs[0].path = path;
			objs[0].folderName = folderName;

			shops.update(
				{
					_id: objs[0].id
				},
				{
					$set: {
						path: path,
						folderName: folderName
					}
				}, function (err, objs){
				console.log(arguments);
			});

			then(error);

		});

		
	};
};