import { system, world, Player, ItemStack, Entity } from "@minecraft/server";
import { add, decrementStack, duckArmors, validateHeightOf } from "./utility";

let duckArmor = "";
let duckArmorerWasntInCreative = false;

/**
 * @type {Player|undefined}
 */
let ratEquipper;

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity: entity, id }) => {
    if (!entity?.isValid()) return;
    switch (id) {
        //the duck ones are a mess
        case "billey:set_duck_armor":
            duckArmor = entity.getComponent("equippable").getEquipment("Mainhand")?.typeId
                ?.replace("billey:", "")?.replace("_pet_armor", "");
            duckArmorerWasntInCreative = entity.getGameMode() != "creative";
            if (duckArmorerWasntInCreative && duckArmor && duckArmor != "minecraft:dirt")
                entity.getComponent("equippable").setEquipment("Mainhand", undefined);
            return;
        case "billey:duck_equip_armor":
            if (duckArmorerWasntInCreative)
                if (entity.getComponent("mark_variant")?.value) {
                    let itemName = `billey:${duckArmors[entity.getComponent("mark_variant").value]}_pet_armor`;
                    let item = new ItemStack(itemName);
                    system.run(() => entity.dimension.spawnItem(item, entity.location));
                }
            entity.triggerEvent("be" + duckArmor);
            return;
        case "billey:duck_drop_armor":
            if (duckArmorerWasntInCreative)
                if (entity.getComponent("mark_variant")?.value) {
                    let itemName = `billey:${duckArmors[entity.getComponent("mark_variant").value]}_pet_armor`;
                    let item = new ItemStack(itemName);
                    system.run(() => entity.dimension.spawnItem(item, entity.location));
                }
            return;
        case "billey:manage_rat_equipment_player":
            ratEquipper = entity;
            return;
        case "billey:manage_rat_equipment_rat":
            if (entity.getProperty("billey:head_equipment") != "none") {
                const item = new ItemStack("billey:" + entity.getProperty("billey:head_equipment"));
                entity.dimension.spawnItem(item, entity.location);
                entity.triggerEvent("nohat");
            }
            else {
                const equipmentName = ratEquipper.getComponent("equippable").getEquipment("Mainhand").typeId
                    .slice(7, undefined); //remove the billey:
                entity.triggerEvent("wear_" + equipmentName);
                decrementStack(ratEquipper);
            }
            ratEquipper = undefined;
            return;
        case "billey:rat_crown_angry":
            entity.dimension.getEntities({ type: "billey:rat_minion" })
                .filter(r => r.getDynamicProperty("crowned_rat_id") == entity.id)
                .forEach(r => {
                    r.dimension.spawnParticle(
                        "minecraft:explosion_particle",
                        {
                            x: r.location.x,
                            y: r.location.y + 0.5,
                            z: r.location.z
                        }
                    );
                    r.remove();
                });
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
                    if (crownedRatOwner?.isValid()) ratMinion.getComponent("tameable")?.tame(crownedRatOwner);

                    //make the rat minions angry at the crowned rat's target
                    if (entity.target) {
                        ratMinion.applyDamage(1, {
                            damagingEntity: entity.target,
                            cause: "entityAttack"
                        });
                        ratMinion.clearVelocity();
                        ratMinion.applyImpulse(entity.getVelocity());
                    }
                }), 2
            );
            return;
        case "billey:rat_crown_calm":
            entity.dimension.getEntities({ type: "billey:rat_minion" })
                .filter(r => r.getDynamicProperty("crowned_rat_id") == entity.id)
                .forEach(r => {
                    r.dimension.spawnParticle(
                        "minecraft:explosion_particle",
                        {
                            x: r.location.x,
                            y: r.location.y + 0.5,
                            z: r.location.z
                        }
                    );
                    r.remove();
                });
            return;
        case "billey:cant_shoot_projectiles":
            if (entity.isValid())
                entity.setDynamicProperty("cant_shoot_projectiles", true);
            return;
    }
});

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    if (!entity.isValid()) return;
    const projectile = entity.getComponent("projectile");
    if (!projectile) return;
    const owner = projectile.owner;
    if (!owner?.isValid()) return;
    if (owner.getDynamicProperty("cant_shoot_projectiles"))
        entity.remove();
});