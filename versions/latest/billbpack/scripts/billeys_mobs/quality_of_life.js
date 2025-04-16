import { world, system, Player, Entity, BlockVolume, InputPermissionCategory } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { DIMENSIONS, nameOf, titleCase } from "./utility";
import { xpOfNextLevel } from "./leveling";
import { calculateTotalEffectiveHappinessPercentage, calculateTotalEffectiveHappinessPercentage2, getAllHappinessIds, getMentalStateColor, getMentalStateName, MAX_HAPPINESS, valueToEffectiveValue } from "./happiness/happiness";

world.afterEvents.entityDie.subscribe(
    ({ deadEntity }) => {
        if (!deadEntity.isValid)
            return;
        const chunkLoader = deadEntity.dimension.spawnEntity(
            "billey:chunk_loader",
            deadEntity.location
        );
        const subscription = world.afterEvents.playerSpawn.subscribe(({ player }) => {
            if (player.id != deadEntity.id)
                return;
            world.afterEvents.playerSpawn.unsubscribe(subscription);
            tpAllFollowingPetsUsingStructure(player, chunkLoader);
        });
    },
    {
        entityTypes: ["minecraft:player"]
    }
);

/** @param {Player} player  */
export async function showSettingForm(player) {
    const form = new ModalFormData()
        .title({ translate: "ui.billeys_mobs.info.category.settings" })
        .toggle(
            { translate: "ui.billeys_mobs.settings.can_hit_own_pet" },
            player.hasTag("billey:can_hit_own_pet")
        )
        .toggle(
            { translate: "ui.billeys_mobs.settings.can_hit_other_pet" },
            !player.hasTag("billey:cant_hit_other_pet")
        );
    const { canceled, formValues } = await form.show(player);
    if (canceled) return;
    if (formValues[0])
        player.addTag("billey:can_hit_own_pet");
    else
        player.removeTag("billey:can_hit_own_pet");
    if (formValues[1])
        player.removeTag("billey:cant_hit_other_pet");
    else
        player.addTag("billey:cant_hit_other_pet");
}

let nextXPushDirection = 1;
let nextZPushDirection = 1;
/** 
 * @param {Player} player The owner of the pets
 * @param {boolean} alwaysUnjumble Push the pet around even if it's only one
*/
export function tpAllFollowingPets(player, alwaysUnjumble) {
    for (const dimension of DIMENSIONS) {
        const followingPets = dimension
            /**
             * the tamed tag is added to all tamed billey mobs.
             * it was used back in the day when scripts didn't yet exist
             * to allow commands to detect if a mob is tamed or not,
             * eg. angel cats giving regeneration.
             * Here it wasn't needed but probably
             * slightly optimizes this function.
             */
            .getEntities({
                tags: ["tamed"]
            })
            .filter(entity =>
                entity.getProperty("billey:is_sitting") === false
                && entity.getComponent("tameable")?.tamedToPlayerId == player.id
                && isFollowingOwner(entity)
            );
        for (const pet of followingPets) {
            pet.teleport(player.location, { dimension: player.dimension });
            if (alwaysUnjumble || followingPets.length > 1)
                pushAround(pet);
        }
        //removeWaystoneLoader(player);
    }
}

/** 
 * @param {Player} player The owner of the pets
 * @param {Entity} chunkLoader 
 * Teleports all following pets by saving them as structures, deleting them, and then 
 * placing the structure. This fixes the invisible pet after tp vanilla bug
*/
export function tpAllFollowingPetsUsingStructure(player, chunkLoader, doNotRepeat) {
    for (const dimension of DIMENSIONS) {
        const followingPets = dimension
            /**
             * the tamed tag is added to all tamed billey mobs.
             * it was used back in the day when scripts didn't yet exist
             * to allow commands to detect if a mob is tamed or not,
             * eg. angel cats giving regeneration.
             * Here it wasn't needed but probably
             * slightly optimizes this function.
             */
            .getEntities({
                tags: ["tamed"]
            })
            .filter(entity =>
                entity.getProperty("billey:is_sitting") === false
                && entity.getComponent("tameable")?.tamedToPlayerId == player.id
                && isFollowingOwner(entity)
            );
        for (const pet of followingPets) {
            pet.teleport(player.location, { dimension: player.dimension });
            pet.setDynamicProperty("unjumble_on_load", true);
        }
        //removeWaystoneLoader(player);
    }
    const { dimension } = player;
    const structureId = `billey:${player.id}_tped_pets`;
    world.structureManager.delete(structureId);
    world.structureManager.createFromWorld(
        structureId,
        dimension, player.location, player.location
    );
    dimension.getEntitiesAtBlockLocation(player.location)
        .forEach(e => { if (!(e instanceof Player)) e.remove(); });
    world.structureManager.place(structureId, dimension, player.location, {
        includeBlocks: false
    });
    world.structureManager.delete(structureId);
    chunkLoader?.remove();
    removeWaystoneLoader(player);
    system.run(() => {
        if (!doNotRepeat)
            tpAllFollowingPetsUsingStructure(player, undefined, true);
    });
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.getDynamicProperty("unjumble_on_load")) {
        pushAround(entity);
        entity.setDynamicProperty("unjumble_on_load", undefined);
    }
});

/**
 * @param {Entity} entity 
 */
function pushAround(entity) {
    const unitX = Math.random();
    const unitY = Math.sqrt(1 - unitX * unitX);
    const x = unitX / 2 * nextXPushDirection;
    const z = unitY / 2 * nextZPushDirection;
    if (Math.random() < 0.5)
        nextXPushDirection *= -1;
    else
        nextZPushDirection *= -1;
    entity.applyImpulse({ x, y: 0, z });
}

