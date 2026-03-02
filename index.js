const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events,
  PermissionsBitField,
  Partials,
  EmbedBuilder,
} = require("discord.js");

// ===================== CONFIG =====================
const CONFIG = {
  PREFIX: "!",
  GENERAL_CHANNEL_ID: "PON_AQUI_ID_GENERAL",
  SCRIPTS_CHANNEL_ID: "PON_AQUI_ID_SCRIPTS",
  DUELOS_CHANNEL_ID: "1471634184538816523",

  // Rol base "Miembro" (clave para tus reglas)
  MEMBER_ROLE_ID: "PON_AQUI_ID_ROL_MIEMBRO",

  // Detecta links comunes
  LINK_REGEX: /(https?:\/\/\S+|www\.\S+|discord\.gg\/\S+|\b\w+\.(com|net|org|gg)\b)/i,

  // Palabras prohibidas (añadidas las tuyas)
  BAD_WORDS: [
    "pndj",
    "pendej",
    "hp",
    "hpta",
    "hijodeputa",
    "hijo de puta",
    "imbecil",
    "idiota",
    // NUEVAS:
    "hdp",
    "vendo",
    "retrasado",
    "autista",
  ],

  // Duel/duelo/duelos
  DUEL_REGEX: /\b(duel|duelo|duelos)\b/i,

  // Castigos
  TIMEOUT_BADWORDS_MS: 60 * 1000,     // 1 min
  TIMEOUT_LINKS_MS: 3 * 60 * 1000,    // 3 min
};

// ===================== MENÚ (PLANTILLA SEGURA) =====================
// Mantengo tu !menu con select menu, pero sin repartir exploits.
// Puedes cambiar estos textos por reglas, ayudas, recursos del servidor, etc.
const CATEGORIES = {
  info: {
    label: "Info",
    description: "Información útil del servidor",
    items: {
      reglas: {
        label: "Reglas",
        description: "Normas básicas",
        code: "Respeto, nada de spam, y usa los canales correctos 🙂",
      },
      ayuda: {
        label: "Ayuda",
        description: "Cómo pedir soporte",
        code: "Si necesitas ayuda, menciona a un moderador o abre ticket.",
      },
    },
  },
  duelos: {
    label: "Duelos",
    description: "Cosas relacionadas con duelos",
    items: {
      canal: {
        label: "Canal de duelos",
        description: "Dónde van los duelos",
        code: `Los duelos van en <#${CONFIG.DUELOS_CHANNEL_ID}>`,
      },
    },
  },
};

// ===================== CLIENT =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, (c) => {
  console.log(`🟢 Bot conectado: ${c.user.tag}`);
});

// ===================== HELPERS =====================

async function tryDeleteMessage(message) {
  try {
    if (message.deletable) await message.delete();
  } catch (e) {
    console.error("No pude borrar el mensaje:", e?.message || e);
  }
}

// “Solo Miembro”: tiene el rol Miembro y su rol más alto ES ese mismo (no superior)
function isOnlyMemberRole(member) {
  const memberRole = member.guild.roles.cache.get(CONFIG.MEMBER_ROLE_ID);
  if (!memberRole) return false;

  if (!member.roles.cache.has(memberRole.id)) return false;
  return member.roles.highest.id === memberRole.id;
}

// Regla: roles superiores a Miembro NO se silencian
function canTimeout(member) {
  return isOnlyMemberRole(member);
}

// Regla: solo se borran LINKS si es “solo miembro”
function shouldDeleteLinks(member) {
  return isOnlyMemberRole(member);
}

