import { world, system, Entity } from '@minecraft/server';

/**
 * @param {Entity} mob 
 * Adds the mob owner's name and id as dynamic properties so they can be accessed even when owner is offline.
 * Used for making pets remember their owner after being loaded by a structure
 */
function addOwnerAsDynamicProperty(mob) {
    const tameable = mob.getComponent("tameable");
    if (!tameable)
        return world.sendMessage(mob.nameTag + " the " + mob.typeId.split(":")[1].replace("_", " ") +
            " doesn't have the tameable component, please let the creator of billey's mobs know so he can fix this");
    const owner = tameable.tamedToPlayer;
    if (!owner) return;
    mob.setDynamicProperty("owner_id", owner.id);
    mob.setDynamicProperty("owner_name", owner.name);
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.typeId.startsWith("billey:") && entity.getComponent("is_tamed"))
        addOwnerAsDynamicProperty(entity);
});

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (entity.typeId.startsWith("billey:") && eventId == "minecraft:entity_born")
        addOwnerAsDynamicProperty(entity);
});

world.beforeEvents.playerInteractWithEntity.subscribe(({ target }) => {
    const mobWasntTamed = !target.getComponent("is_tamed");
    system.run(() => {
        if (mobWasntTamed && target.getComponent("is_tamed"))
            addOwnerAsDynamicProperty(target);
    });
});