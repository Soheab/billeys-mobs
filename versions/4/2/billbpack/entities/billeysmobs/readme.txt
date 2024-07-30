..........................
the tame behavior animation gives each mob of the addon the "tamed" command tag when its tamed.
that makes it possible to specifically target tamed mobs in commands like
/kill @e[tag=!tamed]
and it also allows the angel mobs to use /effect specifically on tamed mobs(the ones in the addon at least).
the tame behavior animation also makes every mob in the addon emit green particles when fully healed
..........................
(query.is_sitting&&query.is_alive&&!query.is_avoiding_mobs&&!(query.has_target&&query.is_moving))
means that the mob is sitting but is not trying to attack something or is fleeing from something,
so basically when the mob is sitting but not moving
..........................
also feel free to use the addons code to learn, though do not copy entire or
large parts of files, and i'd consider eg. using the duck's floating in water
behavior for your own duck to be quite of a dick move, though there's not really
a way for me to ensure you did that, even though i tend to look at the code
of addons simillar to mine
..........................
feel free to ask anything else that you think is confusing