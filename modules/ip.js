
module.exports = {
    ip: async (sock, msg, ip) => {
        await sock.sendMessage(msg.key.remoteJid, {text: `Checking for ${ip}`});
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,mobile,proxy,hosting,query`);
        const data = await response.json();
        const locationmsg = await sock.sendMessage(msg.key.remoteJid, {
            location: { degreesLatitude: 24.121231, degreesLongitude: 55.1121221 },
        }, {quoted: msg});
        const text = `
**Query**: ${data.query}
**Status**: ${data.status}
**Continent**: ${data.continent} (${data.continentCode})
**Country**: ${data.country} (${data.countryCode})
**Region**: ${data.regionName} (${data.region})
**City**: ${data.city}
**ZIP**: ${data.zip}
**Latitude**: ${data.lat}
**Longitude**: ${data.lon}
**Timezone**: ${data.timezone}
**Offset**: ${data.offset}
**Currency**: ${data.currency}
**ISP**: ${data.isp}
**Organization**: ${data.org}
**AS**: ${data.as} (${data.asname})
**Mobile**: ${data.mobile ? "Yes" : "No"}
**Proxy**: ${data.proxy ? "Yes" : "No"}
**Hosting**: ${data.hosting ? "Yes" : "No"}
`;
        await sock.sendMessage(msg.key.remoteJid, {
            text: text,
        }, {quoted: locationmsg});
    },
    Config: {
        menu: "Tools",
        description: {
            ip: "Check IP information"
        }
    }
};