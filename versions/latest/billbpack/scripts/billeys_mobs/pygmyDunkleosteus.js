import { world, system, EquipmentSlot, ContainerSlot, ItemStack } from "@minecraft/server";
import { decrementStack, itemEnglishName, nameOf, playSound, titleCase } from "./utility";

//This entire file is a fucking mess because I wanted to do it in an hour

/**
 * The durability of a single pygmy dunk scute
 */
const PYGMY_DUNK_SCUTE_DURABILITY = 100;
const ARMOR_SLOT_NAMES = [
	"Head",
	"Chest",
	"Legs",
	"Feet"
];
const REINFORCIBLE_ITEM_TYPE_IDS = [
	"billey:duck_hat",
	"minecraft:elytra",
	"minecraft:turtle_helmet",
	"minecraft:iron_helmet",
	"minecraft:iron_chestplate",
	"minecraft:iron_leggings",
	"minecraft:iron_boots"
];

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, id, message }) => {
	if (id != "billey:pygmy_dunk_set_mark_variant") return;
	const markVariant = sourceEntity.getComponent("mark_variant");
	const variantValue = sourceEntity.getComponent("variant").value;
	if (!message && (markVariant.value < variantValue * 7 || markVariant.value >= (variantValue + 1) * 7))
		return; //don't change the pattern if it's visible
	markVariant.value = (
		variantValue * 7
		+
		Math.floor(Math.random() * 7)
	);
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource: { damagingEntity } }) => {
	if (!damagingEntity) return;
	if (damagingEntity.typeId != "billey:pygmy_dunkleosteus"
		|| deadEntity.typeId != "billey:pizzafish")
		return;
	if (damagingEntity.getComponent("is_tamed")) return;
	const pizzafishOwner = deadEntity.getComponent("tameable").tamedToPlayer;
	if (!pizzafishOwner) {
		damagingEntity.dimension.getEntities({
			type: "minecraft:player",
			maxDistance: 4,
			location: damagingEntity.location,
			closest: 1
		})[0]
			?.sendMessage("§7The pizzafish was either not yours or not tamed");
		return;
	}
	damagingEntity.getComponent("tameable").tame(pizzafishOwner);
	pizzafishOwner.sendMessage(["§7You have tamed ", nameOf(damagingEntity)]);
});

world.afterEvents.itemUse.subscribe(({ source: player, itemStack }) => {
	if (itemStack.typeId != "billey:pygmy_dunkleosteus_scutes") return;
	const equippable = player.getComponent("equippable");
	let armorSlot;
	for (const slotName of ARMOR_SLOT_NAMES) {
		const armorSlot2 = equippable.getEquipmentSlot(slotName);
		if (armorSlot2?.hasItem()) {
			if (armorSlot2.getDynamicProperty("reinforcement"))
				continue;
			if (!REINFORCIBLE_ITEM_TYPE_IDS.includes(armorSlot2.typeId))
				continue;
			if (armorSlot?.hasItem())
				break;
			armorSlot = armorSlot2;
		}
	}
	if (!armorSlot) return;
	const newArmorItem = armorSlot.getItem();
	newArmorItem.setDynamicProperty("reinforcement", PYGMY_DUNK_SCUTE_DURABILITY);
	let color = "§f";
	if (newArmorItem.getComponent("enchantable").getEnchantments().length)
		color = "§b";
	if (newArmorItem.nameTag)
		newArmorItem.nameTag = `§r${color}Reinforced ${newArmorItem.nameTag}`;
	else
		newArmorItem.nameTag = `§r${color}Reinforced ${itemEnglishName(newArmorItem)}`;
	armorSlot.setItem(newArmorItem);
	decrementStack(player);
});

world.afterEvents.entityHurt.subscribe(
	({ hurtEntity, damage }) => {
		if (!hurtEntity.isValid()) return;
		let reinforcedArmorCount = 0;
		for (const slotName of ARMOR_SLOT_NAMES) {
			const armor = hurtEntity.getComponent("equippable").getEquipment(slotName);
			if (!armor) continue;
			if (armor.maxAmount != 1) continue;
			const reinforcementDurability = armor.getDynamicProperty("reinforcement");
			if (reinforcementDurability === undefined) continue;
			const newReinforcementDurability = reinforcementDurability - 1;
			if (newReinforcementDurability > 0)
				armor.setDynamicProperty("reinforcement", newReinforcementDurability);
			else {
				armor.setDynamicProperty("reinforcement", undefined);
				playSound(hurtEntity, "random.break", { pitch: 1.5 });
				let color = "§f";
				if (armor.getComponent("enchantable").getEnchantments().length)
					color = "§b";			
				if (armor.nameTag == `§r${color}Reinforced ${itemEnglishName(armor)}`)
					armor.nameTag = "";
				else
					armor.nameTag = armor.nameTag.slice(15);
			}
			hurtEntity.getComponent("equippable").setEquipment(slotName, armor);
			reinforcedArmorCount++;
		};
		if (!reinforcedArmorCount) return;
		const health = hurtEntity.getComponent("health");
		health.setCurrentValue(health.currentValue + damage * reinforcedArmorCount / 8);
	},
	{
		entityTypes: ["minecraft:player"] //just found out this is a thing, pretty cool
	}
);