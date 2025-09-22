# Game configuration constants

# Map settings
MAP_WIDTH = 110
MAP_HEIGHT = 30
ROOM_MAX_SIZE = 12
ROOM_MIN_SIZE = 6
MAX_ROOMS = 20
MAX_LEVELS = 10

# Display symbols
PLAYER_SYMBOL = '@'
WALL_SYMBOL = '#'
FLOOR_SYMBOL = '.'
EXIT_SYMBOL = '>'
ENEMY_SYMBOLS = ['g', 'o', 't', 'd']
BOSS_SYMBOL = 'A'
POTION_SYMBOL = '!'
RARE_POTION_SYMBOL = '*'
KEY_SYMBOL = 'k'
ALTAR_SYMBOL = '%'
GLYPH_SYMBOL = '¤'

# Player settings
PLAYER_BASE_STATS = 100

# Combat settings
FLEE_CHANCE = 0.3

# Attack pool - format: (name, power, accuracy)
ATTACK_POOL = [
    ("Slash", 15, 0.9),
    ("Fireball", 25, 0.7),
    ("Ice Shard", 20, 0.8),
    ("Lightning Bolt", 30, 0.6),
    ("Punch", 10, 0.95),
    ("Kick", 12, 0.85),
    ("Bite", 8, 1.0),
    ("Headbutt", 14, 0.75),
    ("Energy Blast", 35, 0.5),
    ("Poison Dart", 18, 0.8),
    ("Holy Strike", 20, 0.85),
    ("Shadow Strike", 18, 0.9),
    ("Thunder Slash", 22, 0.75),
    ("Frostbite", 20, 0.85),
    ("Blaze Kick", 25, 0.7)
]

# Colors
COLORS = {
    'player': 1,
    'wall': 2,
    'floor': 3,
    'exit': 4,
    'enemy': 5,
    'potion': 6,
    'rare_potion': 7,
    'key': 8,
    'altar': 10,
    'text': 9,
    'glyph': 18
}

CONTEMPLATIONS = [
    "The air smells of myrrh and yesterday's regrets.",
    "A mirror-lined corridor reflects every promise you broke.",
    "Wind reshapes the walls; the stone forgets faster than you.",
    "You step on broken glass that once was your certainty.",
    "The torchlight flickers in Morse: 'Whom do you trust at midnight?'",
    "A choir sings in a language you almost remember from before birth.",
    "The floor warms under bare feet—like coals, like conviction.",
    "Behind the next door: the laugh you used to disguise as courage."
]