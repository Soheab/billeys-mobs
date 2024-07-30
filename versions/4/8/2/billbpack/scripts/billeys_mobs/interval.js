import { world, system, EquipmentSlot, EntityDamageCause, Dimension } from '@minecraft/server';
import { add, headPets, normalize, ridePets, scale } from './utility';
import { isMorph, morphTick } from './morph';

system.runInterval(() => {
	const players = world.getPlayers();
	/**
	 * @type {Dimension[]}
	 */
	let dimensions = [];
	players.forEach(player => {
		if (player.isValid()) {
			if (!dimensions.includes(player.dimension)) dimensions.push(player.dimension);
			const underwaterMovement = player.getComponent("underwater_movement");
			if (player.getComponent("equippable").getEquipment("Chest")?.typeId == "billey:shark_chestplate" && player.isSwimming) {
				underwaterMovement.setCurrentValue(0.1);
			} else underwaterMovement.resetToDefaultValue(); //todo: make the reset compatible with other addons that change swim speed
			player.getComponent("rideable").getRiders().forEach(entity => {
				if (ridePets.includes(entity.typeId)) {
					if (entity.typeId == "billey:slime_wyvern") {
						if (player.getComponent("rideable").getRiders().length > 1)
							entity.teleport(player.location);
					}
					else if (headPets.includes(entity.typeId))
						entity.setProperty("billey:sit_on_head", player.getComponent("rideable").getRiders().length < 2);
					if (player.isSneaking && player.isJumping)
						entity.teleport(player.location);
				}
			});
			if (isMorph(player, "duck")) {
				morphTick(player, "duck"); //this looks kinda stupid, will change when more morphs come
			}
		}
	});
	dimensions.forEach(dimension => {
		//this is for the mating animation, only rats have mating animations right now but more mobs will soon
		dimension.getEntities({ tags: ["in_love"], type: "billey:rat" }).forEach(mob => {
			mob.setProperty("billey:mob_nearby",
				dimension.getEntities({ location: mob.location, maxDistance: 1.2, type: "billey:rat", tags: ["in_love"] }).length > 1)
		});
	});
});
