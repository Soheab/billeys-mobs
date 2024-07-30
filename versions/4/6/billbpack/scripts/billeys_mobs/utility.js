import { world, ItemStack, system, EquipmentSlot, Player, Container, Dimension, Entity } from '@minecraft/server';

export const headPets = ["billey:rat", "billey:netherrat", "billey:slime_wyvern"];
export const ridePets = ["billey:rat", "billey:netherrat", "billey:slime_wyvern", "billey:pigeon"];
export const beneficalEffects = ["speed", "regeneration", "absorption", "night_vision", "water_breathing", "strength", "saturation", "fire_resistance", "conduit_power", "jump_boost"];
export const trueBeneficialEffects = ["speed", "regeneration", "absorption", "night_vision", "water_breathing", "strength", "saturation", "fire_resistance", "conduit_power"];
export const duckArmors = ["no", "leather", "golden", "chain", "iron", "diamond", "netherite", "endrod"];

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
	} else return 1;
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

export function magnitude(vector) {
	return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}
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