/** 
 * @param {Entity} pet
 */
function isFollowingOwner(pet) {
    if (!pet.isValid) {
        world.sendMessage(`§cError: The '${pet.typeId}' was not actually loaded. §ePlease let Bill know.`);
    }
    const followOwnerState = pet.getProperty("billey:follow_owner_state");
    if (followOwnerState == "unknown") {
        world.sendMessage(`§cError: Property 'billey:follow_owner_state' was 'unknown' on '${pet.nameTag}' the '${pet.typeId}' even though it was tamed. §ePlease let Bill know.`);
    }
    return followOwnerState == "following";
}

world.afterEvents.playerDimensionChange.subscribe(({ player }) => {
    tpAllFollowingPetsUsingStructure(player);
});

/** @param {Player} player */
export function removeWaystoneLoader(player) {
    const waystoneLoader = player.__waystoneLoader;
    /* @type {Entity|undefined} */
    if (waystoneLoader?.isValid)
        waystoneLoader.remove();
    player.__waystoneLoader = undefined;
}

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.typeId == "billey:chunk_loader")
        entity.remove();
});

world.afterEvents.playerInteractWithBlock.subscribe(({ block, player }) => {
    if (!block.isValid || !block.typeId.includes("waystone"))
        return;
    removeWaystoneLoader(player);
    player.__waystoneLoader = player.dimension.spawnEntity(
        "billey:chunk_loader",
        block.location
    );
});

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
    if (
        !(damagingEntity instanceof Player)
        || !damagingEntity.isSneaking
        || !hitEntity.typeId.startsWith("billey:")
        || (!hitEntity.getComponent("tameable")?.isTamed && !hitEntity.hasComponent("is_tamed"))
    ) {
        return;
    }

    const isOwner = damagingEntity == hitEntity.getComponent("tameable")?.tamedToPlayer;

    if (
        isOwner && damagingEntity.hasTag("billey:can_hit_own_pet")
        || !isOwner && !damagingEntity.hasTag("billey:cant_hit_other_pet")
    ) {
        return;
    }

    showPetStatForm(damagingEntity, hitEntity);
});

/**
 * @param {Player} player 
 * @param {Entity} pet 
 */
export function showPetStatForm(player, pet) {
    const form = new ActionFormData();
    form.title(nameOf(pet));
    const healthComponent = pet.getComponent("health");
    const currentHealth = Math.round(healthComponent.currentValue);
    const maxHealth = Math.round(healthComponent.defaultValue);
    const healthPercentage = currentHealth / maxHealth;
    let healthColor = "§a";
    if (healthPercentage >= 1)
        /* do nothing */;
    else if (healthPercentage < 0.25 || currentHealth < 5)
        healthColor = "§4";
    else if (healthPercentage < 0.5 || currentHealth < 8)
        healthColor = "§c";
    else if (healthPercentage < 0.75 || currentHealth < 11)
        healthColor = "§6";
    else if (healthPercentage < 1)
        healthColor = "§e";

    const happinessPercentage = calculateTotalEffectiveHappinessPercentage2(pet);
    const mentalStateColor = getMentalStateColor(happinessPercentage);
    const mentalStateName = getMentalStateName(happinessPercentage);

    /** @type {import("@minecraft/server").RawMessage[]} */
    let body = [
        { translate: "ui.billeys_mobs.pet_stats.owner" },
        { text: `: §b${pet.getDynamicProperty("owner_name")}§r\n` },
        { translate: "ui.billeys_mobs.pet_stats.health" },
        { text: `: ${healthColor + currentHealth}§r / ${"§a" + maxHealth}§r\n` }
    ];

    /** @type {number|undefined} */
    const level = pet.getProperty("billey:level");
    if (level && !pet.hasComponent("is_baby")) {
        body.push(
            {
                translate: "ui.billeys_mobs.pet_stats.level",
                with: [level.toString()]
            },
            { text: "§r\n" }
        );
        if (level < 10) {
            const nextLevelXp = xpOfNextLevel(level);
            const thisLevelXp = xpOfNextLevel(level - 1);
            const currentXp = Math.min(
                Math.floor(10 * pet.getProperty("billey:xp")),
                nextLevelXp - 1
            );
            const xpLeft = nextLevelXp - currentXp;
            body.push(
                {
                    translate: "ui.billeys_mobs.pet_stats.xp",
                    with: [
                        (level + 1).toString(),
                        (currentXp - thisLevelXp).toString(),
                        (nextLevelXp - thisLevelXp).toString(),
                        xpLeft.toString()
                    ]
                },
                { text: "§r\n" }
            );
        }
    }

    body.push({
        translate: "ui.billeys_mobs.pet_stats.mental_state",
        with: {
            rawtext: [
                { text: mentalStateColor },
                { translate: "mental_state.billeys_mobs." + mentalStateName }
            ]
        }
    });
    if (true) {
        body.push({ text: `§r\n\n§lTechnical details:§r\nTotal Happiness: ${(happinessPercentage).toFixed(2)}\n` });
        for (const happinessId of getAllHappinessIds()) {
            body.push({ text: `§r\n\n${happinessId}: ${((pet[happinessId].effectiveValue) / MAX_HAPPINESS).toFixed(2)} (${((pet[happinessId].value) / MAX_HAPPINESS).toFixed(2)})` });
        }
    }

    form.body({ rawtext: body });
    form.button({ translate: "gui.ok" });

    form.show(player);
}