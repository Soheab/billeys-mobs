import { world, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { showAdvancementForm } from "./advancements";

/**
 * @type {{id: string; category: string[] | string;}[]}
 */
const billeysMobs = [
	{
		id: "anglerfish",
		category: "water"
	},
	{
		id: "zombie_cat",
		category: "cat"
	},
	{
		id: "skeleton_cat",
		category: "cat"
	},
	{
		id: "swordfish",
		category: "water"
	},
	{
		id: "mercat",
		category: ["cat", "water"]
	},
	{
		id: "pigeon",
		category: ["dinosaur", "recommended"]
	},
	{
		id: "pizzafish",
		category: "water"
	},
	{
		id: "gwshark",
		category: "water"
	},
	{
		id: "endercat",
		category: "cat"
	},
	{
		id: "flyingcat",
		category: "cat"
	},
	{
		id: "endflyingcat",
		category: "cat"
	},
	{
		id: "picklepet",
		category: "water"
	},
	{
		id: "duck",
		category: "dinosaur"
	},
	{
		id: "penguin",
		category: "dinosaur"
	},
	{
		id: "piranha",
		category: ["water", "recommended"]
	},
	{
		id: "banana_duck",
		category: "dinosaur"
	},
	{
		id: "cucumbeel",
		category: "water"
	},
	{
		id: "pickle_cat",
		category: "cat"
	},
	{
		id: "velvet_worm",
		category: "other"
	},
	{
		id: "hamster",
		category: "other"
	},
	{
		id: "catfish",
		category: "water"
	},
	{
		id: "hammerhead_shark",
		category: "water"
	},
	{
		id: "kiwi",
		category: "dinosaur"
	},
	{
		id: "duck_centipede",
		category: "boss"
	},
	{
		id: "betta_fish",
		category: "water"
	},
	{
		id: "electric_eel",
		category: ["water", "recommended"]
	},
	{
		id: "orange_penguin",
		category: "dinosaur"
	},
	{
		id: "goose",
		category: "dinosaur"
	},
	{
		id: "terraphin",
		category: "other"
	},
	{
		id: "mergoose",
		category: ["dinosaur", "water", "recommended"]
	},
	{
		id: "woodlouse",
		category: "other"
	},
	{
		id: "deinonychus",
		category: "dinosaur"
	},
	{
		id: "yutyrannus",
		category: "dinosaur"
	},
	{
		id: "stick_bug",
		category: ["other", "recommended"]
	},
	{
		id: "rat",
		category: "other"
	},
	{
		id: "netherrat",
		category: "other"
	},
	{
		id: "slime_wyvern",
		category: "other"
	},
	{
		id: "tiktaalik",
		category: ["other", "water", "recommended"]
	},
	{
		id: "rat_king",
		category: ["boss", "recommended"]
	},
	/*this list is mostly in the order the mobs were added
	but i didn't want snails and angel pigs to be so high up
	because they are shitty looking and goofy respectively.*/
	{
		id: "flyingpig",
		category: "other"
	},
	{
		id: "snail",
		category: "other"
	}
];

const categories = [
	"recommended",
	"dinosaur",
	"other",
	"water",
	"boss",
	//"advancement",
	"cat"
];

const tipCount = 8;

world.afterEvents.playerSpawn.subscribe(({ player }) => {
	if (!player.getDynamicProperty("got_info_book")) {
		player.setDynamicProperty("got_info_book", true);
		const item = new ItemStack("billey:info_book");
		item.keepOnDeath = true;
		player.dimension.spawnItem(item, player.location);
	}
});

world.afterEvents.itemUse.subscribe(({ itemStack, source: player }) => {
	if (itemStack.typeId == "billey:info_book") {
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
			}, "textures/billey_icons/" + c);
		});
		form.show(player).then(({ canceled, selection }) => {
			if (!canceled) {
				/**
				 * @type {string}
				*/
				const c = categories[selection];

				//if the player chose advancements then stop this lambda
				//and show the advancement form instead
				if (c == "advancement")
					return showAdvancementForm(player);

				const mobs = billeysMobs.filter(mob => {
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
				form.show(player).then(({ canceled, selection }) => {
					if (!canceled) {
						/** 
						 * @type {string}
						 */
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
					}
				});
			}
		});
	}
});