// Aplica castigo (borra + timeout + aviso) SOLO si canTimeout(member) es true
async function punish(message, replyText, ms, reason) {
  await tryDeleteMessage(message);

  const member = message.member;
  if (!member) return;

  if (!canTimeout(member)) {
    // No silenciar roles superiores a miembro (ni avisar si no quieres)
    return;
  }

  // Permiso del bot
  const botMe = message.guild.members.me;
  if (!botMe?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

  try {
    if (member.moderatable) await member.timeout(ms, reason);
  } catch (e) {
    console.error("No pude mutear:", e?.message || e);
  }

  try {
    const warn = await message.channel.send(`${replyText} <@${message.author.id}>`);
    setTimeout(() => warn.delete().catch(() => {}), 6000);
  } catch (e) {
    console.error("No pude enviar aviso:", e?.message || e);
  }
}

// ===================== COMANDOS =====================

async function handleMenu(message) {
  const categoryOptions = Object.entries(CATEGORIES).map(([id, data]) => ({
    label: data.label,
    description: data.description,
    value: id,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId("menu-category")
    .setPlaceholder("Elige una categoría")
    .addOptions(categoryOptions);

  const embed = new EmbedBuilder()
    .setTitle("🧾 Menú")
    .setDescription("Elige una categoría en el desplegable.");

  await message.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function handlePurge(message, args) {
  const canManage =
    message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
    message.member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!canManage) return message.reply("❌ No tienes permisos para usar `!purge`.");

  const n = parseInt(args[0], 10);
  if (!n || isNaN(n) || n < 1 || n > 100) return message.reply("⚠️ Uso: `!purge 1-100`");

  const deleted = await message.channel.bulkDelete(n, true).catch(() => null);
  if (!deleted) return message.reply("⚠️ No pude borrar. ¿Mensajes de +14 días o faltan permisos?");

  const info = await message.channel.send(`🧹 Eliminados **${deleted.size}** mensajes.`);
  setTimeout(() => info.delete().catch(() => {}), 4000);
}

// ===================== MENSAJES =====================
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const textLower = (message.content || "").toLowerCase();

    // ✅ Respuesta automática en canal scripts
    if (CONFIG.SCRIPTS_CHANNEL_ID && message.channel.id === CONFIG.SCRIPTS_CHANNEL_ID) {
      if (textLower.trim().length > 0) {
        await message.reply(
          `amigo ve a los canales de duelos y buscate tu script we <#${CONFIG.DUELOS_CHANNEL_ID}>`
        );
      }
    }

    // ✅ Comandos
    if (textLower.startsWith(CONFIG.PREFIX)) {
      const [cmdRaw, ...args] = textLower.slice(CONFIG.PREFIX.length).trim().split(/\s+/);
      const cmd = cmdRaw || "";

      if (cmd === "menu" || cmd === "menú") return handleMenu(message);
      if (cmd === "purge") return handlePurge(message, args);
    }

    // ✅ ANTI LINKS (solo borra si es “solo miembro”; y solo silencia si es “solo miembro”)
    if (CONFIG.LINK_REGEX.test(message.content)) {
      const member = message.member;
      if (member && shouldDeleteLinks(member)) {
        await punish(
          message,
          "🔗 Links no permitidos para **Miembro**. Silenciado 3 minutos.",
          CONFIG.TIMEOUT_LINKS_MS,
          "Envío de links (Miembro)"
        );
      }
      return;
    }

    // ✅ ANTI INSULTOS (solo si es “solo miembro”)
    if (CONFIG.BAD_WORDS.some((w) => textLower.includes(w))) {
      await punish(
        message,
        "⚠️ Prohibido insultar. Silenciado 1 minuto.",
        CONFIG.TIMEOUT_BADWORDS_MS,
        "Insultos (Miembro)"
      );
      return;
    }

    // ✅ DUEL / DUELO / DUELOS -> MENCIONA CANAL
    if (CONFIG.DUEL_REGEX.test(message.content)) {
      await message.reply(`⚔️ Los duelos van en <#${CONFIG.DUELOS_CHANNEL_ID}>`);
    }

    // ✅ Si piden “script/desync” en general -> manda al canal scripts
    if (
      message.channel.id === CONFIG.GENERAL_CHANNEL_ID &&
      (textLower.includes("script") || textLower.includes("desync"))
    ) {
      await message.reply(`🔧 Los temas de scripts van en <#${CONFIG.SCRIPTS_CHANNEL_ID}>.`);
    }
  } catch (err) {
    console.error("Error MessageCreate:", err);
  }
});

// ===================== INTERACCIONES (MENÚ) =====================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isStringSelectMenu()) return;

    // CATEGORÍA
    if (interaction.customId === "menu-category") {
      const categoryId = interaction.values[0];
      const category = CATEGORIES[categoryId];
      if (!category) return;

      const itemOptions = Object.entries(category.items).map(([itemId, data]) => ({
        label: data.label,
        description: data.description,
        value: `${categoryId}:${itemId}`,
      }));

      const itemsMenu = new StringSelectMenuBuilder()
        .setCustomId("menu-item")
        .setPlaceholder("Elige una opción")
        .addOptions(itemOptions);

      return interaction.reply({
        content: `Has elegido **${category.label}**. Ahora elige una opción:`,
        components: [new ActionRowBuilder().addComponents(itemsMenu)],
        ephemeral: true,
      });
    }

    // ITEM
    if (interaction.customId === "menu-item") {
      const [categoryId, itemId] = interaction.values[0].split(":");
      const item = CATEGORIES[categoryId]?.items?.[itemId];
      if (!item) return;

      return interaction.reply({
        content: `✅ **${item.label}**:\n${item.code}`,
        ephemeral: true,
      });
    }
  } catch (err) {
    console.error("Error InteractionCreate:", err);
  }
});

// ===================== LOGIN =====================
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!botToken) {
  console.error("❌ No se encontró DISCORD_BOT_TOKEN en Secrets");
  process.exit(1);
}

client.login(botToken).catch((err) => {
  console.error("❌ Error al iniciar sesión:", err);
});
