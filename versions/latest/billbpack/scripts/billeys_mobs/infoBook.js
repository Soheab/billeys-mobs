import { world, ItemStack, Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { showAdvancementForm } from "./advancements";
import { BILLEYS_MOBS } from "./billeysMobsList";
import { showSettingForm } from "./qualityOfLife";

const categories = [
	"recommended",
	"dinosaur",
	"other",
	"water",
	"boss",
	"advancement",
	"settings",
	"cat"
];

const tipCount = 9;

world.afterEvents.playerSpawn.subscribe(({ player }) => {
	if (!player.getDynamicProperty("got_info_book")) {
		player.setDynamicProperty("got_info_book", true);
		const item = new ItemStack("billey:info_book");
		item.keepOnDeath = true;
		player.dimension.spawnItem(item, player.location);
	}
});

world.afterEvents.itemUse.subscribe(({ itemStack, source: player }) => {
	if (itemStack.typeId == "billey:info_book")
		showInfoBookForm(player);
});

/**
 * @param {Player} player 
 */
export function showInfoBookForm(player) {
	const form = new ActionFormData();
	form.title({ translate: "item.billey:info_book" });
	form.body({ translate: "ui.billeyinfo.body" });
	categories.forEach(c => {
		form.button({
			rawtext: [
				{ translate: "ui.billeyinfo.category." + c },
				{ text: "\n§r§8" },
				{ translate: `ui.billeyinfo.category.${c}.desc` },
			]
		}, c == "settings" ? "textures/ui/icon_setting" : "textures/billey_icons/" + c);
	});
	form.show(player).then(({ canceled, selection }) => {
		if (!canceled) {
			/**
			 * @type {string}
			*/
			const c = categories[selection];

			if (c == "advancement")
				return showAdvancementForm(player);
			if (c == "settings")
				return showSettingForm(player);

			const mobs = BILLEYS_MOBS.filter(mob => {
				if (mob.category instanceof Array)
					return mob.category.includes(c);
				else return mob.category == c;
			});
			const form = new ActionFormData();
			form.title({ translate: "ui.billeyinfo.category." + c });
			form.body({ translate: "ui.billeyinfo.select_mob" });
			mobs.forEach(mob => {
				form.button(
					{ translate: `entity.billey:${mob.id}.name` },
					"textures/billey_icons/" + mob.id
				);
			});
			form.button({translate: "gui.back"});
			form.show(player).then(({ canceled, selection }) => {
				if (canceled) 
					return;
				if (selection == mobs.length)
					return showInfoBookForm(player);
				/** @type {string} */
				const mob = mobs[selection * 1];
				player.sendMessage({
					rawtext: [
						{ text: "\n" },
						{
							translate: "chat.billeyinfo." + mob.id,
							with: ["\n"]
						}
					]
				});
				const tipNumber = player.getDynamicProperty("next_tip") ?? 1;
				player.sendMessage({
					rawtext: [
						{ text: "\n" },
						{ translate: "chat.billeyinfo.tip" + tipNumber },
						{ text: "\n\n§fOpen the chat to read " },
						{ translate: `entity.billey:${mob.id}.name` },
						{ text: "'s info." }
						/*as you can see i was originally going for everything to be
						translateable but eventually i gave up*/
					]
				});
				if (tipNumber == tipCount)
					player.setDynamicProperty("next_tip", 1);
				else
					player.setDynamicProperty("next_tip", tipNumber + 1);
			});
		}
	});
}