let { FunctionCommand, FunctionDetails, AutoFunction, MenuList } = require("./config.js");
const fs = require("fs");
const path = require("path");

module.exports = {
	LoadMenu: async () => {
		Object.keys(FunctionCommand).forEach((key) => {
			delete FunctionCommand[key];
		});
		Object.keys(FunctionDetails).forEach((key) => {
			delete FunctionDetails[key];
		});
		Object.keys(MenuList).forEach((key) => {
			delete MenuList[key];
		});
		fs.readdir("./modules/", (err, files) => {
			if (err) {
				console.error("Error reading the directory:", err);
				return;
			}

			files.forEach((file) => {
				const filePath = "./modules/" + file;
				delete require.cache[require.resolve(filePath)];
				if (path.extname(file) === ".js") {
					console.log("Loading %s", filePath);
					const lib = require(filePath);
					let disableMenu = [];
					let menuname = "";

					if (lib.Config && !file.startsWith("_")) {
						menuname = lib.Config.menu ?? "";
						if (!MenuList[menuname])
							MenuList[menuname] = [];
						if (lib.Config.disableMenu) disableMenu = lib.Config.disableMenu;
						if (lib.Config.details)
							Object.keys(lib.Config.details).forEach((fname) => {
								if (!FunctionDetails[fname]) {
									FunctionDetails[fname] = {};
								}
								FunctionDetails[fname].owneronly = lib.Config.details[fname].owneronly ?? false;
								FunctionDetails[fname].admingroup = lib.Config.details[fname].owneronly ?? false;
								FunctionDetails[fname].description = lib.Config.details[fname].description ?? "";
								FunctionDetails[fname].menu = menuname;
								if (!MenuList[menuname].includes(fname))
									MenuList[menuname].push(fname);
							});

						delete lib.Config;
					}

					if (!MenuList[menuname])
						MenuList[menuname] = [];

					if (typeof lib.init == "function") {
						lib.init();
						delete lib.init;
					}

					Object.keys(lib).forEach((key) => {
						if (!disableMenu.includes(key) && !file.startsWith("_")) {
							FunctionCommand[key] = lib[key];
							if (!MenuList[menuname].includes(key))
								MenuList[menuname].push(key);
							if (!FunctionDetails[key]) {
								FunctionDetails[key] = {
									owneronly: false,
                  admingroup: false,
                  description: "",
                  menu: menuname,
								};
							}
						} else if (file.startsWith("_")) {
							AutoFunction[key] = lib[key];
						}
					});
				}
			});
			FunctionCommand = Object.keys(FunctionCommand)
				.sort();
			MenuList = Object.keys(MenuList)
				.sort();
		});
	},
};
