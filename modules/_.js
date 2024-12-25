const fs = require("fs");

module.exports = {
  init: () => {
    const DbFile = "./database/userdata.json";
    if (!fs.existsSync(DbFile))
      fs.writeFileSync(DbFile, JSON.stringify({}), "utf-8");
  }
}