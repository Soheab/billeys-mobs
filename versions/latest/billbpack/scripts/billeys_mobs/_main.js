import { world, system, Player, ItemStack } from "@minecraft/server";
import "./food";
import "./interactions";
import "./shooters";
import "./interval";
import "./blocks";
import "./swords";
import "./rat_potions";
import "./info_book";
import "./pigeon_mission";
import "./advancements";
import "./morph";
import "./rat_king";
import "./better_pet_owner_saving";
import "./pet_equipment/_index";
import "./catfish_syringe";
import "./pygmy_dunkleosteus";
import "./quality_of_life";
import "./plushies";
import "./roasts";
import "./duckatrice";
import "./leveling";
import { playSound } from "./utility";
import { loadPiranhaLauncher } from "./interactions";
import { addOwnerAsDynamicProperty } from "./better_pet_owner_saving";

//im aware that this file needs to be split into other files

const DEBUG_MODE = false;

if (DEBUG_MODE) {
	world.sendMessage("<Billey's Mobs> §eDebug Mode!");
	const insignificantEvents = ["switch_movement", "add_sittable", "remove_sittable", "minecraft:entity_spawned"];
	const insignificantScriptEvents = ["billey:add_script_tag"];
	world.afterEvents.dataDrivenEntityTrigger.subscribe(e => {
		if (!insignificantEvents.includes(e.eventId))
			world.sendMessage("§e" + e.entity.typeId + "§f : §e" + e.eventId);
		const modifiers = e.getModifiers();
		/** @type {string[]} */
		let addedComponentGroups = [];
		modifiers.forEach(m => { addedComponentGroups = addedComponentGroups.concat(m.addedComponentGroups); })
		let removedComponentGroups = [];
		modifiers.forEach(m => { removedComponentGroups = removedComponentGroups.concat(m.removedComponentGroups); })
		e.entity.__componentGroups ??= [];
		e.entity.__componentGroups = e.entity.__componentGroups.filter(c => !removedComponentGroups.includes(c));
		addedComponentGroups.forEach(a => {
			if (!e.entity.__componentGroups.includes(a))
				e.entity.__componentGroups.push(a);
		});
	});
	system.afterEvents.scriptEventReceive.subscribe(e => {
		if (!insignificantScriptEvents.includes(e.id))
			world.sendMessage("§b" + e.sourceEntity.typeId + "§f : §b" + e.id + "§f : §b" + e.message);
	});
	world.afterEvents.entitySpawn.subscribe(e => {
		world.sendMessage("§f" + e.entity.typeId + "§7 : §f" + e.cause);
	});
	world.beforeEvents.playerInteractWithEntity.subscribe(({ player, target, itemStack }) => {
		if (itemStack?.typeId == "minecraft:blaze_rod")
			system.run(() => {
				player.sendMessage("§6" + JSON.stringify(target.__componentGroups));
			});
	});
}

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
	if (eventId == "minecraft:ageable_grow_up")
		playSound(entity, "billey.grow");
});

let parentColor = 0;
let otherParentColor = 0;
const variantToColor = {
	"billey:duck": [2, 5, 0, 1, 6, 3, 4, 7]
};

let ratParentVariant = 0;
let ratOtherParentVariant = 0;
let ratParentMarkVariant = 0;
let ratOtherParentMarkVariant = 0;

/** @type {Player} */
let piranhaLoader;

system.afterEvents.scriptEventReceive.subscribe(data => {
	if (!data.sourceEntity?.isValid()) return;
	switch (data.id) {
		case "billey:add_script_tag":
			data.sourceEntity.addTag("billey_script_working");
			break;
		case "billey:tame_to_nearest_player":
			system.run(() => {
				data.sourceEntity.getComponent("tameable").tame(
					data.sourceEntity.dimension.getEntities({
						type: "minecraft:player",
						closest: 1
					})[0]
				);
				addOwnerAsDynamicProperty(data.sourceEntity);
			});
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
		case "billey:handle_rat_crossbreed":
			//this ensures that the crossbred rat will always look like a mix of its parents
			//and not identical to one of them as happened 50% of the time before this script
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
	else if (data.message == "!givebilleyinfobook") {
		data.cancel = true;
		system.run(() => {
			const container = data.sender.getComponent("inventory").container;
			if (container.emptySlotsCount)
				container.addItem(new ItemStack("billey:info_book"));
			else
				data.sender.sendMessage("§cThere are no empty slots in your inventory.");
		})
	}
	else if (data.message == "!resetinfobook") {
		data.cancel = true;
		system.run(() => {
			data.sender.setDynamicProperty("got_info_book2", undefined);
		})
	}
});