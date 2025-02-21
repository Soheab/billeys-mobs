import { world, system, EquipmentSlot, EntityDamageCause, Dimension } from "@minecraft/server";
import { subtract, getDistanceXZ, headPets, normalize, ridePets, scale, DIMENSIONS, validateHeightOf } from "./utility";
import { isMorph, morphTick } from "./morph";
import { /*removeWaystoneLoader,*/ tpAllFollowingPets } from "./quality_of_life";
import { decrementDuckatriceStares, duckatriceBossStare, duckatriceStareDamage } from "./duckatrice";

system.runInterval(() => {
	const { currentTick } = system;
	const players = world.getPlayers();
	for (const player of players) {
		if (!player.isValid()) continue;

		const playerEquippable = player.getComponent("equippable");

		if (
			player.__prevLoc //if is not undefined
			&& getDistanceXZ(player.location, player.__prevLoc) > 60
			&& player.__prevDimension.id == player.dimension.id
			&& validateHeightOf(player)
		) {
			player.dimension.spawnEntity("billey:chunk_loader2", player.__prevLoc);
			tpAllFollowingPets(player, true);
		}

		/*if (
			player.__waystoneLoader
			&&
			player.__prevLoc
			&&
			distanceXZ > 0.173
		) {
			removeWaystoneLoader(player);
		}*/

		player.__prevLoc = player.location;
		player.__prevDimension = player.dimension;

		if (player.isSneaking && !player.__wasSneaking) {
			if (
				player.__lastSneakTick
				&&
				player.__lastSneakTick + 10 >= system.currentTick
			) {
				tpAllFollowingPets(player, false);
			}
			player.__lastSneakTick = system.currentTick;
		}
		const underwaterMovement = player.getComponent("underwater_movement");
		if (playerEquippable.getEquipment("Chest")?.typeId == "billey:shark_chestplate" && player.isSwimming) {
			underwaterMovement.setCurrentValue(0.1);
			player.__hadSharkChestplate = true;
		}
		else if (player.__hadSharkChestplate) {
			underwaterMovement.resetToDefaultValue();
			player.__hadSharkChestplate = false;
		}

		const riders = player.getComponent("rideable").getRiders();
		for (const rider of riders) {
			if (!ridePets.includes(rider.typeId)) continue;
			if (rider.typeId == "billey:slime_wyvern") {
				if (riders.length > 1)
					rider.teleport(player.location);
			}
			else if (headPets.includes(rider.typeId))
				rider.setProperty(
					"billey:sit_on_head",
					riders.length < 2
				);
			if (player.isSneaking && player.isJumping)
				rider.teleport(player.location);
		}
		if (isMorph(player, "duck")) {
			morphTick(player, "duck"); //this looks kinda stupid, will change when more morphs come
		}

		const ride = player.getComponent("riding")?.entityRidingOn;
		if (
			ride
			&& ride.typeId == "billey:duckatrice"
			&& !ride.getProperty("billey:is_fly_attacking")
		) {
			if (!ride.isOnGround && !ride.isInWater) {
				let { x } = player.getRotation();
				x -= 10;
				x *= 2;
				ride.applyImpulse({ x: 0, y: 0.04 - x * 0.04 / 45, z: 0 });
			}
		}


		if (
			currentTick % 10 == 0
		) {
			//The player's ability after petting a pet duckatrice
			const playerHeadSlot = playerEquippable.getEquipmentSlot("Head");
			if (playerHeadSlot.getDynamicProperty("duckatrice_stares"))
				duckatriceStareDamage(playerHeadSlot, player);
		}
		if (
			currentTick % 5 == 0
		) {
			//The duckatrice boss's ability
			const raycast = player.getEntitiesFromViewDirection({
				families: ["duckatrice_boss"]
			})[0] ?? player.getEntitiesFromViewDirection({
				families: ["duck_minion_hostile"]
			})[0];
			player.__duckatriceStareTime ??= 0;
			if (raycast && playerEquippable.getEquipment("Head")?.typeId != "minecraft:carved_pumpkin") {
				duckatriceBossStare(player, raycast.entity);
			}
			else if (player.__duckatriceStareTime > 0)
				player.__duckatriceStareTime--;

			if (ride?.target == player && ride.typeId.startsWith("billey:"))
				player.teleport(player.location);
		}

		player.__wasSneaking = player.isSneaking;
		player.__wasJumping = player.isJumping;
	}
	for (const dimension of DIMENSIONS) {
		//this is for the mating animation, only rats have mating animations right now but more mobs will soon
		dimension.getEntities({ tags: ["in_love"], type: "billey:rat" }).forEach(mob => {
			mob.setProperty("billey:mob_nearby",
				dimension.getEntities({ location: mob.location, maxDistance: 1.2, type: "billey:rat", tags: ["in_love"] }).length > 1)
		});
	}
});

/*
function prettyVectorString(vector) {
	let result = "";
	if (vector.x >= 0)
		result += "+";
	result += vector.x.toFixed(5);
	result += " ";
	if (vector.y >= 0)
		result += "+";
	result += vector.y.toFixed(5);
	result += " ";
	if (vector.z >= 0)
		result += "+";
	result += vector.z.toFixed(5);
	return result;
}
	const duckatrice = dimension.getEntities().find(e => e.typeId != "minecraft:player");
		if (!duckatrice) continue;
		duckatrice.__prevVelocity ??= duckatrice.getVelocity();
		duckatrice.acceleration = subtract(duckatrice.getVelocity(), duckatrice.__prevVelocity);
		world.getAllPlayers().forEach(p => p.onScreenDisplay.setActionBar(`Position: ${prettyVectorString(duckatrice.location)}
Velocity: ${prettyVectorString(duckatrice.getVelocity())}
Acceleration: ${prettyVectorString(duckatrice.acceleration)}`
		));
		duckatrice.__prevVelocity = duckatrice.getVelocity();
	*/