import { ItemStack, Player, Container, Dimension, Entity, system, DimensionTypes, world } from "@minecraft/server";

export const headPets = ["billey:rat", "billey:netherrat", "billey:slime_wyvern"];
export const ridePets = [...headPets, "billey:pigeon"];
export const trueBeneficialEffects = ["speed", "regeneration", "absorption", "night_vision", "water_breathing", "strength", "saturation", "fire_resistance", "conduit_power", "haste"];
export const beneficalEffects = [...trueBeneficialEffects, "jump_boost"];
export const detrimentalEffects = ["weakness", "hunger", "levitation", "blindness", "darkness", "instant_damage", "mining_fatigue", "nausea", "poison", "slowness", "wither"];
export const duckArmors = ["no", "leather", "golden", "chain", "iron", "diamond", "netherite", "endrod"];
export const DIMENSIONS = DimensionTypes.getAll().map(d => world.getDimension(d.typeId));

/**
 * @param {string} str 
 */
export function titleCase(str) {
	return str.replace(
		/\w\S*/g,
		text => text[0].toUpperCase() + text.slice(1).toLowerCase()
	);
}

/** 
 * @param {string} typeId 
 * @returns {import("@minecraft/server").RawMessage}
 */
export function translateItem(typeId) {
	if (typeId.startsWith("minecraft:"))
		return {
			translate: `item.${typeId.slice(10)}.name`
		};
	else
		return {
			translate: `item.${typeId}`
		};
}

/**
 * @param {ItemStack} item
 * Deprecated
 */
export function itemEnglishName(item) {
	return titleCase(item.typeId.replaceAll("_", " ").split(":")[1]);
}

/**
 * @param {Entity} entity 
 * @param {import('@minecraft/server').Vector3|undefined} y 
 */
export function validateHeightOf(entity, y) {
	y ??= entity.location.y;
	const { min, max } = entity.dimension.heightRange;
	return y > min && y < max;
}

/**
 * @param {Entity} entity 
 * @returns {import('@minecraft/server').RawMessage}
 */
export function nameOf(entity) {
	if (entity.nameTag)
		return {
			text: entity.nameTag
		};
	if (entity.typeId.startsWith("minecraft:"))
		return {
			translate: `entity.${entity.typeId.slice(10)}.name`
		};
	return {
		translate: `entity.${entity.typeId}.name`
	};
}

/** 
 * @param {number} min
 * @param {number} max
 * @param {number} value
 */
export function clamp(min, max, value) {
	if (value > max) return max;
	if (value < min) return min;
	return value;
}
/** 
 * @param {ItemStack} item
 * Calculate how much damage an item should take when used once, taking the unbreaking enchantment into account.
 */
export function calculateDamage(item) {
	if (item.getComponent("enchantable")?.hasEnchantment("unbreaking")) {
		return Math.random() < 1 / (1 + item.getComponent("enchantable").getEnchantment("unbreaking").level) ? 1 : 0;
	}
	return 1;
}
/** 
 * @param {Container} container
 * @param {Dimension} dimension
 * Drops all items of a container and then empties it.
 */
export function dropAll(container, dimension, location) {
	for (let index = 0; index < container.size; index++) {
		const item = container.getItem(index);
		if (item) dimension.spawnItem(item, location);
	}
	container.clearAll();
}
/** 
 * @param {Entity} entity
 * @param {string} sound
 * @param {import('@minecraft/server').WorldSoundOptions | undefined} options
 * Plays a sound at the location and dimension of an entity for all players.
 */
export function playSound(entity, sound, options) {
	entity.dimension.playSound(sound, entity.location, options);
};
/**
 * @param {Entity} entity
 * @param {string} projectileId
 * @param {number} power
 * Not used because setting owner didn't work, meaning neutral mobs 
 * wouldn't get mad at you when you shoot them.
 * 
 * Later comment: it works not but there's still no way to make
 * the player's hand swing with this so I'm keeping the other one
 */
export function shoot(entity, projectileId, power) {
	const location = add(entity.getHeadLocation(), entity.getViewDirection());
	const proj = entity.dimension.spawnEntity(projectileId, location);
	proj.getComponent("projectile").owner = entity;
	proj.getComponent("projectile").shoot(scale(entity.getViewDirection(), power));
};

/**
 * @param {Entity} entity
 * @param {number | undefined} amount
 */
export function damageItem(entity, amount) {
	let item = entity.getComponent("equippable").getEquipment("Mainhand");
	let damage = (amount ?? 1) * calculateDamage(item);
	if (item.getComponent("durability").damage + damage >= item.getComponent("durability").maxDurability) {
		entity.getComponent("equippable").setEquipment("Mainhand", undefined);
		playSound(entity, "random.break");
	}
	else item.getComponent("durability").damage += damage;
};

/**
 * @param {Player} player 
 * @returns True if the item stack was decremented to nothing(the player had 1 in their hand).
 */
export function decrementStack(player) {
	if (player.getGameMode() == "creative") return false;
	const slot = player.getComponent("equippable").getEquipmentSlot("Mainhand");
	let item = slot.getItem();
	if (item.amount == 1) item = undefined;
	else item.amount--;
	system.run(() => slot.setItem(item));
	return !item;
}

/**
 * @param {import("@minecraft/server").VectorXZ} vector1 
 * @param {import("@minecraft/server").VectorXZ} vector2 
 */
export function getDistanceXZ({ x: x1, z: z1 }, { x: x2, z: z2 }) {
	return Math.hypot(x2 - x1, z2 - z1);
}

export function magnitude(vector) {
	return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}
/**
 * @returns {import('@minecraft/server').Vector3}
 */
export function normalize(vector) {
	let magnitude_ = magnitude(vector);
	if (!magnitude_) return vector;
	vector.x /= magnitude_;
	vector.y /= magnitude_;
	vector.z /= magnitude_;
	return vector;
}
export function scale(vector, scalar) {
	vector.x *= scalar;
	vector.y *= scalar;
	vector.z *= scalar;
	return vector;
}
export function subtract(vector1, vector2) {
	vector1.x -= vector2.x;
	vector1.y -= vector2.y;
	vector1.z -= vector2.z;
	return vector1;
}
export function add(vector1, vector2) {
	vector1.x += vector2.x;
	vector1.y += vector2.y;
	vector1.z += vector2.z;
	return vector1;
}

/**
 * @param {ItemStack} oldItem
 * @param {string} newTypeId
 * @returns {ItemStack} Returns the new item. This function doesn't make any changes to the old item.
 */
export function changeItemType(oldItem, newTypeId) {
	let newItem = new ItemStack(newTypeId, oldItem.amount);
	newItem.nameTag = oldItem.nameTag;
	newItem.getComponent("durability").damage = oldItem.getComponent("durability").damage;
	newItem.setLore(oldItem.getLore());
	newItem.getComponent("enchantable").addEnchantments(oldItem.getComponent("enchantable").getEnchantments());
	return newItem;
}

