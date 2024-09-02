const { ActivityType, Events } = require("discord.js");
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        let activities = config.activities, i = 0;
        setInterval(() => client.user.setActivity({ name: `${activities[i++ % activities.length]}`, type: ActivityType.Playing }), 22000);
    }
};