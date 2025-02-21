import { world, system, Entity } from "@minecraft/server";
import { dropAllPetEquipment, getPetEquipmentId } from "./_index";
import { add, validateHeightOf } from "../utility";
import { registerPetEquipment } from "./registry";

registerPetEquipment("Head", "billey:anniversary_pet_hat_6",
    {
        isBrave: false,
        isDyeable: false
    }
);