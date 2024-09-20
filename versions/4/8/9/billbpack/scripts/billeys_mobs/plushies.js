import { world, system, ItemStack, EnchantmentType, Player } from "@minecraft/server";

const PLUSHIES = ["billey:slime_wyvern_plushie"];

world.beforeEvents.itemUseOn.subscribe(data => {
	if (
		!data.itemStack.typeId.startsWith("billey:")
		||
		!data.itemStack.typeId.endsWith("_plushie")
	)
		return;
	system.run(() => {
		const subscription = world.afterEvents.entitySpawn.subscribe(({ entity }) => {
			if (entity.typeId != "billey:plushie") return;
			world.afterEvents.entitySpawn.unsubscribe(subscription);
			const item = data.itemStack;

			entity.nameTag = item.nameTag ?? "";

			let enchantmentData = "";
			const enchantments = item.getComponent("enchantable").getEnchantments();
			for (let index = 0; index < enchantments.length; index++) {
				const e = enchantments[index];
				if (index) enchantmentData += ",";
				enchantmentData += `${e.type.id} ${e.level}`;
			}
			entity.setDynamicProperty("enchantment_data", enchantmentData);
			if (enchantments.length)
				entity.setProperty("billey:is_enchanted", true);

			for (const dpid of item.getDynamicPropertyIds()) {
				if (dpid.startsWith("ENTITY_"))
					entity.setDynamicProperty(
						dpid.slice(7),
						item.getDynamicProperty(dpid)
					);
				else
					entity.setDynamicProperty(
						"ITEM_" + dpid,
						item.getDynamicProperty(dpid)
					);
			}

			entity.setDynamicProperty("ITEM_LORE", JSON.stringify(item.getLore()));

		});
	});
});

/** @type {Player|undefined} */
let plushieSqueezer;

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, id }) => {
	switch (id) {
		case "billey:set_plushie_squeezer":
			plushieSqueezer = sourceEntity;
			return;
		case "billey:plushie_say_owner": 
			if (!plushieSqueezer?.isValid()) return;
			/** @type {string|undefined} */
			const ownerName = sourceEntity.getDynamicProperty("ITEM_owner_name");
			if (ownerName) {
				const variant = sourceEntity.getComponent("variant")?.value ?? 0;
				plushieSqueezer.sendMessage({
					translate: "chat.billeyinfo.plushie" + variant,
					with: [ownerName]
				});
			}
			else
				plushieSqueezer.sendMessage({
					translate: "chat.billeyinfo.plushie.no_owner"
				});
			plushieSqueezer = undefined;
			return;
		case "billey:plushie_destroyed":
			const variant = sourceEntity.getComponent("variant").value;
			const item = new ItemStack(PLUSHIES[variant]);

			item.nameTag = sourceEntity.nameTag;

			const enchantable = item.getComponent("enchantable");
			/** @type {string} */
			const enchantmentData = sourceEntity.getDynamicProperty("enchantment_data");
			if (enchantmentData)
				enchantmentData.split(",").forEach(e => {
					const lol = e.split(" ");
					enchantable.addEnchantment(
						{
							level: lol[1] * 1, // * 1 converts the string to a number
							type: new EnchantmentType(lol[0])
						}
					);
				});

			for (const dpid of sourceEntity.getDynamicPropertyIds()) {
				if (dpid == "ITEM_LORE")
					item.setLore(JSON.parse(sourceEntity.getDynamicProperty(dpid)));
				else if (dpid.startsWith("ITEM_"))
					item.setDynamicProperty(
						dpid.slice(5),
						sourceEntity.getDynamicProperty(dpid)
					);
				else if (dpid != "enchantment_data")
					item.setDynamicProperty(
						"ENTITY_" + dpid,
						sourceEntity.getDynamicProperty(dpid)
					);
			}

			sourceEntity.dimension.spawnItem(
				item,
				sourceEntity.location
			);
			sourceEntity.remove();
			return;
	}
});