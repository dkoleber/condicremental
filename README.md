## Condicremental

Condicremental is an incremental game with player-programmable buy conditions.

The game is written in Javascript and uses React.js for frontend.

### Game Rules

For reference, an incremental game is a generally defined as a game where the player has to click a button to earn currency.
Usually, this currency can be spent to get items which allow the player to attain the same or different currencies faster.
Often times, certain goals must be met in order for some items to become available to the player. 

In other incremental games, the player must click buttons to purchase items or to produce currency. 
In Condicremental, the player can instead write logical expressions which specify buy conditions for items.
No more carpel tunnel!

The game world has 3 classes. Resources are akin to currency and are accumulted by the user to purchase Producers and Goals.
Producers are Resources, but have a Resource output every game tick.
Some Resources are not available to players initially.
Goals allow the player to unlock Resources by meeting a Resource or Goal prerequisite, then paying a Resource cost.
Goals, once paid for, can unlock Resources and other Goals, and can provide amounts of Resources.

<p align="center">
<img src="incremental_1.png"/>
</p>




