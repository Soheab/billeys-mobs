import { Player } from "@minecraft/server";
import { getAllPetEquipmentIds } from "./registry";
import { ActionFormData } from "@minecraft/server-ui";
import { showInfoBookForm } from "../info_book";



/**
 * @param {Player} player 
 */
export async function showPetEquipmentInfoForm(player) {
    const form = new ActionFormData();
    form.title({ translate: "ui.billeys_mobs.pet_equipment" });
    form.body({ translate: "ui.billeys_mobs.pet_equipment.body", with: ["\n"] });
    const allAllPetEquipmentIds = getAllPetEquipmentIds();
    for (const id of allAllPetEquipmentIds) {
        //id.slice(7) removes the billey:
        form.button(`item.${id}`, "textures/billeyitems/" + id.slice(7));
    }
    form.button({ translate: "gui.back" });
    const { selection, canceled } = await form.show(player);
    if (canceled)
        return;
    else if (selection == allAllPetEquipmentIds.length) {
        showInfoBookForm(player);
        return;
    }
    else {
        const form = new ActionFormData();
        /** @type {string} */
        const id = allAllPetEquipmentIds[selection];
        form.title({ translate: `item.${id}` });
        form.body({ translate: "ui.billeys_mobs.item_info." + id.slice(7), with: ["\n"] });
        form.button({ translate: "gui.back" });
        if (
            (await form.show(player)).selection === 0
        ) {
            showPetEquipmentInfoForm(player);
        }
    }
}