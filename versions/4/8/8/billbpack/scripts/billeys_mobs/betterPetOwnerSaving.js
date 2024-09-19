import { world, system, Entity } from "@minecraft/server";

/**
 * @param {Entity} mob 
 * Adds the mob owner's name and id as dynamic properties so they can be accessed even when owner is offline.
 * Used for making pets remember their owner after being loaded by a script structure
 */
export function addOwnerAsDynamicProperty(mob) {
    const tameable = mob.getComponent("tameable");
    if (!tameable)
        return world.sendMessage(mob.nameTag + " the " + mob.typeId.split(":")[1].replaceAll("_", " ") +
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
    /*
    Note to self: if I ever add a pet that's tamed without hand-feeding it,
    this won't work
    */
    const mobWasntTamed = !target.getComponent("is_tamed");
    system.run(() => {
        if (target.typeId.startsWith("billey:") && mobWasntTamed && target.getComponent("is_tamed"))
            addOwnerAsDynamicProperty(target);
    });
});