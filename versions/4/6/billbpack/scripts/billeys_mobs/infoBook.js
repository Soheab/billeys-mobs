import { world, ItemStack } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { showAdvancementForm } from './advancements';

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
		category: "dinosaur"
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
		category: "water"
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
		id: "betta_fish",
		category: "water"
	},
	{
		id: "electric_eel",
		category: "water"
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
		category: ["dinosaur", "water"]
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
		category: "other"
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
		category: ["other", "water"]
	},
	//this list is mostly in the order the mobs were added
	//but i didn't want snails and angel pigs to be so high up
	//because they are shitty looking and goofy respectively.
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
	"dinosaur",
	"other",
	"water",
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
		form.title({ translate: "ui.billeyinfo.title" });
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
					form.button({ translate: `entity.billey:${mob.id}.name` },
						"textures/billey_icons/" + mob.id);
				});
				form.show(player).then(({ canceled, selection }) => {
					if (!canceled) {
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
						const randomTipNumber = Math.floor(Math.random() * tipCount) + 1;
						player.sendMessage({
							rawtext: [
								{ text: "\n" },
								{ translate: "chat.billeyinfo.tip" + randomTipNumber.toString() },
								{ text: "\n\n§fOpen the chat to read " },
								{ translate: `entity.billey:${mob.id}.name` },
								{ text: "'s info." }
							]
						});
					}
				});
			}
		});
	}
});