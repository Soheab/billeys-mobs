..........................
the tame behavior animation gives each mob of the addon the "tamed" command tag when its tamed.
that makes it possible to specifically target tamed mobs in commands like
/kill @e[tag=!tamed]
and it also allows the angel mobs to use /effect specifically on tamed mobs(the ones in the addon at least).
the tame behavior animation also makes every mob in the addon emit green particles when fully healed
..........................
(query.is_sitting&&query.is_alive&&!q.has_rider&&!query.is_avoiding_mobs&&!(query.is_moving&&query.has_target))
means that the mob is sitting but is not trying to attack something or is fleeing from something,
so basically when the mob is sitting but not moving
..........................
also feel free to use the addons code to learn, though do not copy entire or
large parts of files, and i'd consider eg. using the duck's floating in water
behavior for your own duck to be quite of a dick move, though there's not really
a way for me to ensure you did that, even though i tend to look at the code
of addons simillar to mine
..........................
i apologize for any weird/unfunny stuff you might find in the files,
the addon has been around longer than my sense of humor
..........................
tl;dr: giving unique namespaces to texture/function/sound/loot table file paths, animations, animation controllers, 
render controllers, item texture ids, etc. unique identifiers/namespaces is more important that giving unique namespaces
to item and entity identifiers

the reason almost every texture/function/sound/loot table file path, animation, animation controller, render controller
item texture id, etc. has the word "bill" somewhere in its name is so that if you play with another addon
that also adds ducks/pigeons/hammerhead sharks/hamsters etc there wont be any conflict with asssets 
that share the same name.
there is no point in giving entity and item identifiers unique namespaces if you dont also give namespaces to almost 
everything, in fact, it'd be better if you just give up on unique namespaces entirely instead of only having entity 
and item identifiers to have unique namespaces,
because if for example you have 2 addons that both add ducks and one's identifier is billeysmobs:duck and the others
is johnsmorebirds:duck but they both use "geometry.duck" and "animation.duck.walk" the one on the pack that is higher will
work normally and the one on the bottom will be glitched since its geometry.duck and animation.duck.walk will be
overriden by the top addon's.
however if both addons happen to have their duck's identifier be something not particularly unique like 
new:duck or mcpe:duck then the bottom ones duck will just not be in game instead of being glitched, 
and if at least one of the 2 addons have unique identifiers on literally everything
like most things in billeys mobs do, then those 2 addons will work fine together and you'll have the ducks
of both addons.
..........................
feel free to ask anything else that you think is confusing