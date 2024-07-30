import { Entity, world } from '@minecraft/server';
import { playSound } from './utility';

/**
 * @param {Entity} projectile
 */
function projectileOnHit(projectile) {
	switch (projectile.typeId) {
		case "billey:rat_potion":
			if (!projectile.isValid()) break;
			const maxHeight = projectile.dimension.heightRange.max;
			if (projectile.location.y + 5 > maxHeight) break;
			let mobs = projectile.dimension.getEntities({
				location: projectile.location,
				maxDistance: 3.5,
				excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:xp_orb", "billey:rat_minion"],
				excludeFamilies: ["inanimate", "rat"],
				closest: 5
			}).filter(mob => mob.getComponent("movement") && !mob.getComponent("is_tamed"));
			/** check if the entity has the "movement" component to further ensure it's an actual mob,
			 *	and not a painting or something. */
			mobs.forEach(mob => {
				if ((mob.getComponent("health").effectiveMax >= 100)) return;
				if (mob.location.y + 5 > maxHeight) return;
				if (mob.location.y -1 < projectile.dimension.heightRange.min) return;
				let rat = projectile.dimension.spawnEntity("billey:rat_minion", mob.location);
				rat.setDynamicProperty("structure_id", "billey:" + rat.id);
				rat.triggerEvent("from_potion");
				rat.nameTag = mob.nameTag ? mob.nameTag
					: "§7" + mob.typeId.split(":")[1].replaceAll("_", " ");
				rat.setRotation(mob.getRotation());
				//teleport the mob up there so the structure will (probably) only contain it
				mob.teleport({
					x: Math.floor(mob.location.x),
					y: maxHeight - 1,
					z: Math.floor(mob.location.z)
				});
				if (mob.getComponent("health").currentValue < 20 && mob.getComponent("health").currentValue < mob.getComponent("health").effectiveMax)
					mob.setDynamicProperty("kill_on_load", true);
				mob.setDynamicProperty("center_on_load", true);
				world.structureManager.createFromWorld("billey:" + rat.id, mob.dimension, mob.location, mob.location, { includeBlocks: false });
				mob.remove();
			});
			playSound(projectile, "random.glass");
			projectile.remove();
			break;
	}
}

world.afterEvents.projectileHitEntity.subscribe(({ projectile }) => projectileOnHit(projectile));
world.afterEvents.projectileHitBlock.subscribe(({ projectile }) => projectileOnHit(projectile));