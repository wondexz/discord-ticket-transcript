const { Client, GatewayIntentBits, PermissionFlagsBits, PermissionsBitField, Events, Collection, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require('node:fs');
const INTENTS = Object.values(GatewayIntentBits);
const client = new Client({ intents: INTENTS });
const config = require("./config");
const chalk = require('chalk');
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { readdirSync } = require("fs");
const moment = require("moment");
const db = require("croxydb")
const discordTranscripts = require('discord-html-transcripts');
const crypto = require('crypto');
require('./server');
const { v4: uuidv4 } = require('uuid');

let token = config.token;

client.commands = new Collection();
client.slashcommands = new Collection();
client.commandaliases = new Collection();

const rest = new REST({ version: "10" }).setToken(token);

const slashcommands = [];
const commandFolders = fs.readdirSync('./commands');

console.log(chalk.red('[COMMANDS] Loading Commands...'));

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const commandPath = `./commands/${folder}/${file}`;
        const command = require(commandPath);
        const commandCategory = folder.toLocaleUpperCase();
        slashcommands.push(command.data.toJSON());
        client.slashcommands.set(command.data.name, command);
        console.log(chalk.cyan('[COMMANDS] ' + command.data.name + ' Yüklendi' + chalk.yellow(' - ') + chalk.red('Kategori: ' + commandCategory)));
    }
}


client.on(Events.ClientReady, async () => {
    try {
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: slashcommands,
        });
    } catch (error) {
        console.error(error);
    }
    console.log(chalk.red(`[BOT]`) + chalk.green(` ${client.user.username} Discord'a bağlandı!`));
});


readdirSync("./events").forEach(async (file) => {
    const event = await require(`./events/${file}`);
    const name = file.split(".")[0];
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
        console.log(chalk.blue`[EVENT]` + ` ${name} yüklendi.`)
    }
});

client.login(config.token)

// ticket

client.on("interactionCreate", async (interaction) => {
    if (interaction.customId === "destekolustur") {
        const datas = db.get(`destekSistemi_${interaction.guild.id}`);
        if (datas) {
            db.add(`destekSıra_${interaction.guild.id}`, 1);
            const sıra = db.get(`destekSıra_${interaction.guild.id}`);
            db.set(`destekacik_${interaction.guild.id}_${sıra}`, { id: interaction.user.id, username: interaction.user.username })
            
            const talebiAcankullanici = interaction.user;

            interaction.guild.channels.create({
                name: `ticket-${sıra}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: datas.yetkili,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
            }).then((cha) => {
                interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setAuthor({ name: "Başarılı" })
                            .setDescription(`Başarıyla __destek__ talebin oluşturuldu ${cha}`),
                    ],
                    ephemeral: true,
                });

                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setAuthor({ name: `${talebiAcankullanici.username} - Destek Talebi`, iconURL: talebiAcankullanici.avatarURL() })
                    .setDescription(`Başarıyla __destek__ talebin açıldı, yetkilileri bekle!`)
                    .setThumbnail(interaction.guild.iconURL());

                const button = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel("Desteği Sonlandır")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('1211077336385191956')
                        .setCustomId("desteksonlandir")
                );

                const etiket = `${talebiAcankullanici} | <@&${datas.yetkili}>`;

                cha.send({
                    content: etiket,
                    embeds: [embed],
                    components: [button]
                });
            });
        } else {
            interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({ name: "Başarısız" })
                        .setDescription(`Destek sistemi devre dışı!`),
                ],
                ephemeral: true,
            });
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.customId === "desteksonlandir") {
      const datas = db.get(`destekSistemi_${interaction.guild.id}`);
      const data = client.channels.cache.get(datas.log);
      const sira = db.get(`destekSıra_${interaction.guild.id}`)
      const destekacan = db.get(`destekacik_${interaction.guild.id}_${sira}`)
  
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
  
      const channel = interaction.channel;
      const guild = interaction.guild
      
      const talebiAcankullanici = messages.first().author;

      const attachment = await discordTranscripts.generateFromMessages(messages, channel);
  
      function hash(text) {
        return crypto.createHash('sha256').update(text).digest('hex');
      }

      const fileName = `${uuidv4()}`;
      const filePath = `./transcripts/${fileName}`;
      
      let contentToWrite = attachment.content || (attachment.attachment ? attachment.attachment.toString() : null);
  
      if (!contentToWrite) {
        console.error("Attachment içeriği alınamıyor.");
        return;
      }
  
      fs.writeFileSync(filePath, contentToWrite);

      const urlbutton = new ButtonBuilder()
      .setURL(`https://${config.domain}/ticket/${fileName}`)
      .setLabel('Mesajları Görüntüle')
      .setStyle(ButtonStyle.Link)

      const row = new ActionRowBuilder()
      .addComponents(urlbutton)
  
      data.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setAuthor({ name:`${talebiAcankullanici.tag} - Destek Kapatıldı`, iconURL: talebiAcankullanici.avatarURL() })
            .setThumbnail(guild.iconURL())
            .setFooter({ text: `${client.user.username} ©️ Tüm hakları saklıdır.`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Destek talebi başarıyla kapatıldı.\n**•** Kapatan kullanıcı <@${interaction.user.id}> (___@${interaction.user.username}___)\n**•** Talebi açan kullanıcı <@${destekacan.id}> (___@${destekacan.username}___)`),
        ],
        components: [row]
      });
  
      interaction.channel.delete();
    }
});