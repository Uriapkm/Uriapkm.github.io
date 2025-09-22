import random
import traceback
from config import ATTACK_POOL, GLYPH_SYMBOL, PLAYER_BASE_STATS

class Entity:
    def __init__(self, x, y, symbol, name, hp, attack, defense):
        self.x, self.y = x, y
        self.symbol, self.name = symbol, name
        self.max_hp = hp
        self.hp = hp
        self.attack = attack
        self.defense = defense
        self.attacks = []
        self.status_effects = []

    def is_alive(self):
        return self.hp > 0

    def move(self, dx, dy):
        self.x += dx
        self.y += dy

    def apply_status_effects(self):
        messages = []
        to_remove = []
        for effect in self.status_effects:
            typ, turns, val = effect
            if typ in ('poison', 'burn'):
                old_hp = self.hp
                self.hp = max(1, self.hp - val)
                actual = old_hp - self.hp
                messages.append(f"{self.name} suffers {actual} damage from {typ}!")
            turns -= 1
            if turns <= 0:
                to_remove.append(effect)
            else:
                effect[1] = turns
        for effect in to_remove:
            self.status_effects.remove(effect)
        return messages

class Player(Entity):
    def __init__(self, x, y):
        hp = random.randint(30, 60)
        attack = random.randint(20, 40)
        defense = max(5, PLAYER_BASE_STATS - hp - attack)
        attack = PLAYER_BASE_STATS - hp - defense  # Ensure sum = 100
        super().__init__(x, y, '@', 'Player', hp, attack, defense)
        self.strength = self.attack
        self.intelligence = self.defense
        self.armor = self.defense
        self.level = 1
        self.exp = 0
        self.exp_to_level = 10
        self.inventory = {'potions': 0, 'rare_potions': 0, 'key': False}
        self.attacks = random.sample(ATTACK_POOL, min(4, len(ATTACK_POOL)))
        self.attack_repeat = [0] * 4
        self._pending_attack = None
        with open("error_log.txt", "a") as f:
            f.write(f"Player initialized with HP: {hp}, Attack: {attack}, Defense: {defense}, Attacks: {[a[0] for a in self.attacks]}\n")

    def choose_attack_to_replace(self, new_attack, renderer, stdscr):
        h, w = stdscr.getmaxyx()
        menu_h, menu_w = min(9, h - 2), min(52, w - 4)
        start_y, start_x = (h - menu_h) // 2, (w - menu_w) // 2
        if menu_h < 7 or menu_w < 30:
            with open("error_log.txt", "a") as f:
                f.write(f"choose_attack_to_replace: Terminal too small (h={h}, w={w})\n")
            return False
        options = self.attacks + [f"Skip learning {new_attack[0]}"]
        while True:
            try:
                stdscr.clear()
                renderer.draw_box(start_x, start_y, menu_w, menu_h,
                                title=f"Learn {new_attack[0]}?")
                for idx, atk in enumerate(options):
                    if idx < 4:
                        line = f"{idx+1}) {atk[0]} (PWR:{atk[1]} ACC:{int(atk[2]*100)}%)"
                    else:
                        line = f"{idx+1}) {atk}"
                    if start_y + 2 + idx < h:
                        stdscr.addstr(start_y + 2 + idx, start_x + 2, line[:menu_w - 4])
                stdscr.refresh()
                key = stdscr.getch()
                if key in (27, ord('0'), ord('q'), ord('5')):
                    return False
                if ord('1') <= key <= ord('4'):
                    replace_idx = key - ord('1')
                    self.attacks[replace_idx] = new_attack
                    self.attack_repeat[replace_idx] = 0  # Reset repeat counter
                    with open("error_log.txt", "a") as f:
                        f.write(f"choose_attack_to_replace: Replaced attack at index {replace_idx} with {new_attack[0]}\n")
                    return True
                with open("error_log.txt", "a") as f:
                    f.write(f"choose_attack_to_replace: Invalid key {key}\n")
            except Exception as e:
                with open("error_log.txt", "a") as f:
                    f.write(f"choose_attack_to_replace error: {str(e)}\n")
                    f.write(traceback.format_exc() + "\n")
                return False

    def try_learn_attack(self, new_attack, renderer, stdscr):
        if new_attack in self.attacks:
            with open("error_log.txt", "a") as f:
                f.write(f"try_learn_attack: {new_attack[0]} already known\n")
            return True
        if len(self.attacks) < 4:
            self.attacks.append(new_attack)
            self.attack_repeat.append(0)
            with open("error_log.txt", "a") as f:
                f.write(f"try_learn_attack: Added {new_attack[0]} directly\n")
            return True
        if stdscr is None or renderer is None:
            with open("error_log.txt", "a") as f:
                f.write(f"try_learn_attack: stdscr or renderer is None\n")
            return False
        return self.choose_attack_to_replace(new_attack, renderer, stdscr)

    def add_exp(self, amt):
        self.exp += amt
        hp_up, atk_up, def_up, new = 0, 0, 0, None
        while self.exp >= self.exp_to_level:
            ret = self.level_up()
            hp_up += ret[0]
            atk_up += ret[1]
            def_up += ret[2]
            new = ret[3] or new
        return (hp_up, atk_up, def_up, new)

    def level_up(self):
        self.level += 1
        self.exp -= self.exp_to_level
        self.exp_to_level = int(self.exp_to_level * 1.5)
        hp_up = random.randint(5, 15)
        atk_up = random.randint(3, 8)
        def_up = random.randint(3, 8)
        self.max_hp += hp_up; self.hp += hp_up
        self.attack += atk_up; self.defense += def_up
        self.hp = min(self.max_hp, self.hp + int(self.max_hp * 0.3))
        new_attack = None
        if random.random() < 0.1:
            pool = [a for a in ATTACK_POOL if a not in self.attacks]
            if pool:
                new_attack = random.choice(pool)
                with open("error_log.txt", "a") as f:
                    f.write(f"level_up: Offered new attack {new_attack[0]}, current attacks: {[a[0] for a in self.attacks]}, pool: {[a[0] for a in pool]}\n")
            else:
                stat = random.choice(['hp', 'attack', 'defense'])
                if stat == 'hp':
                    self.max_hp += 10
                    self.hp = min(self.max_hp, self.hp + 10)
                    with open("error_log.txt", "a") as f:
                        f.write(f"level_up: No new attacks available, boosted {stat} by 10\n")
                elif stat == 'attack':
                    self.attack += 5
                    with open("error_log.txt", "a") as f:
                        f.write(f"level_up: No new attacks available, boosted {stat} by 5\n")
                else:
                    self.defense += 5
                    with open("error_log.txt", "a") as f:
                        f.write(f"level_up: No new attacks available, boosted {stat} by 5\n")
        return hp_up, atk_up, def_up, new_attack

