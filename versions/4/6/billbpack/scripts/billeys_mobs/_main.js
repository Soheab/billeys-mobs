import { world, system, GameMode, ItemStack, Player, EntityTypes } from '@minecraft/server';
import './food';
import './interactions';
import './shooters';
import './interval';
import './blocks';
import './swords';
import './projectiles';
import './infoBook';
import './pigeonMission';
import './advancements';
import './morph';
import { duckArmors, normalize, playSound, subtract } from './utility';
import { loadPiranhaLauncher } from './interactions';

/**
 * im aware that this file needs to be split into other files
 */

const debugMode = false;

if (debugMode) {
	world.afterEvents.dataDrivenEntityTrigger.subscribe(e => {
		if (e.eventId == "switch_movement") return;
		world.sendMessage("§e" +e.entity.typeId + " " + e.eventId)
	});
	system.afterEvents.scriptEventReceive.subscribe(e => {
		world.sendMessage("§a" +e.sourceEntity.typeId + " " + e.id + " " + e.message)
	});
}

let duckArmor = "";
let duckArmorerWasntInCreative = false;

let knockedEntity;

let parentColor = 0;
let otherParentColor = 0;
const variantToColor = {
	"billey:duck": [2, 5, 0, 1, 6, 3, 4, 7]
};

let ratParentVariant = 0;
let ratOtherParentVariant = 0;
let ratParentMarkVariant = 0;
let ratOtherParentMarkVariant = 0;

/**
 * @type {Player}
 */
let piranhaLoader;

system.afterEvents.scriptEventReceive.subscribe(data => {
	switch (data.id) {
		case "billey:add_script_tag":
			data.sourceEntity.addTag("billey_script_working");
			break;
		case "billey:handle_crossbreed":
			switch (data.message) {
				case "parent":
					const parentVariant = data.sourceEntity.getComponent("variant")?.value ?? 0;
					parentColor = variantToColor[data.sourceEntity.typeId][parentVariant];
					break;
				case "other":
					const otherParentVariant = data.sourceEntity.getComponent("variant")?.value ?? 0;
					otherParentColor = variantToColor[data.sourceEntity.typeId][otherParentVariant];
					break;
				case "baby":
					const random = Math.random();
					if (random > 0.5) var newColor = Math.ceil((parentColor + otherParentColor) / 2)
					else var newColor = Math.floor((parentColor + otherParentColor) / 2);
					const newVariant = variantToColor[data.sourceEntity.typeId].indexOf(newColor);
					data.sourceEntity.triggerEvent("set_variant" + newVariant);
					break;
			}
			break;
		case "billey:set_owner_name":
			data.sourceEntity.setDynamicProperty("owner_name", data.message);
			break;
		case "billey:set_knocked":
			knockedEntity = data.sourceEntity;
			break;
		case "billey:apply_knockback":
			let { x, z } = normalize(subtract(knockedEntity.location, data.sourceEntity.location));
			knockedEntity.applyKnockback(x, z, 1, 1);
			knockedEntity = undefined;
			break;
		case "billey:set_duck_armor":
			duckArmor = data.sourceEntity.getComponent("equippable").getEquipment("Mainhand")?.typeId
				?.replace("billey:", "")?.replace("_pet_armor", "");
			duckArmorerWasntInCreative = data.sourceEntity.getGameMode() != GameMode.creative;
			if (duckArmorerWasntInCreative && duckArmor && duckArmor != "minecraft:dirt")
				data.sourceEntity.getComponent("equippable").setEquipment("Mainhand", undefined);
			break;
		case "billey:duck_equip_armor":
			if (duckArmorerWasntInCreative)
				if (data.sourceEntity.getComponent("mark_variant")?.value) {
					let itemName = `billey:${duckArmors[data.sourceEntity.getComponent("mark_variant").value]}_pet_armor`;
					let item = new ItemStack(itemName);
					system.runTimeout(() => data.sourceEntity.dimension.spawnItem(item, data.sourceEntity.location), 1);
				}
			data.sourceEntity.triggerEvent("be" + duckArmor);
			break;
		case "billey:duck_drop_armor":
			if (duckArmorerWasntInCreative)
				if (data.sourceEntity.getComponent("mark_variant")?.value) {
					let itemName = `billey:${duckArmors[data.sourceEntity.getComponent("mark_variant").value]}_pet_armor`;
					let item = new ItemStack(itemName);
					system.runTimeout(() => data.sourceEntity.dimension.spawnItem(item, data.sourceEntity.location), 1);
				}
			break;
		case "billey:rat_minion_transform":
			if (!data.sourceEntity.isValid()) break;
			let l = data.sourceEntity.location;
			const minHeight = data.sourceEntity.dimension.heightRange.min;
			if (l.y < minHeight) l.y = minHeight + 1;
			if (world.structureManager.get(data.sourceEntity.getDynamicProperty("structure_id"))) {
				world.structureManager.place(data.sourceEntity.getDynamicProperty("structure_id"), data.sourceEntity.dimension, l);
				world.structureManager.delete(data.sourceEntity.getDynamicProperty("structure_id"));
				data.sourceEntity.remove();
			} else data.sourceEntity.kill();
			break;
		case "billey:handle_rat_crossbreed":
			//this ensures that the crossbred rat will look like a mix of its parents
			//and not identical to one of them as happened 50% of the time before this
			const rat = data.sourceEntity;
			switch (data.message) {
				case "parent":
					ratParentVariant = rat.getComponent("variant").value;
					ratParentMarkVariant = rat.getComponent("mark_variant").value;
					break;
				case "other":
					ratOtherParentVariant = rat.getComponent("variant").value;
					ratOtherParentMarkVariant = rat.getComponent("mark_variant").value;
					break;
				case "baby":
					if (ratParentVariant == rat.getComponent("variant").value)
						rat.getComponent("mark_variant").value = ratOtherParentMarkVariant;
					else if (ratOtherParentVariant == rat.getComponent("variant").value)
						rat.getComponent("mark_variant").value = ratParentMarkVariant;
					break;
			}
			break;
		case "billey:load_piranha_launcher_player":
			piranhaLoader = data.sourceEntity;
			break;
		case "billey:load_piranha_launcher_piranha":
			loadPiranhaLauncher(piranhaLoader, data.sourceEntity, piranhaLoader.getComponent("equippable").getEquipment("Mainhand"));
			playSound(piranhaLoader, "mob.cow.milk");
			piranhaLoader = undefined;
			break;
	}
});

