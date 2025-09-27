import curses
from config import COLORS, FLOOR_SYMBOL, WALL_SYMBOL, EXIT_SYMBOL, ALTAR_SYMBOL
from entities import Glyph, Potion, RarePotion, Key, Altar

class Renderer:
    def __init__(self, stdscr):
        self.stdscr = stdscr
        self.combat_mode = False
        self.setup_curses()
        self.init_battle_colors()

    def setup_curses(self):
        curses.curs_set(0)
        if curses.has_colors():
            curses.start_color()
            curses.init_pair(COLORS['player'], curses.COLOR_WHITE, curses.COLOR_BLACK)
            curses.init_pair(COLORS['wall'], curses.COLOR_BLUE, curses.COLOR_BLACK)
            curses.init_pair(COLORS['floor'], curses.COLOR_WHITE, curses.COLOR_BLACK)
            curses.init_pair(COLORS['exit'], curses.COLOR_YELLOW, curses.COLOR_BLACK)
            curses.init_pair(COLORS['enemy'], curses.COLOR_RED, curses.COLOR_BLACK)
            curses.init_pair(COLORS['potion'], curses.COLOR_GREEN, curses.COLOR_BLACK)
            curses.init_pair(COLORS['rare_potion'], curses.COLOR_MAGENTA, curses.COLOR_BLACK)
            curses.init_pair(COLORS['key'], curses.COLOR_YELLOW, curses.COLOR_BLACK)
            curses.init_pair(COLORS['altar'], curses.COLOR_CYAN, curses.COLOR_BLACK)
            curses.init_pair(COLORS['text'], curses.COLOR_WHITE, curses.COLOR_BLACK)
            curses.init_pair(COLORS['glyph'], curses.COLOR_CYAN, curses.COLOR_BLACK)

    def init_battle_colors(self):
        if curses.has_colors():
            curses.init_pair(10, curses.COLOR_GREEN, curses.COLOR_BLACK)
            curses.init_pair(11, curses.COLOR_YELLOW, curses.COLOR_BLACK)
            curses.init_pair(12, curses.COLOR_RED, curses.COLOR_BLACK)
            curses.init_pair(13, curses.COLOR_CYAN, curses.COLOR_BLACK)
            curses.init_pair(14, curses.COLOR_WHITE, curses.COLOR_BLUE)
            curses.init_pair(15, curses.COLOR_MAGENTA, curses.COLOR_BLACK)
            curses.init_pair(16, curses.COLOR_WHITE, curses.COLOR_RED)
            curses.init_pair(17, curses.COLOR_WHITE, curses.COLOR_GREEN)

    def render_all(self, game_map, entities, items, message_log, player, game_logic):
        if not self.combat_mode:
            self.stdscr.clear()

        height, width = self.stdscr.getmaxyx()

        # map
        for x in range(min(game_map.width, width)):
            for y in range(min(game_map.height, height - 8)):
                if y >= height - 8:
                    continue
                if game_map.tiles[x][y]['explored']:
                    if game_map.tiles[x][y]['blocked']:
                        self.draw_char(x, y, WALL_SYMBOL, COLORS['wall'])
                    else:
                        self.draw_char(x, y, FLOOR_SYMBOL, COLORS['floor'])
    
        # exits
        for exit_x, exit_y in game_map.exits:
            if (exit_x < width and exit_y < height - 8 and
                    game_map.tiles[exit_x][exit_y]['explored']):
                self.draw_char(exit_x, exit_y, EXIT_SYMBOL, COLORS['exit'])

        # items
        for item in items:
            if (item.x < width and item.y < height - 8 and
                    game_map.tiles[item.x][item.y]['explored']):
                if isinstance(item, Potion):
                    self.draw_char(item.x, item.y, item.symbol, COLORS['potion'])
                elif isinstance(item, RarePotion):
                    self.draw_char(item.x, item.y, item.symbol, COLORS['rare_potion'])
                elif isinstance(item, Altar):
                    self.draw_char(item.x, item.y, item.symbol, COLORS['altar'])
                elif isinstance(item, Glyph):
                    self.draw_char(item.x, item.y, item.symbol, COLORS['glyph'])
                else:
                    self.draw_char(item.x, item.y, item.symbol, COLORS['key'])

        # entities
        for entity in entities:
            if (entity.x < width and entity.y < height - 8 and
                    game_map.tiles[entity.x][entity.y]['explored']):
                if entity == player:
                    self.draw_char(entity.x, entity.y, entity.symbol, COLORS['player'])
                else:
                    self.draw_char(entity.x, entity.y, entity.symbol, COLORS['enemy'])

        self.render_ui(player, message_log, game_logic, width, height)
        self.stdscr.refresh()

    def draw_char(self, x, y, char, color_pair=0):
        h, w = self.stdscr.getmaxyx()
        if 0 <= x < w and 0 <= y < h:
            try:
                if curses.has_colors():
                    self.stdscr.addch(y, x, char, curses.color_pair(color_pair))
                else:
                    self.stdscr.addch(y, x, char)
            except curses.error:
                pass

    def draw_box(self, x, y, w, h, title=""):
        h, w = min(h, self.stdscr.getmaxyx()[0] - y), min(w, self.stdscr.getmaxyx()[1] - x)
        if h < 3 or w < 3:
            return
        horiz, vert = '═', '║'
        tl, tr, bl, br = '╔', '╗', '╚', '╝'
        for dx in range(w):
            self.draw_char(x + dx, y, horiz, COLORS['wall'])
            self.draw_char(x + dx, y + h - 1, horiz, COLORS['wall'])
        for dy in range(h):
            self.draw_char(x, y + dy, vert, COLORS['wall'])
            self.draw_char(x + w - 1, y + dy, vert, COLORS['wall'])
        self.draw_char(x, y, tl, COLORS['wall'])
        self.draw_char(x + w - 1, y, tr, COLORS['wall'])
        self.draw_char(x, y + h - 1, bl, COLORS['wall'])
        self.draw_char(x + w - 1, y + h - 1, br, COLORS['wall'])
        if title and y < self.stdscr.getmaxyx()[0]:
            self.stdscr.addstr(y, x + (w - len(title)) // 2, title,
                             curses.color_pair(COLORS['text']) | curses.A_BOLD)

    def render_game_over(self, width, height):
        messages = [
            "Game Over",
            "The dungeon's shadows claim you, their weight heavier than stone.",
            "Your breath fades, echoing in halls that forget your name.",
            "Yet every fall is a lesson carved in the heart's quiet.",
            "Press R to rise again, or Q to rest in silence."
        ]
        if height < 8 or width < 40:
            self.stdscr.addstr(0, 0, "Terminal too small! Resize to at least 40x8.",
                             curses.color_pair(COLORS['text']))
            return
        y = max(0, (height - len(messages) - 2) // 2)
        for msg in messages:
            if y < height:
                self.stdscr.addstr(y, max(0, (width - len(msg)) // 2), msg,
                                 curses.color_pair(12) | curses.A_BOLD)  # Red for game over
                y += 1

    def render_victory(self, width, height):
        messages = [
            "Victory!",
            "You defeated the Archdragon!",
            "Press R to restart or Q to quit"
        ]
        if height < 8 or width < 40:
            self.stdscr.addstr(0, 0, "Terminal too small! Resize to at least 40x8.",
                             curses.color_pair(COLORS['text']))
            return
        y = max(0, (height - len(messages) - 2) // 2)
        for msg in messages:
            if y < height:
                self.stdscr.addstr(y, max(0, (width - len(msg)) // 2), msg,
                                 curses.color_pair(COLORS['text']) | curses.A_BOLD)
                y += 1

    def render_combat_screen(self, combat_system, player_attacks, width, height):
        h, w = 20, min(80, width - 4)
        y0, x0 = (height - h) // 2, (width - w) // 2
        if h >= height or w >= width:
            return

        # border
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if y == y0 or y == y0 + h - 1:
                    self.draw_char(x, y, '═', COLORS['wall'])
                elif x == x0 or x == x0 + w - 1:
                    self.draw_char(x, y, '║', COLORS['wall'])
                else:
                    self.draw_char(x, y, ' ')
        self.draw_char(x0, y0, '╔', COLORS['wall'])
        self.draw_char(x0 + w - 1, y0, '╗', COLORS['wall'])
        self.draw_char(x0, y0 + h - 1, '╚', COLORS['wall'])
        self.draw_char(x0 + w - 1, y0 + h - 1, '╝', COLORS['wall'])

        title = "  BATTLE ARENA  "
        if y0 + 1 < height:
            self.stdscr.addstr(y0 + 1, x0 + (w - len(title)) // 2, title,
                             curses.color_pair(COLORS['text']) | curses.A_BOLD)

        self.render_enemy_panel(combat_system, x0 + 2, y0 + 3, w - 4, height)
        self.render_player_panel(combat_system, x0 + 2, y0 + 8, w - 4, height, player_attacks)
        self.render_action_menu(combat_system, player_attacks, x0 + 2, y0 + 14, w - 4, height)
        curses.doupdate()

    def render_enemy_panel(self, combat_system, x, y, w, height):
        enemy = combat_system.enemy
        if y < height:
            self.stdscr.addstr(y, x, f" {enemy.name} (Lv.{enemy.level})"[:w],
                             curses.color_pair(COLORS['enemy']) | curses.A_BOLD)
        hp_vis = max(enemy.hp, 0)
        ratio = hp_vis / enemy.max_hp
        bar_w = w - 15
        fill = int(bar_w * ratio)
        bar = "█" * fill + "░" * (bar_w - fill)
        hp_txt = f"HP: {hp_vis}/{enemy.max_hp}"
        color = 10 if ratio > 0.6 else 11 if ratio > 0.3 else 12
        if y + 1 < height:
            self.stdscr.addstr(y + 1, x, f"[{bar}] {hp_txt}", curses.color_pair(color))
        if enemy.status_effects and y + 2 < height:
            eff = ", ".join([ef[0].title() for ef in enemy.status_effects])
            self.stdscr.addstr(y + 2, x, f"Status: {eff}", curses.color_pair(COLORS['text']))

    def render_player_panel(self, combat_system, x, y, w, height, player_attacks):
        p = combat_system.player
        if y < height:
            self.stdscr.addstr(y, x, f" {p.name} (Lv.{p.level})"[:w],
                             curses.color_pair(COLORS['player']) | curses.A_BOLD)
        ratio = p.hp / p.max_hp
        bar_w = w - 20
        fill = int(bar_w * ratio)
        bar = "█" * fill + "░" * (bar_w - fill)
        hp_txt = f"HP: {p.hp}/{p.max_hp}"
        color = 10 if ratio > 0.6 else 11 if ratio > 0.3 else 12
        if y + 1 < height:
            self.stdscr.addstr(y + 1, x, f"[{bar}] {hp_txt}", curses.color_pair(color))
        stats = f"ATK: {p.attack} | DEF: {p.defense}"
        if y + 2 < height:
            self.stdscr.addstr(y + 2, x, stats, curses.color_pair(COLORS['text']))
        if p.status_effects and y + 3 < height:
            eff = ", ".join([ef[0].title() for ef in p.status_effects])
            self.stdscr.addstr(y + 3, x, f"Status: {eff}", curses.color_pair(COLORS['text']))

    def render_action_menu(self, combat_system, player_attacks, x, y, w, height):
        if y < height:
            self.stdscr.addstr(y, x, " Available Actions:",
                             curses.color_pair(COLORS['text']) | curses.A_BOLD)
        col_w = w // 2 - 1
        for i, (name, pow, acc) in enumerate(player_attacks):
            if i >= 4:
                break
            cx = x + (i // 2) * (col_w + 2)
            cy = y + 1 + (i % 2)
            if cy < height and cx < x + w:
                self.stdscr.addstr(cy, cx, f"{i + 1})", curses.color_pair(14) | curses.A_BOLD)
                repeats = combat_system.player.attack_repeat[i]
                if repeats == 0:
                    colour = COLORS['text']
                elif repeats <= 2:
                    colour = 11
                else:
                    colour = 12
                info = f" {name} (PWR:{pow} ACC:{int((acc - repeats*0.08)*100)}%)"
                self.stdscr.addstr(cy, cx + 2, info[:col_w - 2], curses.color_pair(colour))

        iy = y + 4
        if iy < height:
            pot = f"5)  Use Potion ({combat_system.player.inventory['potions']})"
            self.stdscr.addstr(iy, x, pot, curses.color_pair(COLORS['potion']))
            rpot = f"6)  Use Rare Potion ({combat_system.player.inventory['rare_potions']})"
            if x + len(pot) + 3 < x + w:
                self.stdscr.addstr(iy, x + len(pot) + 3, rpot, curses.color_pair(COLORS['rare_potion']))

        fy = iy + 1
        if fy < height:
            self.stdscr.addstr(fy, x, "7)  Attempt to Flee", curses.color_pair(COLORS['text']))

        ty = fy + 2
        if ty < height:
            tip = " Tips: Repeating an attack lowers its accuracy | Status effects shown in enemy panel"
            self.stdscr.addstr(ty, x, tip[:w], curses.color_pair(COLORS['text']) | curses.A_DIM)

    def render_ui(self, player, message_log, game_logic, width, height):
        y = max(0, height - 8)
        if y < height:
            self.stdscr.addstr(y, 0, f"Level: {game_logic.current_level} | HP: {player.hp}/{player.max_hp} | "
                                   f"ATK: {player.attack} | DEF: {player.defense}",
                             curses.color_pair(COLORS['text']))
        if y + 1 < height:
            self.stdscr.addstr(y + 1, 0, f"Potions: {player.inventory['potions']} | "
                                       f"Rare Potions: {player.inventory['rare_potions']} | "
                                       f"Key: {'Yes' if player.inventory['key'] else 'No'}",
                             curses.color_pair(COLORS['text']))
        for i, msg in enumerate(message_log):
            if y + 3 + i < height:
                self.stdscr.addstr(y + 3 + i, 0, msg[:width - 1], curses.color_pair(COLORS['text']))