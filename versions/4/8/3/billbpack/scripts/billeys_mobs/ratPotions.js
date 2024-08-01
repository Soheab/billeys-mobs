import { Entity, Player, world, system } from "@minecraft/server";
import { playSound } from "./utility";

/**
 * @param {Entity} projectile
 */
function ratPotionOnHit(projectile) {
	switch (projectile.typeId) {
		case "billey:rat_potion": {
			if (!projectile.isValid()) return;
			const maxHeight = projectile.dimension.heightRange.max;
			if (projectile.location.y + 5 > maxHeight) return;
			const ofRatKing = projectile.getDynamicProperty("of_rat_king");
			const mobs = projectile.dimension.getEntities({
				location: projectile.location,
				maxDistance: ofRatKing ? 8 : 4,
				excludeTypes: ["minecraft:player", "minecraft:item", "minecraft:xp_orb", "billey:rat_minion"],
				excludeFamilies: ["boss", "rat", "inanimate"],
				closest: 5
			}).filter(mob => mob.getComponent("movement") && (
				ofRatKing
					? mob.typeId.startsWith("billey:")
					: !mob.getComponent("is_tamed")
			));
			/** check if the entity has the "movement" component to further ensure it's an actual mob,
			 *	and not a painting or something. */
			mobs.forEach(mob => {
				if ((mob.getComponent("health").effectiveMax >= 100) && !ofRatKing) return;
				if (mob.location.y + 5 > maxHeight) return;
				if (mob.location.y - 1 < projectile.dimension.heightRange.min) return;
				let rat = projectile.dimension.spawnEntity("billey:rat_minion", mob.location);
				rat.triggerEvent("from_potion");
				rat.nameTag = mob.nameTag || "§7" + mob.typeId.split(":")[1].replaceAll("_", " ");
				rat.setRotation(mob.getRotation());
				//teleport the mob up there so the structure will (hopefully) only contain it
				mob.teleport({
					x: Math.floor(mob.location.x) + 0.5,
					y: maxHeight - 1, //not sure if the -1 is needed
					z: Math.floor(mob.location.z) + 0.5
				});
				if (ofRatKing)
					mob.setDynamicProperty("looking_for_owner", true);
				else if (mob.getComponent("health").currentValue < 20 && mob.getComponent("health").currentValue < mob.getComponent("health").effectiveMax)
					mob.setDynamicProperty("kill_on_load", true);
				world.structureManager.createFromWorld("billey:" + rat.id, mob.dimension, mob.location, mob.location, { includeBlocks: false });
				mob.remove();
			});
			playSound(projectile, "random.glass");
			if (ofRatKing)
				projectile.dimension.getEntities({
					location: projectile.location,
					type: "billey:rat_king",
					closest: 1
				})[0]?.setDynamicProperty("has_been_hit_by_billeymob", false);
			projectile.remove();
			return;
		}
		case "billey:rat_king_boost_potion": {
			if (!projectile.isValid()) return;
			const king = projectile.dimension.getEntities({
				location: projectile.location,
				type: "billey:rat_king",
				closest: 1
			})[0];
			if (!king) return;
			const health = king.getComponent("health");
			health.setCurrentValue(health.currentValue + 10);
			king.addEffect("regeneration", 5 * 20, { amplifier: 3 });
			king.addEffect("speed", 5 * 20, { amplifier: 1 });
			king.addEffect("strength", 5 * 20, { amplifier: 1 });
			playSound(projectile, "random.glass");
			projectile.remove();
			return;
		}
		case "billey:rat_king_deter_potion": {
			if (!projectile.isValid()) return;
			const mobs = projectile.dimension.getEntities({
				location: projectile.location,
				maxDistance: 6,
				excludeTypes: ["minecraft:item", "minecraft:xp_orb", "billey:rat_minion"],
				excludeFamilies: ["inanimate", "rat"]
			}).filter(mob => mob.getComponent("movement") &&
				(mob.getComponent("is_tamed") || mob instanceof Player)
			);
			const king = projectile.dimension.getEntities({
				location: projectile.location,
				type: "billey:rat_king",
				closest: 1
			})[0];
			if (!king) return;
			mobs.forEach(mob => {
				mob.applyDamage(16, {
					damagingEntity: king,
					cause: "entityAttack"
				});
				mob.addEffect("wither", 3 * 20, { amplifier: 2 });
				mob.addEffect("slowness", 5 * 20, { amplifier: 1 });
				mob.addEffect("weakness", 5 * 20, { amplifier: 1 });
			});
			playSound(projectile, "random.glass");
			projectile.remove();
			return;
		}
	}
}

world.afterEvents.projectileHitEntity.subscribe(({ projectile }) => ratPotionOnHit(projectile));
world.afterEvents.projectileHitBlock.subscribe(({ projectile }) => ratPotionOnHit(projectile));

world.afterEvents.entityLoad.subscribe(({ entity }) => {
	/*if (entity.getDynamicProperty("center_on_load")) {
		entity.teleport({
			x: Math.floor(entity.location.x) + 0.5,
			y: Math.floor(entity.location.y),
			z: Math.floor(entity.location.z) + 0.5
		});
		entity.setDynamicProperty("center_on_load", undefined);
	}*/
	if (entity.getDynamicProperty("kill_on_load"))
		entity.kill();
	if (entity.getDynamicProperty("looking_for_owner")) {
		const id = entity.getDynamicProperty("owner_id");
		const name = entity.getDynamicProperty("owner_name");
		const players = world.getAllPlayers();
		let player = players.find(p => p.id == id);
		if (player) {
			entity.getComponent("tameable").tame(player);
			entity.setDynamicProperty("looking_for_owner", undefined);
		}
		else {
			player = players.find(p => p.name == name);
			if (player) {
				entity.getComponent("tameable").tame(player);
				entity.setDynamicProperty("looking_for_owner", undefined);
			}
		}
		/*
		Some mobs sat when turning back into themselves 
		after the rat king turning them into a rat, which might make some people
		think their pet disappeared.
		The 2 lines below make the pet stand up
		*/
		system.run(() => {
			entity.triggerEvent("remove_sittable");
			system.run(() => entity.triggerEvent("add_sittable"))
		});
	}
});

world.afterEvents.playerSpawn.subscribe(({ player }) => {
	player.dimension.getEntities(
		{
			excludeFamilies: ["inanimate"]
		}
	).forEach(entity => {
		if (!entity.typeId.startsWith("billey:")) return;
		if (!entity.getDynamicProperty("looking_for_owner")) return;
		if (entity.getDynamicProperty("owner_id") == player.id) {
			entity.getComponent("tameable").tame(player);
			entity.setDynamicProperty("looking_for_owner", undefined);
		}
		if (entity.getDynamicProperty("owner_name") == player.name) {
			entity.getComponent("tameable").tame(player);
			entity.setDynamicProperty("looking_for_owner", undefined);
		}
	});
});