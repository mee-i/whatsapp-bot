const { makeInMemoryStore } = require('@whiskeysockets/baileys');

const store = makeInMemoryStore({});
module.exports = store;