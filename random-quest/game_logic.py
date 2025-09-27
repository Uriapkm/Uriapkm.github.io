#!/usr/bin/env python3
"""
Game-logic layer – updated with fixes for attack learning, key placement, and enemy movement
"""
import random
import traceback
from entities import Enemy, Potion, RarePotion, Key, Altar, Glyph
from config import (ENEMY_SYMBOLS, MAX_LEVELS, BOSS_SYMBOL, MAX_ROOMS,
                    ROOM_MIN_SIZE, ROOM_MAX_SIZE, CONTEMPLATIONS)
from map_generator import GameMap, Rect

class GameLogic:
    def __init__(self, game_map, player, entities, items):
        self.game_map = game_map
        self.player = player
        self.entities = entities
        self.items = items
        self.entity_map = {(player.x, player.y): player}
        self.item_map = {}
        self.game_state = 'playing'
        self.current_enemy = None
        self.message_log = []
        self.fov_radius = 7
        self.current_level = 1
        self.altar_triggered = False
        self._stdscr = None
        self.renderer = None
        self.game = None

    def update_entity_position(self, entity, old_x, old_y, new_x, new_y):
        if (old_x, old_y) in self.entity_map:
            del self.entity_map[(old_x, old_y)]
        self.entity_map[(new_x, new_y)] = entity

    def update_item_position(self, item, old_x, old_y, new_x, new_y):
        if (old_x, old_y) in self.item_map:
            del self.item_map[(old_x, old_y)]
        self.item_map[(new_x, new_y)] = item

    def is_occupied(self, x, y):
        if self.game_map.is_blocked(x, y):
            return True
        if (x, y) == (self.player.x, self.player.y):
            return True
        return (x, y) in self.entity_map

    def get_entity_at_location(self, x, y):
        try:
            return self.entity_map.get((x, y))
        except Exception as e:
            self._log_error("get_entity_at_location", e)
            return None

    def get_item_at_location(self, x, y):
        try:
            return self.item_map.get((x, y))
        except Exception as e:
            self._log_error("get_item_at_location", e)
            return None

    def add_message(self, message):
        self.message_log.append(message)
        if len(self.message_log) > 6:
            self.message_log.pop(0)

    def _log_error(self, func_name, exception):
        self.add_message(f"Error in {func_name}: see error_log.txt")
        with open("error_log.txt", "a") as f:
            f.write(f"{func_name} error at level {self.current_level}: {exception}\n")
            f.write(traceback.format_exc() + "\n")

    def move_player(self, dx, dy):
        if self.game_state != 'playing':
            return
        try:
            new_x, new_y = self.player.x + dx, self.player.y + dy
            if self.game_map.is_blocked(new_x, new_y):
                return
            item = self.get_item_at_location(new_x, new_y)
            if item:
                self.pick_up_item(item)
                old_x, old_y = self.player.x, self.player.y
                self.player.x, self.player.y = new_x, new_y
                self.update_entity_position(self.player, old_x, old_y, new_x, new_y)
                self.move_entities()
                if random.random() < 0.001:  # 0.1% chance for contemplation
                    self.add_message(random.choice(CONTEMPLATIONS))
                return
            entity = self.get_entity_at_location(new_x, new_y)
            if entity:
                if isinstance(entity, Enemy):
                    self.start_combat(entity)
                else:
                    self.add_message(f"There's a {entity.name} here.")
                return
            old_x, old_y = self.player.x, self.player.y
            self.player.x, self.player.y = new_x, new_y
            self.update_entity_position(self.player, old_x, old_y, new_x, new_y)
            self.explore_area(new_x, new_y)
            if not self.altar_triggered and random.random() < 0.005:
                self.trigger_rare_event(new_x, new_y)
            self.move_entities()
            if random.random() < 0.001:  # 0.1% chance for contemplation
                self.add_message(random.choice(CONTEMPLATIONS))
            self.game_state = 'playing'
        except Exception as e:
            self._log_error("move_player", e)

    def pick_up_item(self, item):
        try:
            if isinstance(item, Potion):
                self.player.inventory['potions'] += 1
                self.items.remove(item)
                del self.item_map[(item.x, item.y)]
                self.add_message(f"You picked up a {item.name}.")
            elif isinstance(item, RarePotion):
                self.player.inventory['rare_potions'] += 1
                self.items.remove(item)
                del self.item_map[(item.x, item.y)]
                self.add_message(f"You picked up a {item.name}.")
            elif isinstance(item, Key):
                self.player.inventory['key'] = True
                self.items.remove(item)
                del self.item_map[(item.x, item.y)]
                self.add_message("You found the dungeon key!")
            elif isinstance(item, Altar):
                msg, new_attack = item.use(self.player)
                self.items.remove(item)
                del self.item_map[(item.x, item.y)]
                self.add_message(f"You approach the {item.name}. {msg}")
                if new_attack:
                    self._handle_new_attack(new_attack)
                self.altar_triggered = True
            elif isinstance(item, Glyph):
                self.player.exp += 10
                self.items.remove(item)
                del self.item_map[(item.x, item.y)]
                self.add_message("You absorbed a Mystic Glyph, gaining 10 EXP!")
        except Exception as e:
            self._log_error("pick_up_item", e)

    def use_potion(self):
        try:
            if self.player.inventory['potions'] > 0:
                pot = Potion(0, 0)
                amt = pot.use(self.player)
                self.player.inventory['potions'] -= 1
                self.add_message(f"You used a potion and healed {amt} HP.")
                return True
            else:
                self.add_message("You don't have any potions!")
                return False
        except Exception as e:
            self._log_error("use_potion", e)
            return False

    def use_rare_potion(self):
        try:
            if self.player.inventory['rare_potions'] > 0:
                pot = RarePotion(0, 0)
                msg = pot.use(self.player)
                self.player.inventory['rare_potions'] -= 1
                self.add_message(f"You used a rare potion! {msg}")
                return True
            else:
                self.add_message("You don't have any rare potions!")
                return False
        except Exception as e:
            self._log_error("use_rare_potion", e)
            return False

    def start_combat(self, enemy):
        try:
            self.game_state = 'combat'
            self.current_enemy = enemy
            self.add_message(f"Combat started with {enemy.name}!")
            for msg in enemy.apply_status_effects():
                self.add_message(msg)
        except Exception as e:
            self._log_error("start_combat", e)

    def end_combat(self, player_won):
        try:
            self.player.attack_repeat = [0] * 4  # Reset repeat counters
            if player_won:
                exp = 5 * self.current_enemy.level
                if self.current_enemy.is_elite:
                    exp *= 2
                    if random.random() < 0.5:
                        self.player.inventory['rare_potions'] += 1
                        self.add_message("The elite enemy dropped a Rare Potion!")
                elif self.current_enemy.is_boss:
                    exp *= 3
                    self.game_state = 'victory'
                self.entities.remove(self.current_enemy)
                del self.entity_map[(self.current_enemy.x, self.current_enemy.y)]
                hp_up, atk_up, def_up, new_attack = self.player.add_exp(exp)
                msg = f"You gained {exp} EXP!"
                if hp_up or atk_up or def_up:
                    msg += f" (HP +{hp_up}, ATK +{atk_up}, DEF +{def_up})"
                self.add_message(msg)
                if new_attack:
                    if self.player.try_learn_attack(new_attack, self.renderer, self._stdscr):
                        self.add_message(f"You learned {new_attack[0]}!")
                    else:
                        self.add_message(f"You declined to learn {new_attack[0]}.")
            else:
                self.add_message("You were defeated...")
            self.game_state = 'playing' if player_won else 'game_over'
            self.current_enemy = None
        except Exception as e:
            self._log_error("end_combat", e)

    def get_enemy_detection_range(self, enemy):
        base = 5 if not enemy.is_boss else 10
        return base + (2 if enemy.is_elite else 0)

    def enemy_make_noise(self, enemy):
        px, py = self.player.x, self.player.y
        det = self.get_enemy_detection_range(enemy)
        for other in self.entities:
            if (isinstance(other, Enemy) and other != enemy and
                other.is_alive() and not other.is_boss):
                if max(abs(other.x - enemy.x), abs(other.y - enemy.y)) <= det + 2:
                    other._alerted_timer = 3
                    other._alerted_range = det

    def move_entities(self):
        if self.game_state not in ['playing']:
            return
        px, py = self.player.x, self.player.y
        for e in self.entities[:]:
            if not isinstance(e, Enemy) or not e.is_alive():
                continue
            if getattr(e, '_alerted_timer', 0) > 0:
                det = e._alerted_range
                e._alerted_timer -= 1
            else:
                det = self.get_enemy_detection_range(e)
            dist = max(abs(e.x - px), abs(e.y - py))
            if dist <= det:
                if not hasattr(e, '_already_alerted'):
                    self.enemy_make_noise(e)
                    e._already_alerted = True
                move = self.find_best_move_towards_player(e, px, py)
                if move:
                    old_x, old_y = e.x, e.y
                    e.move(*move)
                    self.update_entity_position(e, old_x, old_y, e.x, e.y)
                else:
                    self.move_enemy_randomly(e)
            elif dist <= 8 and random.random() < 0.3:  # Adjusted for balance
                self.move_enemy_randomly(e)

    def find_best_move_towards_player(self, enemy, px, py):
        dx = (enemy.x < px) - (enemy.x > px)
        dy = (enemy.y < py) - (enemy.y > py)
        for mx, my in [(dx, dy), (dx, 0), (0, dy), (0, -dy), (-dx, 0), (-dx, -dy)]:
            nx, ny = enemy.x + mx, enemy.y + my
            if not self.is_occupied(nx, ny):
                return (mx, my)
        return None

    def move_enemy_randomly(self, enemy):
        for dx, dy in random.sample([(1,0),(-1,0),(0,1),(0,-1)], 4):
            nx, ny = enemy.x + dx, enemy.y + dy
            if not self.is_occupied(nx, ny):
                old_x, old_y = enemy.x, enemy.y
                enemy.move(dx, dy)
                self.update_entity_position(enemy, old_x, old_y, enemy.x, enemy.y)
                break

    def explore_area(self, center_x, center_y):
        try:
            r = self.fov_radius
            for x in range(center_x - r, center_x + r + 1):
                for y in range(center_y - r, center_y + r + 1):
                    if (0 <= x < self.game_map.width and
                        0 <= y < self.game_map.height and
                        (x - center_x)**2 + (y - center_y)**2 <= r*r):
                        self.game_map.tiles[x][y]['explored'] = True
        except Exception as e:
            self._log_error("explore_area", e)

    def trigger_rare_event(self, x, y):
        try:
            if not any(it.x == x and it.y == y for it in self.items):
                altar = Altar(x, y)
                self.items.append(altar)
                self.item_map[(x, y)] = altar
                self.add_message("A Mysterious Altar appears before you!")
        except Exception as e:
            self._log_error("trigger_rare_event", e)

    def populate_map(self, num_enemies, num_items):
        try:
            for i in range(num_enemies):
                room = random.choice(self.game_map.rooms[-3:] if i < num_enemies // 2 else self.game_map.rooms)
                x = random.randint(room.x1 + 1, room.x2 - 1)
                y = random.randint(room.y1 + 1, room.y2 - 1)
                if (x, y) in self.entity_map:
                    continue
                level_roll = random.random()
                base_level = self.player.level + self.current_level
                if level_roll < 0.5:
                    level = max(1, base_level - 1)
                elif level_roll < 0.8:
                    level = base_level
                elif level_roll < 0.9:
                    level = base_level + 1
                else:
                    level = base_level + 2
                level = max(1, level)
                is_elite = random.random() < 0.2 and i < num_enemies // 2
                enemy_type = random.choice(ENEMY_SYMBOLS)
                enemy_name = f"Level {level} {self.get_enemy_name(enemy_type)}"
                enemy = Enemy(x, y, enemy_type, enemy_name, level, is_elite)
                self.entities.append(enemy)
                self.entity_map[(x, y)] = enemy
                with open("error_log.txt", "a") as f:
                    f.write(f"Enemy created: {enemy_name}, Level: {level}, Base Level: {base_level}, Roll: {level_roll}\n")

            if self.current_level == MAX_LEVELS:
                room = self.game_map.rooms[-1]
                x = random.randint(room.x1 + 1, room.x2 - 1)
                y = random.randint(room.y1 + 1, room.y2 - 1)
                if (x, y) not in self.entity_map:
                    boss = Enemy(x, y, BOSS_SYMBOL, "Archdragon", self.player.level + 5, is_boss=True)
                    self.entities.append(boss)
                    self.entity_map[(x, y)] = boss
                self.game_map.exits = []

            # Place key in a random room, excluding the player's starting room
            placed = False
            exit_tiles = set(self.game_map.exits)
            non_starting_rooms = self.game_map.rooms[1:]  # Exclude first room (player's starting room)
            if non_starting_rooms:  # Check if there are other rooms
                random.shuffle(non_starting_rooms)  # Shuffle to randomize room selection
                for room in non_starting_rooms:
                    for x in range(room.x1 + 1, room.x2):
                        for y in range(room.y1 + 1, room.y2):
                            if (x, y) in exit_tiles or (x, y) in self.entity_map or (x, y) in self.item_map:
                                continue
                            key = Key(x, y)
                            self.items.append(key)
                            self.item_map[(x, y)] = key
                            placed = True
                            break
                        if placed:
                            break
                    if placed:
                        break
            if not placed:
                # Fallback: try all rooms if non-starting rooms fail
                for room in self.game_map.rooms:
                    for x in range(room.x1 + 1, room.x2):
                        for y in range(room.y1 + 1, room.y2):
                            if (x, y) in exit_tiles or (x, y) in self.entity_map or (x, y) in self.item_map:
                                continue
                            key = Key(x, y)
                            self.items.append(key)
                            self.item_map[(x, y)] = key
                            placed = True
                            break
                        if placed:
                            break
                    if placed:
                        break
                if not placed:
                    self.add_message("Warning: Could not place key! Check error_log.txt")
                    with open("error_log.txt", "a") as f:
                        f.write("Failed to place key in populate_map\n")

            for i in range(num_items - 1):
                room = random.choice(self.game_map.rooms)
                x = random.randint(room.x1 + 1, room.x2 - 1)
                y = random.randint(room.y1 + 1, room.y2 - 1)
                if (x, y) in self.entity_map or (x, y) in self.item_map:
                    continue
                item = Potion(x, y) if random.random() < 0.8 else RarePotion(x, y)
                self.items.append(item)
                self.item_map[(x, y)] = item

            if random.random() < 0.2:
                room = random.choice(self.game_map.rooms)
                x = random.randint(room.x1 + 1, room.x2 - 1)
                y = random.randint(room.y1 + 1, room.y2 - 1)
                if (x, y) not in self.entity_map and (x, y) not in self.item_map:
                    glyph = Glyph(x, y)
                    self.items.append(glyph)
                    self.item_map[(x, y)] = glyph
        except Exception as e:
            self._log_error("populate_map", e)

    def get_enemy_name(self, symbol):
        return {"g": "Goblin", "o": "Orc", "t": "Troll", "d": "Dragon"}.get(symbol, "Creature")

    def _handle_new_attack(self, new_attack):
        if self.player.try_learn_attack(new_attack, self.renderer, self._stdscr):
            self.add_message(f"You learned {new_attack[0]}!")
        else:
            self.add_message(f"You declined to learn {new_attack[0]}.")