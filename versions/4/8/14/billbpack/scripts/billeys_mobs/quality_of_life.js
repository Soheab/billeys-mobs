import { world, system, Player, Entity } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { DIMENSIONS } from "./utility";

world.afterEvents.entityDie.subscribe(
    ({ deadEntity }) => {
        if (!deadEntity.isValid())
            return;
        const chunkLoader = deadEntity.dimension.spawnEntity(
            "billey:chunk_loader",
            deadEntity.location
        );
        const subscription = world.afterEvents.playerSpawn.subscribe(({ player }) => {
            if (player.id != deadEntity.id)
                return;
            world.afterEvents.playerSpawn.unsubscribe(subscription);
            tpAllFollowingPets(player, true);
            system.runTimeout(() => {
                chunkLoader.remove();
            }, 2);
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
 * @param {Player} player
 * @param {boolean} pushAround
*/
export function tpAllFollowingPets(player, pushAround) {
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
                &&
                entity.getComponent("tameable")?.tamedToPlayerId == player.id
                &&
                isFollowingOwner(entity)
            );
        for (const pet of followingPets) {
            pet.teleport(player.location, { dimension: player.dimension });
            if (!pushAround) continue;
            const x = Math.max(0.1, Math.random() / 2) * nextXPushDirection;
            const z = Math.max(0.1, Math.random() / 2) * nextZPushDirection;
            if (Math.random() < 0.5)
                nextXPushDirection *= -1;
            else
                nextZPushDirection *= -1;
            pet.applyImpulse({x, y: 0, z});
        }
        //removeWaystoneLoader(player);
    }
}

/** 
 * @param {Entity} pet
 */
function isFollowingOwner(pet) {
    if (!pet.isValid()) {
        world.sendMessage(`§cError: The '${pet.typeId}' was not actually loaded. §ePlease let Bill know.`);
    }
    const followOwnerState = pet.getProperty("billey:follow_owner_state");
    if (followOwnerState == "unknown") {
        world.sendMessage(`§cError: Property 'billey:follow_owner_state' was 'unknown' on '${pet.nameTag}' the '${pet.typeId}' even though it was tamed. §ePlease let Bill know.`);
    }
    return followOwnerState == "following";
}

world.afterEvents.playerDimensionChange.subscribe(({ player }) => {
    tpAllFollowingPets(player, true);
});

/** @param {Player} player 
export function removeWaystoneLoader(player) {
    const waystoneLoader = player.__waystoneLoader;
    /** @type {Entity|undefined}
    if (waystoneLoader?.isValid())
        waystoneLoader.remove();
    player.__waystoneLoader = undefined;
} */

world.afterEvents.entityLoad.subscribe(({ entity }) => {
    if (entity.typeId == "billey:chunk_loader")
        entity.remove();
});

/*world.afterEvents.playerInteractWithBlock.subscribe(({ block, player }) => {
    if (!block.isValid() || !block.typeId.includes("waystone"))
        return;
    removeWaystoneLoader(player);
    player.__waystoneLoader = player.dimension.spawnEntity(
        "billey:chunk_loader",
        block.location
    );
});*/