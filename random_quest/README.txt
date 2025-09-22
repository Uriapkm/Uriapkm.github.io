Welcome to Dungeon of the Arcane Depths! 🌌
Dive into a mystical roguelike adventure where you explore ever-changing dungeons, battle inner demons, and seek divine wisdom. This terminal-based game, built with Python and curses, offers a unique journey through ten levels of trials, culminating in a showdown with the Archdragon—a symbol of pride. Each run is unique, filled with random challenges and sacred relics to aid your quest for spiritual victory.

In the stillness of prayer, an anchorite kneels, his heart a beacon of faith. But his soul is a battlefield: a labyrinth known as the Arcane Depths, forged by his own sins and a desperate yearning for redemption.

The Journey Awaits 🕊️
Your journey begins in an inner sanctuary. Each of the ten levels is a manifestation of your weaknesses. Face abominations in the darkness:

Goblins of Deceit (g): Poisonous and quick.
Orcs of Wrath (o): Brutal, smashing blows.
Trolls of Sloth (t): Tough, self-healing foes.
Dragons of Lust (d): Fierce with fiery attacks.
Archdragon (D): The level 10 boss, embodying pride.

Divine Grace grants you sacred relics and blessed power-ups to light your path. Defeat the Archdragon to achieve repentance and purification, the key to ascending toward union with Christ. Will you conquer the sins within, or will the darkness consume you?

How to Install 🛠️
You’ll need Python 3 (version 3.6 or higher). The game works on Windows, Linux, or macOS.
Windows

Install Python:

Download from python.org/downloads.
Run the installer and check "Add Python to PATH".
Verify with python --version in Command Prompt (e.g., Python 3.9.0).


Install curses:

Run: pip install windows-curses


Get the Game:

Download and unzip the game files to a folder (e.g., C:\DungeonOfArcaneDepths).


Run the Game:

Open Command Prompt, navigate to the folder: cd C:\DungeonOfArcaneDepths
Run: python main.py (or python3 main.py if needed).



Linux or macOS

Check for Python:

In a terminal, run: python3 --version
If Python 3.6+ isn’t installed:
Ubuntu/Debian: sudo apt update && sudo apt install python3
macOS (with Homebrew): brew install python




Get the Game:

Download and unzip the game files to a folder (e.g., ~/DungeonOfArcaneDepths).


Run the Game:

Navigate to the folder: cd ~/DungeonOfArcaneDepths
Run: python3 main.py



Troubleshooting Tips 🔧

Check error_log.txt in the game folder for error details.
Ensure your terminal is at least 40x8 characters wide. Resize if needed.
On Windows, if curses fails, reinstall with pip install windows-curses.
Stuck? Restart the terminal or reinstall Python.


How to Play 🎮
Objective
Explore ten dungeon levels to find the Key of Faith, unlock the exit, and reach the Archdragon on level 10. Defeat it for spiritual victory! Randomly generated levels keep every game fresh.
Controls

Move: W/A/S/D or arrow keys (W/Up: move up, A/Left: move left, etc.).
Combat:
1–4: Use one of your four abilities to attack.
5: Drink a Health Potion to heal.
6: Use a Rare Potion to restore ability accuracy.
7: Attempt to flee (30% chance).


Game:
Q: Quit the game.
R: Restart after winning or losing.
Space: Start from the title screen or advance story text.



Gameplay Basics
Your Character

Symbol: @ (white)
Stats:
HP (30–60): Health. If it hits 0, you lose.
Attack (20–40): Determines attack strength.
Defense (5+): Reduces damage taken.


Starts with four random abilities (e.g., Slash, Fireball). Gain new ones by leveling up or finding altars.

Enemies

Goblins (g): Poisonous, quick attacks (deceit).
Orcs (o): Hard-hitting, wrathful blows.
Trolls (t): Tough, self-healing (sloth).
Dragons (d): Fire-breathing, lust-driven.
Elite Enemies: Stronger versions (uppercase, e.g., G).
Archdragon (D): Level 10 boss with devastating fire attacks (pride).

Relics

Health Potion (!, green): Heals half your max HP.
Rare Potion (*, magenta): Restores ability accuracy.
Key of Faith (k, yellow): Unlocks the level’s exit.
Mysterious Altar (%, cyan): Grants boosts (HP, attack, defense, or new ability).
Mystic Glyph (¤, cyan): Grants 10 experience points.

Combat

Choose an ability (1–4), potion (5–6), or flee (7).
Abilities have power and accuracy. Repeated use lowers accuracy—mix them up or use a Rare Potion.
Enemies may inflict poison (5 damage/turn) or burns (7 damage/turn).
Damage: max(1 or 5, Ability Power - Enemy Defense).
Defeating enemies grants experience; elites may drop Rare Potions (50% chance).

The Dungeon

6–20 rooms connected by tunnels.
Walls (#, blue): Impassable.
Floors (., white): Walkable.
Find the exit (>, yellow) and use the Key of Faith to progress.
Level 10: Face the Archdragon—no exit needed.


Tips for Fun 🎯

Explore Thoroughly: Find potions, altars, and the key in every corner.
Mix Attacks: Avoid overusing one ability to maintain accuracy.
Save Potions: Use Health Potions wisely in tough fights.
Fight Smart: Elite enemies are tough but yield better rewards.
Enjoy the Story: Poetic messages add a mystical depth.


Why You’ll Love It ✨

Unique Every Time: Random dungeons, enemies, and relics.
Strategic Combat: Plan attacks and manage resources carefully.
Spiritual Depth: Poetic themes of redemption and faith.
Retro Charm: Simple controls and terminal-based style.


Game Files 📂

main.py: Starts the game.
game_logic.py: Handles movement, combat, and items.
entities.py: Defines characters, enemies, and relics.
combat.py: Manages battles.
map_generator.py: Creates random dungeons.
render.py: Draws the game in the terminal.
config.py: Sets game rules and symbols.


Need Help? 🆘

Check error_log.txt for issues.
Ensure your terminal is wide enough.
Reinstall dependencies or restart the terminal if stuck.

Have fun, and may your journey through the Arcane Depths lead to divine illumination! 🙏