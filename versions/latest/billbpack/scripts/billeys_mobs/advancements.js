import { world, system, ItemStack, Player, Entity } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { playSound, translateItem } from "./utility";
import { showInfoBookForm } from "./infoBook";
import { ADVANCEMENTS } from "./advancementList";

const XP_PER_POWER_BANANA = 35;

let advancementPlayerCompletionOrder = {};

/** Color used for the first 3 players that completed an advancement */
const MEDAL_COLORS = ["§q", "§s", "§p"];

/**
 * @param {Player} player 
 * @param {string} advancementName 
 */
function giveAdvancement(player, advancementName) {
    if (!(player instanceof Player))
        return world.sendMessage(`§cError: Billey's Mobs advancements can only be given to players. Attempted to give ${message} to ${player.typeId}.`);
    const advancement = ADVANCEMENTS.find(a => a.name == advancementName);
    if (!advancement)
        return world.sendMessage(`§cError: Failed to give Billey's Mobs advancement "${message}" to ${player.name}. Advancement of name "${message}" not found.`);
    world.sendMessage({ rawtext: [{ translate: advancement.isChallenge ? "chat.challenge.task" : "chat.advancement.task", with: { rawtext: [{ text: player.name }, { translate: "advancements.billey." + advancement.name }] } }] });
    player.addTag("billeyadv_" + advancement.name);
    /** @type {string[]} */
    let completedPlayers = advancementPlayerCompletionOrder[advancement.name] ??= [];
    let xp = advancement.xp;
    if (completedPlayers.length)
        xp /= 2;
    player.addExperience(xp);
    playSound(player, "random.orb");
    const powerBananas = Math.floor(xp / XP_PER_POWER_BANANA);
    if (powerBananas) {
        const item = new ItemStack("billey:power_banana", powerBananas);
        player.dimension.spawnItem(item, player.location);
    }
    if (advancement.trophy) {
        const trophyItem = new ItemStack(advancement.trophy);
        trophyItem.setLore(["§r§b" + player.name]);
        trophyItem.setDynamicProperty("owner_name", player.name);
        player.dimension.spawnItem(
            trophyItem,
            player.location
        );
    }
    if (advancement.completionMessage)
        player.sendMessage({ rawtext: [{ text: "§7" }, { translate: advancement.completionMessage }] });
    completedPlayers.push(player.name);
    world.setDynamicProperty(
        "advancement_player_completion_order",
        JSON.stringify(advancementPlayerCompletionOrder)
    );
}

/**
 * @param {Entity} slimeWyvern 
 */
function slimeWyvernLevel10Advancement(slimeWyvern) {
    const player = slimeWyvern.getComponent("tameable").tamedToPlayer;
    if (!player?.isValid()) return;
    if (player.hasTag("billeyadv_slime_wyvern_level_10")) return;
    giveAdvancement(player, "slime_wyvern_level_10");
    slimeWyvern.addTag("billey:has_given_lvl10_adv");
}

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, id, message }) => {
    switch (id) {
        case "billey:advancement":
            if (!sourceEntity.isValid()) return;
            giveAdvancement(sourceEntity, message);
            break;
        case "billey:slime_wyvern_level_10":
            if (!sourceEntity.isValid()) return;
            slimeWyvernLevel10Advancement(sourceEntity);
            break;
    }
});

/**
 * @param {Player} player 
 */
export async function showAdvancementForm(player) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billey.advancements" });
    form.body({ translate: "ui.billey.advancements.body" });
    const advs = ADVANCEMENTS
        .filter(a => !a.isHidden || player.hasTag("billeyadv_" + a.name))
        .sort((a, b) => {
            const aIsCompleted = player.hasTag("billeyadv_" + a.name);
            const bIsCompleted = player.hasTag("billeyadv_" + b.name);
            return aIsCompleted - bIsCompleted;
            //subtracting booleans turns them to numbers before subtracting them
        });
    for (const a of advs) {
        const isCompleted = player.hasTag("billeyadv_" + a.name);
        /** @type {import("@minecraft/server").RawMessage[]} */
        let rawText = [{ translate: "advancements.billey." + a.name }];
        if (isCompleted)
            rawText = [
                ...rawText,
                { text: "\n" },
                { translate: "ui.billey.advancements." + (isCompleted ? "completed" : "not_completed") }
            ];
        form.button(
            {
                rawtext: rawText
            },
            a.icon
        );
    }
    form.button({ translate: "gui.back" });
    const { selection, canceled } = await form.show(player);
    if (canceled) return;
    if (selection == advs.length)
        return showInfoBookForm(player);
    const adv = advs[selection * 1];
    const form2 = new ActionFormData();
    form2.title({ translate: "advancements.billey." + adv.name });
    /** @type {string[]} */
    const completedPlayerNames = advancementPlayerCompletionOrder[adv.name];
    let rankText = "";
    for (let i = 0; i < completedPlayerNames.length; i++) {
        const color = MEDAL_COLORS[i] ?? "§7";
        rankText += `\n${color} ${i + 1}.§r ${completedPlayerNames[i]}`;
    }
    const isCompleted = player.hasTag("billeyadv_" + adv.name);
    /** @type {import("@minecraft/server").RawMessage[]} */
    let rawText = [
        { translate: `advancements.billey.${adv.name}.desc` },
        { text: "\n\n" },
        { translate: "advancements.billey.info.rewards" },
        {
            translate: "advancements.billey.info.rewards.xp",
            with: ["\n", adv.xp.toString()]
        }
    ];
    const powerBananas = Math.floor(adv.xp / XP_PER_POWER_BANANA);
    if (powerBananas)
        rawText = [
            ...rawText,
            {
                translate: "advancements.billey.info.rewards.bananas",
                with: ["\n", powerBananas.toString()]
            }
        ];
    if (adv.trophy)
        rawText = [
            ...rawText,
            {
                translate: "advancements.billey.info.rewards.item",
                with: {
                    rawtext: [
                        { text: "\n" },
                        translateItem(adv.trophy)
                    ]
                }
            }
        ];
    if (adv.isHidden)
        rawText = [
            ...rawText,
            { text: "\n\n§e" },
            { translate: "advancements.billey.info.is_hidden" }
        ];
    else if (isCompleted)
        rawText = [
            ...rawText,
            { text: "\n\n§a" },
            { translate: "advancements.billey.info.is_completed" }
        ];
    if (rankText)
        rawText = [
            ...rawText,
            { text: "\n\n§r" },
            { translate: "advancements.billey.info.players_who_have_completed" },
            { text: rankText }
        ];
    else
        rawText = [
            ...rawText,
            { text: "\n\n§e" },
            { translate: "advancements.billey.info.be_the_first" }
        ];
    form2.body({
        rawtext: rawText
    });
    form2.button({ translate: "gui.back" });
    form2.button({ translate: "gui.exit" });
    const { selection: selection2 } = await form2.show(player);
    if (selection2 === 0)
        showAdvancementForm(player);
}

system.run(() => {
    const lol = world.getDynamicProperty("advancement_player_completion_order");
    if (lol)
        advancementPlayerCompletionOrder = JSON.parse(lol);
    else {
        ADVANCEMENTS.forEach(adv => {
            advancementPlayerCompletionOrder[adv.name] = [];
        });
        world.setDynamicProperty(
            "advancement_player_completion_order",
            JSON.stringify(advancementPlayerCompletionOrder)
        );
    }
});

// i hate ziggers👽👽👽