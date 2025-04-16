import { DEFAULT_HAPPINESS_VALUE, registerPetHappiness } from "./happiness";
import { PetNegativeHappiness } from "./negative_happiness";

const ID = "health_happiness";

export class HealthHappiness extends PetNegativeHappiness {
    /** @override */
    getId() {
        return ID;
    }

    /** @override */
    getWeight() {
        return 2;
    }

    /** 
     * @override
     * @returns {number} the change in this happiness's value after the happy tick,
     * a happy tick is every 20th tick, which is every second basically
     */
    tick() {
        const pet = this.pet;
        const healthComponent = pet.getComponent("health");
        const maxHealth = healthComponent.defaultValue;
        const currentHealth = Math.min(healthComponent.currentValue, healthComponent.effectiveMax);
        const hurtValue = (currentHealth - maxHealth) / maxHealth;
        if (hurtValue < 0)
            return 240 * hurtValue;
        else
            return 480;
    }

    /** @override */
    get effectiveValue() {
        const healthComponent = this.pet.getComponent("health");
        const maxHealth = healthComponent.defaultValue;
        const currentHealth = healthComponent.currentValue;
        const percentage = currentHealth / maxHealth;
        return (super.effectiveValue + DEFAULT_HAPPINESS_VALUE * percentage) / 2
    }
}

registerPetHappiness(
    ID,
    pet => new HealthHappiness(pet)
);