class Enemy(Entity):
    def __init__(self, x, y, symbol, name, level, is_elite=False, is_boss=False):
        level = max(1, level)
        base_hp = 30 + level * 10
        base_atk = 28 + level * 4
        base_def = level
        hp, atk, df = base_hp + random.randint(-3, 3), \
                      base_atk + random.randint(-3, 2), \
                      base_def + random.randint(-0, 2)
        if is_elite:
            hp, atk, df = int(hp * 4), int(atk * 2), int(df * 1)
            symbol = symbol.upper()
            name = f"Elite {name}"
        if is_boss:
            hp, atk, df = int(hp * 6), int(atk * 4), int(df * 2)
            symbol, name = 'A', "Archdragon"
        super().__init__(x, y, symbol, name, hp, atk, df)
        self.armor = self.defense
        self.level, self.is_elite, self.is_boss = level, is_elite, is_boss
        self._alerted_timer = 0
        self._alerted_range = 0
        self.attacks = []
        t = symbol.lower()
        if is_boss:
            self.attacks += [("Dragon's Wrath", 30 + level * 3, 0.7),
                             ("Inferno Blast", 25 + level * 2, 0.65)]
        elif t == 'g':
            self.attacks += [("Poison Sting", 8 + level, 0.85),
                             ("Quick Slash", 5 + level, 0.95)]
        elif t == 'o':
            self.attacks += [("Brutal Smash", 15 + level * 2, 0.65),
                             ("Club Swing", 10 + level, 0.8)]
        elif t == 't':
            self.attacks += [("Heavy Slam", 12 + level, 0.75),
                             ("Regenerate", 0, 1.0)]
        elif t == 'd':
            self.attacks += [("Fire Breath", 15 + level * 2, 0.7),
                             ("Claw Strike", 10 + level, 0.8)]
        for i in range(min(level, 2)):
            pwr = random.randint(5, 10 + level * 2)
            acc = max(0.5, 0.9 - level * 0.05)
            self.attacks.append((f"{name} Special {i+1}", pwr, acc))

class Item:
    def __init__(self, x, y, symbol, name):
        self.x, self.y, self.symbol, self.name = x, y, symbol, name

class Glyph(Item):
    def __init__(self, x, y):
        super().__init__(x, y, GLYPH_SYMBOL, 'Mystic Glyph')

class Potion(Item):
    def __init__(self, x, y):
        super().__init__(x, y, '!', 'Health Potion')
    def use(self, player):
        heal = player.max_hp // 2
        player.hp = min(player.max_hp, player.hp + heal)
        return heal

class RarePotion(Item):
    def __init__(self, x, y):
        super().__init__(x, y, '*', 'Rare Potion')
    def use(self, player):
        player.attack_repeat = [0] * len(player.attacks)
        return "Your attack accuracies have been restored to their original values!"

class Key(Item):
    def __init__(self, x, y):
        super().__init__(x, y, 'k', 'Dungeon Key')

class Altar(Item):
    def __init__(self, x, y):
        super().__init__(x, y, '%', 'Mysterious Altar')
    def use(self, player):
        if random.random() < 0.5:
            stat = random.choice(['hp', 'attack', 'defense'])
            if stat == 'hp':
                player.max_hp += 15
                player.hp = min(player.max_hp, player.hp + 15)
                return "The altar blesses you with vitality! (+15 HP)", None
            elif stat == 'attack':
                player.attack += 8
                return "The altar enhances your strength! (+8 ATK)", None
            else:
                player.defense += 8
                return "The altar fortifies your resilience! (+8 DEF)", None
        else:
            new = ("Divine Wrath", 22, 0.8)
            return "The altar offers you a sacred technique!", new