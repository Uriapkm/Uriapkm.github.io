import random
import traceback
from entities import Entity

class CombatSystem:
    def __init__(self, player, enemy):
        self.player = player
        self.enemy = enemy

    def player_attack(self, attack_index):
        try:
            if not self.player.attacks:
                return 0, "No attacks available!", False
            if attack_index < 0 or attack_index >= len(self.player.attacks):
                return 0, "Invalid attack!", False
            attack_name, base_damage, accuracy = self.player.attacks[attack_index]
            repeats = self.player.attack_repeat[attack_index]
            adjusted_accuracy = max(0.1, accuracy - repeats * 0.08)  # Apply repeat penalty
            if random.random() > adjusted_accuracy:
                return 0, f"You missed with {attack_name}!", False
            self.player.attack_repeat[attack_index] += 1  # Increment repeat counter
            damage = base_damage + self.player.attack // 3
            damage = max(1, damage - self.enemy.defense // 3)
            damage = max(1, int(damage * random.uniform(0.9, 1.1)))
            self.enemy.hp = max(0, self.enemy.hp - damage)
            enemy_died = not self.enemy.is_alive()
            message = f"You used {attack_name} and dealt {damage} damage to {self.enemy.name}."
            if attack_name == "Poison Dart" and random.random() < 0.2:
                self.apply_status_effect(self.enemy, "poisoned")
                message += f" {self.enemy.name} is poisoned!"
            elif attack_name == "Fireball" and random.random() < 0.5:
                self.apply_status_effect(self.enemy, "burning")
                message += f" {self.enemy.name} is burning!"
            if enemy_died:
                message += f" {self.enemy.name} has been defeated!"
            return damage, message, enemy_died
        except Exception as e:
            with open("error_log.txt", "a") as f:
                f.write(f"Player attack error: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            return 0, f"Error during attack: {str(e)}", False

    def enemy_attack(self):
        try:
            attack_name, base_damage, accuracy = random.choice(self.enemy.attacks)
            if random.random() > accuracy:
                return 0, f"{self.enemy.name} missed with {attack_name}!", False
            damage = base_damage + self.enemy.level // 3
            damage = max(1, damage - self.player.defense // 3)
            damage = max(1, int(damage * random.uniform(0.9, 1.1)))
            self.player.hp = max(0, self.player.hp - damage)
            message = f"{self.enemy.name} used {attack_name} and dealt {damage} damage."
            if attack_name == "Poison Sting" and random.random() < 0.3:
                self.apply_status_effect(self.player, "poisoned")
                message += f" You are poisoned!"
            elif attack_name in ("Fire Breath", "Inferno Blast") and random.random() < 0.5:
                self.apply_status_effect(self.player, "burning")
                message += f" You are burning!"
            return damage, message
        except Exception as e:
            with open("error_log.txt", "a") as f:
                f.write(f"Enemy attack error: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")
            return 0, f"Error during enemy attack: {str(e)}", False

    def apply_status_effect(self, target, effect):
        try:
            if effect == "burning":
                target.status_effects.append(["burn", 3, 7])  # 7 damage per turn
            elif effect == "poisoned":
                target.status_effects.append(["poison", 3, 5])  # 5 damage per turn
            elif effect == "stunned":
                target.status_effects.append(["stunned", 1, 0])
        except Exception as e:
            with open("error_log.txt", "a") as f:
                f.write(f"Apply status effect error: {str(e)}\n")
                f.write(traceback.format_exc() + "\n")

    def attempt_flee(self):
        flee_chance = 0.3
        if random.random() < flee_chance:
            return True, "You successfully fled from combat!"
        return False, "You failed to flee!"