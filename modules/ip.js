module.exports = {
  checkip: async (sock, msg, ip) => {
    await sock.sendMessage(msg.key.remoteJid, { text: `Checking for ${ip}` });
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,mobile,proxy,hosting,query`
    );
    const data = await response.json();
    if (data.status == "success") {
      const locationmsg = await sock.sendMessage(
        msg.key.remoteJid,
        {
          location: { degreesLatitude: data.lat, degreesLongitude: data.lon },
        },
        { quoted: msg }
      );
      const text = `
*IP*: ${data.query}
*Status*: ${data.status}
*Continent*: ${data.continent} (${data.continentCode})
*Country*: ${data.country} (${data.countryCode})
*Region*: ${data.regionName} (${data.region})
*City*: ${data.city}
*ZIP*: ${data.zip}
*Latitude*: ${data.lat}
*Longitude*: ${data.lon}
*Timezone*: ${data.timezone}
*Offset*: ${data.offset}
*Currency*: ${data.currency}
*ISP*: ${data.isp}
*Organization*: ${data.org}
*AS*: ${data.as} (${data.asname})
*Mobile*: ${data.mobile ? "Yes" : "No"}
*Proxy*: ${data.proxy ? "Yes" : "No"}
*Hosting*: ${data.hosting ? "Yes" : "No"}
`;
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: text,
        },
        { quoted: locationmsg }
      );
    } else {
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `Failed to get info of ${ip}, did you send ip correctly?`,
        },
        { quoted: msg }
      );
    }
  },
  Config: {
    menu: "Tools",
    details: {
      checkip: {
				description: "Check IP information"
			},
    },
  },
};
