#!/usr/bin/env python3
import curses
import random
import traceback
import time
from entities import Player
from map_generator import GameMap
from game_logic import GameLogic
from render import Renderer
from combat import CombatSystem
from config import (MAP_WIDTH, MAP_HEIGHT, MAX_ROOMS, ROOM_MIN_SIZE,
                    ROOM_MAX_SIZE, MAX_LEVELS)

class Game:
    def __init__(self, stdscr):
        self.stdscr = stdscr
        self.renderer = Renderer(stdscr)
        self.reset_game()

    # -------------------- init / reset --------------------
    def reset_game(self):
        try:
            self.player = Player(0, 0)
            self.game_map = GameMap(MAP_WIDTH, MAP_HEIGHT)
            self.entities = [self.player]
            self.items = []
            self.current_level = 1
            self.game_map.rooms = self.game_map.make_map(
                MAX_ROOMS, ROOM_MIN_SIZE, ROOM_MAX_SIZE,
                MAP_WIDTH, MAP_HEIGHT, self.player
            )
            self.game_logic = GameLogic(self.game_map, self.player, self.entities, self.items)
            self.game_logic._stdscr = self.stdscr
            self.game_logic.renderer = self.renderer
            self.game_logic.game = self
            num_enemies = random.randint(5, 10)
            num_items = random.randint(3, 6)
            self.game_logic.populate_map(num_enemies, num_items)
            self.game_logic.explore_area(self.player.x, self.player.y)
            self.game_logic.add_message("Welcome, adventurer! Press 'q' to quit.")
            self.game_logic.add_message("You see a path forward. Find the exit!")
        except Exception as e:
            with open("error_log.txt", "a") as f:
                f.write(f"Game initialization error: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            self.game_logic.add_message("An error occurred during game initialization. Check the log.")

    # -------------------- front page --------------------
    def show_front_page(self):
        self.stdscr.nodelay(False)
        while True:
            try:
                self.stdscr.clear()
                h, w = self.stdscr.getmaxyx()
                if h < 8 or w < 40:
                    self.stdscr.addstr(0, 0, "Terminal too small! Resize to at least 40x8.", curses.color_pair(9))
                    self.stdscr.refresh()
                    time.sleep(0.1)
                    continue

                title = "Dungeon of the Arcane Depths"
                ascii_art = [
                    "        ╔════════════════════╗        ",
                    "        ║       + + + +      ║        ",
                    "        ║    ARCANE DEPTHS   ║        ",
                    "        ║       + + + +      ║        ",
                    "        ╚════════════════════╝        ",
                    "     ┌───╦════╦═══╦═╗╦╦╦══╦═══╗     ",
                    "     │┌─╦╬╦╦╦╦╬╦╗╠╗╚╩╩╩══╩══╦╦╗     ",
                    "     └┴┴╩╩╩╩╩╬╬╬╬╬╦╗╠══╦╦╦╦╬╬╬╦╦╗     ",
                    "     ╔╦═╩╩╩╩╩╩╩╬╬╬╩╩╩╩══╩╩╩╩╩╩╩╩╩╗     ",
                    "     ╚╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╝     "
                ]
                lore = [
                    "Humble seeker, in the stillness of thy sacred vigil, a labyrinth blooms within."  
                    "Ten winding paths, like relics of old saints, spiral through thy spirit’s core. " 
                    "Goblins, cloaked in whispered deceits, dart through shadows; orcs, fueled by ancient wrath, rend the air;"
                    "trolls, heavy with sloth’s burden, block the way; and dragons, aglow with lust’s fierce ember, roar—each a mirror of thy soul’s struggle."
                    "With mercy as thy sword, find the Key of Faith to pass each hallowed arch."
                    "At the summit, the Archdragon, pride’s towering herald, awaits in solemn judgment."
                    "Triumph, and the maze yields to eternal dawn:"
                    "thy journey, a pilgrim’s hymn sung in the heart’s quiet cathedral."
                    "A game by Asier Uria all suggestions and feedback: asieruria1@gmail.com"
                ]
                instructions = [
                    "How to Play:",
                    "- Move: W/A/S/D or Arrow Keys",
                    "- Attack: 1-4 to use abilities",
                    "- Use Potion: 5 (Health), 6 (Rare)",
                    "- Flee: 7 (30% chance)",
                    "- Quit: Q, Restart: R",
                    "- Find Key, unlock exit, defeat Archdragon on 10th floor."
                ]
                prompt = "Press SPACE to start..."

                content_w = min(w - 4, 60)
                y = 1
                if y < h:
                    self.stdscr.addstr(y, max(0, (w - len(title)) // 2), title,
                                     curses.color_pair(1) | curses.A_BOLD)
                y += 2
                for line in ascii_art:
                    if y < h:
                        self.stdscr.addstr(y, max(0, (w - len(line)) // 2), line,
                                         curses.color_pair(1))
                        y += 1
                y += 1
                for line in lore:
                    if y < h:
                        for wrapped in self.wrap_text(line, content_w):
                            if y < h:
                                self.stdscr.addstr(y, max(0, (w - len(wrapped)) // 2),
                                                 wrapped, curses.color_pair(9))
                                y += 1
                y += 1
                for line in instructions:
                    if y < h:
                        self.stdscr.addstr(y, max(0, (w - len(line)) // 2), line,
                                         curses.color_pair(9) |
                                         (curses.A_BOLD if line == "How to Play:" else 0))
                        y += 1
                y += 1
                if y < h:
                    self.stdscr.addstr(y, max(0, (w - len(prompt)) // 2), prompt,
                                     curses.color_pair(9) | curses.A_DIM)
                self.stdscr.refresh()
                time.sleep(0.1)
                try:
                    key = self.stdscr.getch()
                    if key == 32:          # SPACE
                        break
                    elif key == curses.KEY_RESIZE:
                        continue
                except curses.error:
                    pass
            except Exception as e:
                with open("error_log.txt", "a") as f:
                    f.write(f"Front page rendering error: {str(e)}\n")
                    f.write(traceback.format_exc() + "\n")

    def wrap_text(self, text, max_w):
        words, lines, cur = text.split(), [], ""
        for w in words:
            if len(cur) + len(w) + 1 <= max_w:
                cur += w + " "
            else:
                lines.append(cur.strip())
                cur = w + " "
        if cur:
            lines.append(cur.strip())
        return lines

    # -------------------- input --------------------
    def handle_input(self, key):
        if self.game_logic.game_state == 'playing':
            dx = dy = 0
            if key in (curses.KEY_UP, ord('w')):
                dy = -1
            elif key in (curses.KEY_DOWN, ord('s')):
                dy = 1
            elif key in (curses.KEY_LEFT, ord('a')):
                dx = -1
            elif key in (curses.KEY_RIGHT, ord('d')):
                dx = 1
            elif key == ord('q'):
                return False
            elif key == ord('r'):
                self.reset_game()
                return True

            if self.current_level < MAX_LEVELS and (self.player.x + dx, self.player.y + dy) in self.game_map.exits:
                if self.player.inventory['key']:
                    self.game_logic.add_message("You used the key to unlock the exit and descend to the next level!")
                    self.next_level()
                else:
                    self.game_logic.add_message("The exit is locked. You need a key.")
                return True

            if dx or dy:
                self.game_logic.move_player(dx, dy)

        elif self.game_logic.game_state == 'combat':
            if key in [ord(str(i)) for i in range(1, 5)]:
                atk_idx = int(chr(key)) - 1
                cs = CombatSystem(self.player, self.game_logic.current_enemy)
                dmg, msg, dead = cs.player_attack(atk_idx)
                self.game_logic.add_message(msg)
                if not dead and self.game_logic.current_enemy.is_alive():
                    dmg, msg = cs.enemy_attack()
                    self.game_logic.add_message(msg)
                elif dead:
                    self.game_logic.end_combat(player_won=True)
                self.player.apply_status_effects()
            elif key == ord('5'):
                self.game_logic.use_potion()
            elif key == ord('6'):                       # Rare potion
                if self.game_logic.use_rare_potion():
                    cs = CombatSystem(self.player, self.game_logic.current_enemy)
                    dmg, msg = cs.enemy_attack()
                    self.game_logic.add_message(msg)
            elif key == ord('7'):                       # Flee
                cs = CombatSystem(self.player, self.game_logic.current_enemy)
                ok, msg = cs.attempt_flee()
                self.game_logic.add_message(msg)
                if ok:
                    self.game_logic.game_state = 'playing'
        return True

    # -------------------- level change --------------------
    def next_level(self):
        try:
            self.current_level += 1
            self.game_logic.current_level = self.current_level
            self.game_map = GameMap(MAP_WIDTH, MAP_HEIGHT)
            self.entities = [self.player]
            self.items = []
            self.player.inventory['key'] = False
            self.game_map.rooms = self.game_map.make_map(
                MAX_ROOMS, ROOM_MIN_SIZE, ROOM_MAX_SIZE,
                MAP_WIDTH, MAP_HEIGHT, self.player
            )
            self.game_logic.game_map = self.game_map
            self.game_logic.entities = self.entities
            self.game_logic.items = self.items
            self.game_logic.entity_map = {(self.player.x, self.player.y): self.player}
            self.game_logic.item_map = {}
            ne = random.randint(5 + self.current_level, 10 + self.current_level)
            ni = random.randint(3 + self.current_level // 2, 6 + self.current_level // 2)
            self.game_logic.populate_map(ne, ni)
            self.game_logic.explore_area(self.player.x, self.player.y)
            self.game_logic.add_message(f"You have entered Level {self.current_level}!")
        except Exception as e:
            with open("error_log.txt", "a") as f:
                f.write(f"Next level error: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            self.game_logic.add_message("Error advancing to next level!")

    # -------------------- victory sequence --------------------
    def victory_sequence(self):
        lore = [
            "The Archdragon's final roar dissolves into silence.",
            "Its scales crumble into ash that smells of myrrh and old regrets.",
            "The dungeon walls begin to sing in a language you almost remember from before birth.",
            "Step by step the stone stairs unfold toward a sky made of quiet light.",
            "You climb; the maze dissolves behind you like a prayer you had not yet named.",
            "At the summit there is no gate—only the open horizon of a heart unmasked.",
            "Theosis: you are not escaping the depths, you are transcending them.",
            "Press SPACE to carry this light into a new ascent… or R to begin again."
        ]
        self.stdscr.nodelay(False)
        for line in lore:
            while True:
                self.stdscr.clear()
                h, w = self.stdscr.getmaxyx()
                self.stdscr.addstr(h//2, max(0, (w-len(line))//2), line,
                                 curses.color_pair(1)|curses.A_BOLD)
                self.stdscr.refresh()
                key = self.stdscr.getch()
                if key == 32:                # SPACE
                    break
                elif key == ord('r') or key == ord('R'):
                    self.reset_game()
                    return

    # -------------------- game over sequence --------------------
    def game_over_sequence(self):
        lore = [
            "The dungeon's shadows claim you, their weight heavier than stone. Press R to rise again, or Q to rest in silence."
        ]
        self.stdscr.nodelay(False)
        for line in lore:
            while True:
                self.stdscr.clear()
                h, w = self.stdscr.getmaxyx()
                if h < 8 or w < 40:
                    self.stdscr.addstr(0, 0, "Terminal too small! Resize to at least 40x8.",
                                     curses.color_pair(9))
                    self.stdscr.refresh()
                    time.sleep(0.1)
                    continue
                self.stdscr.addstr(h//2, max(0, (w-len(line))//2), line,
                                 curses.color_pair(12)|curses.A_BOLD)  # Red for game over
                self.stdscr.refresh()
                try:
                    key = self.stdscr.getch()
                    if key in (ord('r'), ord('R')):
                        self.reset_game()
                        return True
                    elif key in (ord('q'), ord('Q')):
                        return False
                    elif key == curses.KEY_RESIZE:
                        continue
                except curses.error:
                    pass
        return True

    # -------------------- main loop --------------------
    def run(self):
        self.show_front_page()
        while True:
            try:
                self.stdscr.clear()
                if not self.player.is_alive():
                    self.game_logic.game_state = 'game_over'

                if self.game_logic.game_state == 'game_over':
                    if not self.game_over_sequence():
                        break
                    continue
                elif self.game_logic.game_state == 'victory':
                    self.victory_sequence()
                    break

                if self.game_logic.game_state == 'combat':
                    self.renderer.combat_mode = True
                    cs = CombatSystem(self.player, self.game_logic.current_enemy)
                    self.renderer.render_combat_screen(cs, self.player.attacks,
                                                     curses.COLS, curses.LINES)
                else:
                    self.renderer.combat_mode = False
                    self.renderer.render_all(self.game_map, self.entities, self.items,
                                           self.game_logic.message_log, self.player,
                                           self.game_logic)

                self.stdscr.refresh()
                self.stdscr.nodelay(True)
                try:
                    key = self.stdscr.getch()
                    if key == -1:
                        continue
                    if key == curses.KEY_RESIZE:
                        self.stdscr.clear()
                        continue
                    if not self.handle_input(key):
                        break
                except curses.error:
                    pass
            except Exception as e:
                error_msg = f"Game loop error: {str(e)}"
                self.game_logic.add_message(error_msg)
                with open("error_log.txt", "a") as f:
                    f.write(f"Game loop error at level {self.game_logic.current_level}: {str(e)}\n")
                    f.write(traceback.format_exc() + "\n")
                self.stdscr.clear()
                self.renderer.render_all(self.game_map, self.entities, self.items,
                                       self.game_logic.message_log, self.player,
                                       self.game_logic)
                self.stdscr.refresh()
                key = self.stdscr.getch()
                if key == ord('q'):
                    break
                elif key == ord('r'):
                    self.reset_game()

# -------------------- entry point --------------------
def main(stdscr):
    try:
        stdscr.timeout(100)
        Game(stdscr).run()
    except Exception as e:
        with open("error_log.txt", "a") as f:
            f.write("Main function error:\n")
            f.write(traceback.format_exc() + "\n")

if __name__ == '__main__':
    curses.wrapper(main)