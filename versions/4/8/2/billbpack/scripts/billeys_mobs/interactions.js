import { world, ItemStack, system, GameMode, Entity, Player } from '@minecraft/server';
import { addItemToPigeon, pigeonUI } from './pigeonMission';

const lvl10XP = 10 * 810 //xp_level10

world.beforeEvents.playerInteractWithEntity.subscribe(data => {
	let mob = data.target;
	let player = data.player;
	let dimension = player.dimension;
	let item = data.itemStack;
	if (!item) {
		if (player.isSneaking && mob.typeId.startsWith("billey:") && mob.getComponent("is_tamed")) {
			data.cancel = true;
			system.run(() => {
				player.playAnimation("animation.billeyplayer.pet");
				mob.triggerEvent("bepetted");
				if (mob.typeId.includes("cat")) dimension.playSound("mob.cat.purr", mob.location);
				if (mob.typeId == "billey:pigeon" && mob.getProperty("billey:has_backpack")
					&& player.name == mob.getDynamicProperty("owner_name")) {
					pigeonUI(player, mob, dimension);
				}
			});
		}
	}
	else if (player.isSneaking && mob.typeId == "billey:pigeon" && mob.getProperty("billey:has_backpack")
		&& player.name == mob.getDynamicProperty("owner_name")) {
		data.cancel = true;
		system.run(() => {
			addItemToPigeon(player, mob, item, dimension);
		})
	}
	else if (item.typeId == "billey:pigeon_backpack" && mob.typeId == "billey:pigeon"
		&& mob.getProperty("billey:has_backpack") && player.name == mob.getDynamicProperty("owner_name")) {
		let container = mob.getComponent("inventory").container;
		let items = [];
		for (let index = 0; index < container.size; index++) {
			let λ = container.getItem(index);
			if (λ) items.push(λ);
		}
		system.run(() => {
			items.forEach(ξ => dimension.spawnItem(ξ, mob.location));
		})
	}
	else if (item.typeId == "minecraft:leather" && mob.hasComponent("is_tamed")) {
		//this was the very first thing i did with scripts so it's shittily done
		//if you're reading this then i forgot to improve it
		data.cancel = mob.typeId.startsWith("billey:");
		if (mob.nameTag == "") {
			player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"\\n§d\"},{\"translate\":\"entity." + mob.typeId + ".name" + "\"}]}");
		} else {
			player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"\\n§d" + mob.nameTag + "\"}]}");
		}
		if (mob.typeId.startsWith("billey:") && mob.getComponent("is_tamed"))
			player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"Owner:§9 " +
		 mob.getDynamicProperty("owner_name") + "\"}]}");
		let currentXP = Math.floor(10 * mob.getProperty("billey:xp"));
		let level = mob.getProperty("billey:level");
		player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"Health:§9 " + Math.floor(mob.getComponent("health").currentValue) + " / " + mob.getComponent("health").effectiveMax + "\"}]}");
		let levelText = level?.toString();
		let nextXP = 100 * Math.floor(3 * level ** 1.5);
		if (level < 10) {
			player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"XP:§9 " + currentXP + "\"}]}");
			player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"XP required for Level " + (level + 1) + ":§a " + nextXP + " §7(" + (nextXP - currentXP) + " left)" + "\"}]}");
			player.runCommandAsync("tellraw @s {\"rawtext\":[{\"text\":\"XP required for Level 10" + ":§a " + lvl10XP + " §7(" + (lvl10XP - currentXP) + " left)" + "\"}]}");
		}
		//player.runCommandAsync("tellraw @s {\"rawtext\":[{\"translate\":\"chat.billey.not_levelable\"}]}");
	}
	else if (item.typeId.startsWith("billey:to_level") && mob.getProperty("billey:level")
		&& mob.hasComponent("is_tamed") && !mob.hasComponent("is_baby")) {
		data.cancel = true;
		system.run(() => {
			mob.triggerEvent(item.typeId.slice(7));
			if (player.getGameMode() != GameMode.creative)
				player.getComponent("equippable").setEquipment("Mainhand", undefined);
		});
	}/*
	const mobWasntTamed = !mob.getComponent("is_tamed");
	system.run(() => {
		if (mobWasntTamed && mob.getComponent("is_tamed")) {
			mob.setDynamicProperty("owner_name", player.name);
			mob.setDynamicProperty("owner_id", player.id);
		}
	});*/
});

/**
 * @param {Player} player 
 * @param {Entity} piranha 
 * @param {ItemStack} item 
 */
export function loadPiranhaLauncher(player, piranha, item) {
	if (item.typeId == "billey:piranha_launcher") {
		let name = item.nameTag;
		let durability = item.getComponent("durability").damage;
		let enchantments = item.getComponent("enchantable").getEnchantments();
		item = new ItemStack("billey:loaded_piranha_launcher");
		item.getComponent("durability").damage = durability;
		item.setLore(["0"]);
		item.getComponent("enchantable").addEnchantments(enchantments);
		item.nameTag = name;
	}
	else if (!item.getLore().length) item.setLore(["1"]);
	if (item.getLore() * 1 < 64) {
		item.setLore([(item.getLore() * 1 + 1).toString()]);
		player.getComponent("equippable").setEquipment("Mainhand", item);
		player.startItemCooldown("piranha_launcher", 20);
		piranha.remove();
	} else player.sendMessage({ translate: "chat.billey.piranha64" });
}

world.afterEvents.playerInteractWithEntity.subscribe((data) => {
	let item = data.itemStack;
	if (!item) return;
	let mob = data.target;
	let player = data.player;
	if ((item.typeId == "billey:piranha_launcher" || item.typeId == "billey:loaded_piranha_launcher") && mob.typeId == "billey:piranha" && (mob.getComponent("is_tamed") === undefined || mob.getComponent("variant").value != 2 || mob.hasTag("thrown_piranha"))) {
		loadPiranhaLauncher(player, mob, item);
	}
});