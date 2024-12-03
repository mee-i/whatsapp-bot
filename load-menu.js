let { FunctionCommand, FunctionDetails } = require("./config.js");
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
		fs.readdir("./modules/", (err, files) => {
			if (err) {
				console.error("Error reading the directory:", err);
				return;
			}

			files.forEach((file) => {
				const filePath = "./modules/" + file;
				if (path.extname(file) === ".js") {
					console.log("Loading %s", filePath);
					const lib = require(filePath);
					let MenuName = "";
					let disableMenu = [];

					if (lib.Config) {
						if (lib.Config.menu) MenuName = lib.Config.menu;
						if (lib.Config.disableMenu) disableMenu = lib.Config.disableMenu;
						if (lib.Config.description)
							Object.keys(lib.Config.description).forEach((fname) => {
								FunctionDetails[fname] = lib.Config.description[fname];
							});

						delete lib.Config;
					}

					if (typeof lib.init == "function") {
						lib.init();
						delete lib.init;
					}

					// Menginisialisasi MenuName di FunctionCommand jika belum ada
					if (!FunctionCommand[MenuName]) {
						FunctionCommand[MenuName] = {};
					}

					// Iterasi melalui kunci-kunci di lib dan menetapkan mereka ke FunctionCommand
					Object.keys(lib).forEach((key) => {
						if (!disableMenu.includes(key)) {
							FunctionCommand[MenuName][key] = lib[key];
						}
					});
				}
			});
		});
	},
};
