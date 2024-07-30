//file currently completely unused
import { world, system, ItemStack, Player } from '@minecraft/server';
import { ActionFormData, FormResponse } from '@minecraft/server-ui';
import { playSound } from './utility';

const advancements = [
    {
        name: "golden_duck",
        icon: "textures/billey_icons/duck",
        xp: 50,
        powerBananas: 5,
        isChallenge: false
    },
    {
        name: "bduckbreeder",
        icon: "textures/billey_icons/banana_duck",
        xp: 10,
        powerBananas: 1,
        isChallenge: false,
        completionMessage: "chat.billeyornithologistinfo"
    },
    {
        name: "ornithologist",
        icon: "textures/billey_icons/banana_duck",
        xp: 100,
        powerBananas: 10,
        isChallenge: true
    },
    {
        name: "feathered_warrior",
        icon: "textures/billeyitems/billduckiron",
        xp: 10,
        powerBananas: 1,
        isChallenge: false,
        completionMessage: "chat.billeyduckarmyinfo"
    },
    {
        name: "feathered_army",
        icon: "textures/billeyitems/billduckdiamond",
        xp: 200,
        powerBananas: 20,
        isChallenge: true
    },
    {
        name: "ratatouille",
        icon: "textures/billeyitems/ratatouile",
        xp: 10,
        powerBananas: 1,
        isChallenge: false,
        completionMessage: "chat.billey.ratxd"
    },
    {
        name: "chocolate_catfish",
        icon: "textures/billeyitems/lefisheauchocolat",
        xp: 10,
        powerBananas: 1,
        isChallenge: false,
        completionMessage: "chat.billcatfishpizza"
    },
    {
        name: "killcenti",
        icon: "textures/billey_icons/duck",
        xp: 20,
        powerBananas: 2,
        isChallenge: false
    }
];

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity: player, id, message }) => {
    if (id != "billey:advancement") return;
    if (!(player instanceof Player))
        return world.sendMessage(`§cError: Billey's Mobs advancements can only be given to players. Attempted to give ${message} to ${player.typeId}.`);

    const advancement = advancements.find(a => a.name == message);
    if (!advancement)
        return world.sendMessage(`§cError: Failed to give Billey's Mobs advancement "${message}" to ${player.name}. Advancement of name "${message}" not found.`);

    world.sendMessage({ rawtext: [{ translate: advancement.isChallenge ? "chat.challenge.task" : "chat.advancement.task", with: { rawtext: [{ text: player.name }, { translate: "advancements.billey." + advancement.name }] } }] });

    player.addTag("billeyadv_" + advancement.name);
    player.addExperience(advancement.xp);
    playSound(player, "random.orb");
    if (advancement.powerBananas) {
        const item = new ItemStack("billey:power_banana", advancement.powerBananas);
        player.dimension.spawnItem(item, player.location);
    }
    if (advancement.completionMessage)
        player.sendMessage({ rawtext: [{ text: "§7" }, { translate: advancement.completionMessage }] });
});

/**
 * @param {Player} player 
 */
export function showAdvancementForm(player) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billey.advancements" });
    form.body({ translate: "ui.billey.advancements.body" });
    const advs = advancements.sort((a, b) => {
        const aIsCompleted = player.hasTag("billeyadv_" + a.name);
        const bIsCompleted = player.hasTag("billeyadv_" + b.name);
        return Number(aIsCompleted) - Number(bIsCompleted);
    });
    advs.forEach(a => {
        const isCompleted = player.hasTag("billeyadv_" + a.name)
        form.button(
            {
                rawtext: [
                    { translate: "advancements.billey." + a.name },
                    { text: "\n§r§8" },
                    { translate: "ui.billey.advancements." + (isCompleted ? "completed" : "not_completed") }
                ]
            }
        );
    });
    form.show(player).then(({ selection, canceled }) => {
        if (canceled) return;
        const adv = advs[selection];
        const form = new ActionFormData();
    });
}