import { world, system, Player, Dimension, DataDrivenEntityTriggerAfterEvent } from "@minecraft/server";
import { getPetEquipmentId } from "./pet_equipment/_index";

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damageSource, damage }) => {
    if (damage < 0.25 || hurtEntity instanceof Player || !hurtEntity.hasComponent("health"))
        return;
    const damager = damageSource.damagingEntity;
    if (!damager?.typeId.startsWith("billey:") || !damager.isValid())
        return;
    //is minion and is friendly minion
    const isMinion = damager.typeId.endsWith("_minion") && damager.getComponent("variant")?.value == 2;
    //level can't be 0 so this is enough to test if it's undefined
    if ((!damager?.getProperty("billey:level") || damager.hasComponent("is_baby")) && !isMinion)
        return;
    let xpTarget = damager;
    let xpMultiplier = 1;
    if (isMinion) {
        xpTarget = damager.dimension.getEntities()
            .find(e => e.id == damager.getDynamicProperty("crowned_rat_id"))
        if (!xpTarget)
            return;
        xpMultiplier /= 4;
    }
    if (getPetEquipmentId(damager, "Head")?.startsWith("billey:anniversary_pet_hat"))
        xpMultiplier *= 2;
    xpTarget.setProperty(
        "billey:xp",
        xpTarget.getProperty("billey:xp") + 0.6 * xpMultiplier
    );
    if (!xpTarget.__isCheckingLevel)
        system.run(() => {
            xpTarget.triggerEvent("check_level");
            xpTarget.__isCheckingLevel = false;
        });
    xpTarget.__isCheckingLevel = true;
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
    if (deadEntity instanceof Player || !deadEntity.hasComponent("health"))
        return;
    const damager = damageSource.damagingEntity;
    if (!damager?.typeId.startsWith("billey:") || !damager.isValid())
        return;
    //is minion and is friendly minion
    const isMinion = damager.typeId.endsWith("_minion") && damager.getComponent("variant").value == 2;
    //level can't be 0 so this is enough to test if it's undefined
    if ((!damager?.getProperty("billey:level") || damager.hasComponent("is_baby")) && !isMinion)
        return;
    let xpTarget = damager;
    let xpMultiplier = 1;
    if (isMinion) {
        xpTarget = damager.dimension.getEntities()
            .find(e => e.id == damager.getDynamicProperty("crowned_rat_id"))
        if (!xpTarget)
            return;
        xpMultiplier /= 4;
    }
    if (getPetEquipmentId(damager, "Head")?.startsWith("billey:anniversary_pet_hat"))
        xpMultiplier *= 2;
    xpTarget.setProperty(
        "billey:xp",
        xpTarget.getProperty("billey:xp") + 1 * xpMultiplier
    );
    if (!xpTarget.__isCheckingLevel)
        system.run(() => {
            xpTarget.triggerEvent("check_level");
            xpTarget.__isCheckingLevel = false;
        });
    xpTarget.__isCheckingLevel = true;
});