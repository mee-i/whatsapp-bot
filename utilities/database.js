const fs = require("fs");

const ReadConfig = async () => {
  const config = fs.readFileSync("./config.json");
  return JSON.parse(config);
};

const ReadUserData = async () => {
  return JSON.parse(fs.readFileSync("./database/userdata.json"));
};

const WriteUserData = async (data) => {
  fs.writeFileSync("./database/userdata.json", JSON.stringify(data, null, 2));
};

module.exports = {
  Config: {
    ReadConfig,
    IsAntiLinkEnabled: async (remoteJid) => {
      const data = await ReadConfig();
      return data["AntiLink"].includes(remoteJid);
    },
    Modify: async (key, value) => {
      const data = await ReadConfig();
      data[key] = value;
      fs.writeFileSync("./config.json", JSON.stringify(data, null, 2));
    }
  },
  UserData: {
    Read: async (remoteJid) => {
      const users = await ReadUserData();
      return users[remoteJid];
    },
    Add: async ({ remoteJid, name, xp = 0, level = 1, premium = false }) => {
      const users = await ReadUserData();
      users[remoteJid] = { name, xp, level, premium };
      WriteUserData(users);
    },
    Modify: async (remoteJid, key, value) => {
      const users = await ReadUserData();
      if (!users[remoteJid])
        return;
      users[remoteJid][key] = value;
      WriteUserData(users);
    },
    Remove: async (remoteJid) => {
      const users = await ReadUserData();
      delete users[remoteJid];
      WriteUserData(users);
    },
    Clear: async (password) => {
      if (password !== "Critical292929!") return;
      WriteUserData({});
    },
  },
};
