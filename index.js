const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events,
} = require("discord.js");

// ===================== CONFIG =====================

const GENERAL_CHANNEL_ID = "PON_AQUI_ID_GENERAL";
const SCRIPTS_CHANNEL_ID = "PON_AQUI_ID_SCRIPTS";
const DUELOS_CHANNEL_ID = "1471634184538816523"; // ✅ TU CANAL DE DUELOS

// ===================== DETECTORES =====================

// Detecta links comunes
const LINK_REGEX = /(https?:\/\/|www\.|discord\.gg|\.com|\.net|\.org|\.gg)/i;

// Palabras prohibidas
const BAD_WORDS = [
  "pndj",
  "pendej",
  "hp",
  "hpta",
  "hijodeputa",
  "hijo de puta",
  "imbecil",
  "idiota",
];

// Duel/duelo/duelos
const DUEL_REGEX = /\b(duel|duelo|duelos)\b/i;

// ===================== SCRIPTS =====================

const CATEGORIES = {
  hub: {
    label: "Hub scripts",
    description: "Chocola, ZZZ, Lemon, Chili, Kurd, Miranda, Crusty, Ugly",
    scripts: {
      chocola: {
        label: "Chocola hub",
        description: "Script principal de Chocola",
        code: `loadstring(game:HttpGet('https://raw.githubusercontent.com/xspeedHub0/ZLhub/main/chocolahub.lua'))()`,
      },
      zzz: {
        label: "ZZZ hub",
        description: "ZZZ hub",
        code: `loadstring(game:HttpGet('https://pastefy.app/FLgzUxuW/raw'))()`,
      },
      lemon: {
        label: "Lemon hub",
        description: "Lemon hub",
        code: `loadstring(game:HttpGet('https://api.luarmor.net/files/v3/loaders/c4281c3937ebd537cb9e860182e41141.lua'))()`,
      },
      chili: {
        label: "Chili hub",
        description: "Chili hub keyless",
        code: `loadstring(game:HttpGet('https://rawscripts.net/raw/SOON-Steal-a-Brainrot-Chili-Hub-keyless-57764'))()`,
      },
      kurd: {
        label: "Kurd hub",
        description: "Universal Script Kurd hub",
        code: `loadstring(game:HttpGet('https://rawscripts.net/raw/Universal-Script-Kurd-hub-51808'))()`,
      },
      miranda: {
        label: "Miranda hub",
        description: "Miranda hub",
        code: `loadstring(game:HttpGet('https://pastefy.app/JJVhs3rK/raw'))()`,
      },
      crusty: {
        label: "Crusty hub",
        description: "Crusty brainrot",
        code: `loadstring(game:HttpGet("https://raw.githubusercontent.com/platinww/CrustyMain/refs/heads/main/Steal-A-Brainrot/steal-a-brainrot.lua"))()`,
      },
      ugly: {
        label: "Ugly hub",
        description: "Ugly loader",
        code: `loadstring(game:HttpGet("https://api.luarmor.net/files/v3/loaders/53325754de16c11fbf8bf78101c1c88.lua"))()`,
      },
    },
  },

  pvp: {
    label: "PVP",
    description: "Scripts de PVP",
    scripts: {
      zlpvp: {
        label: "ZL PVP",
        description: "ZL PVP script",
        code: `loadstring(game:HttpGet('https://raw.githubusercontent.com/xspeedHub0/ZLhub/main/ZLPVPPreview.lua'))()`,
      },
    },
  },

  fps: {
    label: "FPS Devourer",
    description: "Scripts para destrozar FPS",
    scripts: {
      rezzy: {
        label: "REZZY FPS KILLER",
        description: "Rezzy FPS killer",
        code: `loadstring(game:HttpGet('https://pastefy.app/ra9P5aOV/raw'))()`,
      },
      serverdestroyer: {
        label: "Server Destroyer V8",
        description: "Server Destroyer V8",
        code: `loadstring(game:HttpGet('https://files.zvyz.live/scripts/Cracked/TSKSkids/SVD8_Crack.luau'))()`,
      },
    },
  },

  petfinder: {
    label: "Pet finder",
    description: "Scripts para encontrar pets",
    scripts: {
      petfinder: {
        label: "Pet finder hub",
        description: "Pet finder hub",
        code: `loadstring(game:HttpGet("https://api.luarmor.net/files/v3/loaders/083f208b2d5d19c6b565190b0d2293c9.lua"))()`,
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
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`🟢 Bot conectado: ${c.user.tag}`);
});

// ===================== UTIL =====================

async function tryDeleteMessage(message) {
  try {
    if (message.deletable) await message.delete();
  } catch (e) {
    console.error("No pude borrar el mensaje:", e?.message || e);
  }
}

async function punish(message, replyText, ms, reason) {
  await tryDeleteMessage(message);

  try {
    if (message.member?.moderatable) {
      await message.member.timeout(ms, reason);
    }
  } catch (e) {
    console.error("No pude mutear:", e?.message || e);
  }

  try {
    await message.channel.send(`${replyText} <@${message.author.id}>`);
  } catch (e) {
    console.error("No pude enviar aviso:", e?.message || e);
  }
}

// ===================== MENSAJES =====================

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const textLower = message.content.toLowerCase();

    // ✅ ANTI LINKS (BORRA + MUTE 3 MIN)
    if (LINK_REGEX.test(message.content)) {
      await punish(
        message,
        "🔗 Links no permitidos. Silenciado 3 minutos.",
        3 * 60 * 1000,
        "Envío de links"
      );
      return;
    }

    // ✅ ANTI INSULTOS (BORRA + MUTE 1 MIN)
    if (BAD_WORDS.some((w) => textLower.includes(w))) {
      await punish(
        message,
        "⚠️ Prohibido insultar. Silenciado 1 minuto.",
        60 * 1000,
        "Insultos"
      );
      return;
    }

    // ✅ DUEL / DUELO / DUELOS -> MENCIONA CANAL
    if (DUEL_REGEX.test(message.content)) {
      await message.reply(`⚔️ Los duelos van en <#${DUELOS_CHANNEL_ID}>`);
    }

    // ✅ SI PIDEN SCRIPTS EN GENERAL -> AVISA CANAL SCRIPTS (opcional)
    if (
      message.channel.id === GENERAL_CHANNEL_ID &&
      (textLower.includes("script") || textLower.includes("desync"))
    ) {
      await message.reply(`🔧 Los scripts están en <#${SCRIPTS_CHANNEL_ID}>.`);
    }

    // ✅ MENÚ DE SCRIPTS
    if (textLower !== "!menu") return;

    const categoryOptions = Object.entries(CATEGORIES).map(([id, data]) => ({
      label: data.label,
      description: data.description,
      value: id,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("scripts-category")
      .setPlaceholder("Elige una categoría")
      .addOptions(categoryOptions);

    await message.reply({
      content: "🧾 Menú de scripts:",
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  } catch (err) {
    console.error("Error MessageCreate:", err);
  }
});

// ===================== INTERACCIONES =====================

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  // CATEGORÍA
  if (interaction.customId === "scripts-category") {
    const categoryId = interaction.values[0];
    const category = CATEGORIES[categoryId];

    const scriptOptions = Object.entries(category.scripts).map(
      ([scriptId, data]) => ({
        label: data.label,
        description: data.description,
        value: `${categoryId}:${scriptId}`,
      })
    );

    const scriptsMenu = new StringSelectMenuBuilder()
      .setCustomId("scripts-select")
      .setPlaceholder("Elige un script")
      .addOptions(scriptOptions);

    return interaction.reply({
      content: `Has elegido **${category.label}**. Ahora escoge un script:`,
      components: [new ActionRowBuilder().addComponents(scriptsMenu)],
      ephemeral: true,
    });
  }

  // SCRIPT
  if (interaction.customId === "scripts-select") {
    const [categoryId, scriptId] = interaction.values[0].split(":");
    const script = CATEGORIES[categoryId].scripts[scriptId];

    return interaction.reply({
      content: `Aquí tienes **${script.label}**:\n\`${script.code}\`\n\nCopia y pega 👀`,
      ephemeral: true,
    });
  }
});

// ===================== ABAJO DEL TODO (RUN / LOGIN) =====================

keepAlive(); // 🔥 esto mantiene el server vivo

const botToken = process.env.DISCORD_BOT_TOKEN;

if (!botToken) {
  console.error("❌ No se encontró DISCORD_BOT_TOKEN en Secrets");
  process.exit(1);
}

client.login(botToken).catch((err) => {
  console.error("❌ Error al iniciar sesión:", err);
});
