title @s actionbar textures/advancement/billfelinenecro
title @s clear
summon billey:summon_xp_orb
summon billey:summon_xp_orb
summon billey:summon_xp_orb
summon billey:summon_xp_orb
summon billey:summon_xp_orb
summon billey:summon_xp_orb
summon billey:summon_xp_orb
titleraw @s title {"rawtext":[{"text":"§e"},{"translate":"advancements.toast.task"},{"text":"§r"}]}
titleraw @s subtitle {"rawtext":[{"translate":"advancements.billey.undeadcat"}]}
tellraw @a {"rawtext":[{"translate":"chat.advancement.task","with":{"rawtext":[{"selector":"@s"},{"translate":"advancements.billey.undeadcat"}]}}]}
tellraw @s {"rawtext":[{"text":"§8"},{"translate":"chat.billbetta5"}]}