const { Events, InteractionType, EmbedBuilder } = require("discord.js");
const db = require("croxydb");

module.exports = {
    name: Events.InteractionCreate,
    execute: async (interaction) => {
        const client = interaction.client;
        const userId = interaction.user.id;

        if (interaction.type == InteractionType.ApplicationCommand) {
            if (interaction.user.bot) return;

            try {
                const command = client.slashcommands.get(interaction.commandName)
                command.run(client, interaction)
            } catch (e) {
                const embed = new EmbedBuilder()
                    .setDescription(`Komut çalıştırılamadı!`)
                interaction.reply({ embeds: [embed], ephemeral: true })
            }
        }
    },
};
