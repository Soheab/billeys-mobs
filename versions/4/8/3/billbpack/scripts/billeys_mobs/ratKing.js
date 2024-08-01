import { world, system, Player, Entity } from "@minecraft/server";
import { add, normalize, subtract, validateHeightOf } from "./utility";

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity: entity, id }) => {
    if (!entity?.isValid()) return;
    switch (id) {
        case "billey:rat_minion_transform":
            if (!entity.isValid()) return;
            let l = entity.location;
            const { min, max } = entity.dimension.heightRange;
            if (l.y < min + 0.5) l.y = min + 1;
            if (l.y > max - 0.5) l.y = max - 1;
            const structureId = "billey:" + entity.id;
            if (world.structureManager.get(structureId)) {
                world.structureManager.place(structureId, entity.dimension, l);
                world.structureManager.delete(structureId);
                entity.remove();
            }
            else entity.kill();
            return;
        case "billey:rat_king_finish_cooking": {
            entity.getComponent("rideable")?.getRiders()[0]?.remove();
            let loc = entity.location;
            loc.y += 1;
            if (!validateHeightOf(entity, loc.y)) return;
            let potionId;
            if (entity.getDynamicProperty("has_been_hit_by_billeymob") && entity.getProperty("billey:phase") > 1) {
                potionId = "billey:rat_potion";
                entity.setDynamicProperty("has_been_hit_by_billeymob", false);
            }
            else if (Math.random() < 0.5)
                potionId = "billey:rat_king_deter_potion";
            else
                potionId = "billey:rat_king_boost_potion";
            const potion = entity.dimension.spawnEntity(potionId, loc);
            let velocity = { x: 0, y: 0.5, z: 0 };
            if (entity.getProperty("billey:phase") != 3)
                velocity = add(velocity, entity.getVelocity());
            potion.getComponent("projectile").shoot(velocity);
            potion.setDynamicProperty("of_rat_king", true); //only used by the rat potion
            return;
        }
    }
});

//clear the structure even if the rat minion is removed in an unusual way,
//eg. by /kill, or by a hypothetical addon with a "remove mob" item or something
world.afterEvents.entityRemove.subscribe(({ typeId, removedEntityId }) => {
    if (typeId == "billey:rat_minion")
        world.structureManager.delete("billey:" + removedEntityId);
});

world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    if (!hitEntity.isValid()) return;
    if (damagingEntity.typeId == "billey:rat_king") {
        const { x, z } = normalize(subtract(hitEntity.location, damagingEntity.location));
        hitEntity.applyKnockback(
            x,
            z,
            0.5 * damagingEntity.getProperty("billey:phase"),
            0.25 * damagingEntity.getProperty("billey:phase")
        );
    }
    else if (hitEntity.typeId == "billey:rat_king_chef_hitbox") {
        if (!(damagingEntity instanceof Player)) return;
        const ratKing = hitEntity.getComponent("riding").entityRidingOn;
        ratKing.triggerEvent("cooking_interrupted");
        hitEntity.remove();
        damagingEntity.onScreenDisplay.setActionBar("§aChef hit!");
        damagingEntity.playSound("random.orb");
        const chefHits = ratKing.getProperty("billey:chef_hits");
        if (chefHits < 2)
            ratKing.setProperty("billey:chef_hits", chefHits + 1);
    }
    else if (hitEntity.typeId == "billey:rat_king" && damagingEntity.typeId.startsWith("billey:"))
        hitEntity.setDynamicProperty("has_been_hit_by_billeymob", true);
});

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (entity.typeId != "minecraft:lightning_bolt") return;
    if (!entity.isValid()) return;
    const { dimension, location } = entity;
    const player = dimension.getEntities({
        type: "minecraft:player",
        location: location,
        maxDistance: 16,
        closest: 1
    })[0];
    if (!player) return;
    const rats = dimension.getEntities({
        type: "billey:rat",
        location: location,
        maxDistance: 10,
        closest: 5,
        tags: ["tamed"]
    }).concat(dimension.getEntities({
        type: "billey:netherrat",
        location: location,
        maxDistance: 10,
        closest: 2,
        tags: ["tamed"]
    }));
    if (rats.length < 7) return;
    for (const rat of rats) {
        /*
        save the variant of the rats as a temporary custom
        property so that getComponent is only called 7 times instead of 42.
        Hopefully helps with performance
        */
        rat.variant = rat.getComponent("variant").value;
    }
    //TODO: optimize this more with system.runJob
    for (const rat of rats) for (const otherRat of rats) {
        if (rat == otherRat) 
            continue;
        if (rat.typeId == otherRat.typeId && rat.variant == otherRat.variant)
            return;
    }
    let unnamedRatAmount = 0;
    for (const rat of rats) {
        if (rat.nameTag)
            world.sendMessage(rat.nameTag + " was sacrificed to the Rat King by " + player.name);
        else
            unnamedRatAmount++;
        rat.dimension.spawnParticle(
            "minecraft:explosion_particle",
            {
                x: rat.location.x,
                y: rat.location.y + 0.5,
                z: rat.location.z
            }
        );
        rat.remove();
    }
    if (unnamedRatAmount)
        world.sendMessage(unnamedRatAmount + " unnamed rats were sacrificed to the Rat King by " + player.name);
    dimension.spawnEntity("billey:rat_king", location);
});