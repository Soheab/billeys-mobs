import { world, system, Entity } from "@minecraft/server";
import { dropAllPetEquipment, getPetEquipmentId } from "./_index";
import { add, validateHeightOf } from "../utility";
import { registerPetEquipment } from "./registry";

registerPetEquipment("Head", "billey:rat_crown",
    {
        /**
         * Makes pets defend their owner even if they usually don't.
         * The isBrave property is true for all
         * pet equipment that makes the pet stronger.
         */
        isBrave: true,
        isDyeable: false
    }
);

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
    if (eventId != "billey:pet_target_acquired"
        || !entity.isValid() ||
        getPetEquipmentId(entity, "Head") != "billey:rat_crown")
        return;

    entity.dimension.getEntities({ type: "billey:rat_minion" })
        .filter(r => r.getDynamicProperty("crowned_rat_id") == entity.id)
        .forEach(ratMinionPoof);
    if (!validateHeightOf(entity)) return;
    const crownedRatOwner = entity.getComponent("tameable").tamedToPlayer;
    const tpLocs = [
        { x: 1, y: 0, z: 1 },
        { x: 1, y: 0, z: -1 },
        { x: -1, y: 0, z: 1 },
        { x: -1, y: 0, z: -1 }
    ];
    /**
     * @type {Entity[]}
     */
    let ratMinions = [];
    for (let i = 0; i < tpLocs.length; i++) {
        const ratMinion = entity.dimension.spawnEntity("billey:rat_minion", entity.location);
        ratMinions.push(ratMinion);
        ratMinion.setRotation(entity.getRotation());
        if (entity.nameTag) ratMinion.nameTag = "§7" + entity.nameTag + "§r";
        ratMinion.triggerEvent("from_crowned_rat");
        ratMinion.setDynamicProperty("crowned_rat_id", entity.id);
        ratMinion.tryTeleport(add(tpLocs[i], ratMinion.location), {
            checkForBlocks: true
        });
        if (!i) entity.target?.applyDamage(1, {
            damagingEntity: ratMinion,
            cause: "entityAttack"
        });
    }
    system.runTimeout(
        () => ratMinions.forEach(ratMinion => {
            //crownedRatOwner is undefined if the crowned rat's owner is offline
            //getComponent("tameable") was also undefined once, i forgot in what situation
            if (crownedRatOwner?.isValid())
                ratMinion.getComponent("tameable")?.tame(crownedRatOwner);

            //make the rat minions angry at the crowned rat's target
            if (entity.isValid() && entity.target) {
                ratMinion.applyDamage(1, {
                    damagingEntity: entity.target,
                    cause: "entityAttack"
                });
                ratMinion.clearVelocity();
                ratMinion.applyImpulse(entity.getVelocity());
            }
        }), 2
    );
});

system.afterEvents.scriptEventReceive.subscribe(
    async ({ id, sourceEntity: ratMinion }) => {
        if (id != "billey:friendly_rat_minion_despawn" || !ratMinion?.isValid())
            return;
        await dropAllPetEquipment(ratMinion);
        ratMinionPoof(ratMinion);
    }
);

/** @param {Entity} ratMinion  */
function ratMinionPoof(ratMinion) {
    ratMinion.dimension.spawnParticle(
        "minecraft:explosion_particle",
        {
            x: ratMinion.location.x,
            y: ratMinion.location.y + 0.5,
            z: ratMinion.location.z
        }
    );
    ratMinion.remove();
}