world.afterEvents.entityRemove.subscribe(data => {
	if (data.typeId == "billey:rat_minion")
		world.structureManager.delete("billey:" + data.removedEntityId);
});

world.afterEvents.entityLoad.subscribe(({ entity }) => {
	if (entity.getDynamicProperty("center_on_load")) {
		entity.teleport({
			x: Math.floor(entity.location.x) + 0.5,
			y: Math.floor(entity.location.y),
			z: Math.floor(entity.location.z) + 0.5
		});
		entity.setDynamicProperty("center_on_load", undefined);
	}
	if (entity.getDynamicProperty("kill_on_load")) {
		entity.kill();
	}
});

system.beforeEvents.watchdogTerminate.subscribe(data => {
	data.cancel = true;
});

world.beforeEvents.chatSend.subscribe((data) => {
	if (data.message.startsWith("!run ")) {
		data.cancel = true;
		system.run(() => {
			data.sender.runCommandAsync(data.message.slice(5, undefined))
		})
	}
	else if (data.message.startsWith("!sayas ")) {
		data.cancel = true;
		let message = "";
		data.message.split(" ").forEach((x, index) => {
			if (index > 1) {
				message += " " + x;
			}
			index++;
		});
		system.run(() => {
			world.sendMessage("<" + data.message.split(" ")[1] + ">" + message)
		})
	}
	else if (data.message.startsWith("!raw ")) {
		data.cancel = true;
		system.run(() => {
			world.sendMessage(data.message.slice(5, undefined))
		})
	}
	else if (data.message.startsWith("!lore ")) {
		data.cancel = true;
		system.run(() => {
			let item = data.sender.getComponent("equippable").getEquipment("Mainhand");
			item.setLore([data.message.slice(6, undefined)]);
			data.sender.getComponent("equippable").setEquipment("Mainhand", item);
		})
	}
	else if (data.message == "!ket") {
		data.cancel = true;
		system.run(() => {
			data.sender.runCommandAsync("kill @e[tag=!tamed]")
		})
	}
	else if (data.message == "!removebilleytags") {
		data.cancel = true;
		system.run(() => {
			data.sender.getTags().forEach(tag => {
				if (tag.includes("billey")) data.sender.removeTag(tag);
			});
		})
	}
});