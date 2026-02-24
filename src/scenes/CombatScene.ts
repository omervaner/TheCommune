/**
 * CombatScene — owns the EventBus, CombatEngine, and all renderers.
 * Enforces turn order and manages the full move/act interaction flow
 * including ability targeting with damage previews and GSAP animations.
 */

import { Container, Graphics, Text } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { Scene } from '@scenes/SceneManager';
import { gsap } from 'gsap';
import { EventBus } from '../EventBus';
import { CombatEngine } from '@game/CombatEngine';
import { decideAction } from '@game/AI';
import { GridRenderer } from '@rendering/GridRenderer';
import { CharacterRenderer } from '@rendering/CharacterRenderer';
import { InitiativeBar } from '@rendering/InitiativeBar';
import { HUD } from '@rendering/HUD';
import { CharacterCard } from '@rendering/CharacterCard';
import { InputHandler } from '@input/InputHandler';
import { showReachableTiles, showTargetTiles, showAoeRadius } from '@input/TileSelector';
import { previewAbility, executeAbility } from '@game/AbilityResolver';
import { AnimationManager } from '@animation/AnimationManager';
import { tweenMove, tweenAttack, tweenHit, tweenShake, tweenDefeat, tweenDamageNumber, tweenTurnBanner, tweenCameraFocus } from '@animation/Tweens';
import { SoundManager } from '@audio/SoundManager';
import { clearHighlights, getTile } from '@game/Grid';
import { gridToScreen, isValidTile } from '@utils/iso';
import { createKaren, createTherapist, createConspiracyTheorist, createCorpGoon } from '@data/characters';
import type { Character, Ability, CombatEvents } from '@game/types';
import type { AbilityPreviewEntry } from '@game/AbilityResolver';

export class CombatScene implements Scene {
  private app: Application | null = null;
  private bus = new EventBus<CombatEvents>();
  private engine: CombatEngine | null = null;
  private gridRenderer: GridRenderer | null = null;
  private charRenderer: CharacterRenderer | null = null;
  private initiativeBar: InitiativeBar | null = null;
  private hud: HUD | null = null;
  private charCard: CharacterCard | null = null;
  private inputHandler: InputHandler | null = null;
  private endTurnBtn: Container | null = null;
  private gameOverOverlay: Container | null = null;
  private anim = new AnimationManager();
  private soundManager: SoundManager | null = null;
  private selectedCharacter: Character | null = null;
  private processingEnemyTurns = false;
  private combatOver = false;

  enter(app: Application): void {
    this.app = app;

    const karen = createKaren();
    karen.position = { col: 1, row: 3 };

    const therapist = createTherapist();
    therapist.position = { col: 0, row: 5 };

    const dave = createConspiracyTheorist();
    dave.position = { col: 2, row: 6 };

    const goon1 = createCorpGoon();
    goon1.id = 'goon_1';
    goon1.position = { col: 8, row: 3 };

    const goon2 = createCorpGoon();
    goon2.id = 'goon_2';
    goon2.name = 'Corporate Goon #2';
    goon2.position = { col: 7, row: 5 };

    this.engine = new CombatEngine([karen, therapist, dave, goon1, goon2], this.bus);

    this.gridRenderer = new GridRenderer();
    this.gridRenderer.centerOn(app.screen.width, app.screen.height);
    this.gridRenderer.update(this.engine.getState().grid);

    this.charRenderer = new CharacterRenderer();
    this.gridRenderer.container.addChild(this.charRenderer.container);

    app.stage.addChild(this.gridRenderer.container);

    this.initiativeBar = new InitiativeBar();
    app.stage.addChild(this.initiativeBar.container);

    this.hud = new HUD(this.onAbilityButtonClicked);
    app.stage.addChild(this.hud.container);

    this.endTurnBtn = this.buildEndTurnButton();
    app.stage.addChild(this.endTurnBtn);

    this.charCard = new CharacterCard();
    app.stage.addChild(this.charCard.container);

    this.soundManager = new SoundManager(this.bus);

    this.inputHandler = new InputHandler(app, this.gridRenderer.container, this.bus);
    this.bus.on('tileClicked', this.onTileClicked);
    this.bus.on('tileHovered', this.onTileHovered);
    this.bus.on('stageClicked', this.onStageClicked);

    window.addEventListener('resize', this.onResize);

    // Preload sprite textures, then render characters
    this.charRenderer.preload().then(async () => {
      if (!this.engine) return;
      this.charRenderer!.update(this.engine.getState().characters);
      this.refreshVisuals();
      await this.showTurnBanner();
      console.log('The Commune v0.1 — ready');
    });
  }

  exit(): void {
    window.removeEventListener('resize', this.onResize);
    this.inputHandler?.destroy();
    if (this.app) {
      if (this.gridRenderer) this.app.stage.removeChild(this.gridRenderer.container);
      if (this.initiativeBar) this.app.stage.removeChild(this.initiativeBar.container);
      if (this.hud) this.app.stage.removeChild(this.hud.container);
      if (this.charCard) this.app.stage.removeChild(this.charCard.container);
      if (this.endTurnBtn) this.app.stage.removeChild(this.endTurnBtn);
      if (this.gameOverOverlay) this.app.stage.removeChild(this.gameOverOverlay);
    }
    this.soundManager?.destroy();
    this.soundManager = null;
    this.bus.clear();
    this.engine = null;
    this.gridRenderer = null;
    this.charRenderer = null;
    this.initiativeBar = null;
    this.hud = null;
    this.charCard = null;
    this.inputHandler = null;
    this.endTurnBtn = null;
    this.gameOverOverlay = null;
    this.app = null;
  }

  update(_dt: number): void {}

  // -- Click handling --

  private onTileClicked = async (col: number, row: number): Promise<void> => {
    if (!this.engine || !this.gridRenderer || !this.charRenderer || !this.app) return;
    if (this.combatOver || this.anim.isPlaying()) return;

    // Dismiss large card on any click
    if (this.charCard?.isShowingLarge) {
      this.charCard.hideImmediate();
      return;
    }

    const state = this.engine.getState();
    const grid = state.grid;
    const tile = getTile(grid, col, row);
    if (!tile) return;

    const current = this.engine.getCurrentCharacter();

    // During enemy turns or while processing, only allow inspecting characters
    if (this.processingEnemyTurns || current.team === 'enemy') {
      if (tile.occupant && !tile.occupant.isDefeated) {
        this.charCard?.hideImmediate();
        this.charCard?.showLarge(tile.occupant, this.app.screen.width, this.app.screen.height);
      }
      return;
    }

    // --- Targeting mode ---
    if (state.phase === 'select_target' && state.selectedAbility) {
      if (tile.highlight === 'attack') {
        await this.playerUseAbility(col, row);
      } else {
        this.cancelTargeting();
      }
      return;
    }

    // --- Movement mode ---
    if (this.selectedCharacter && tile.highlight === 'move') {
      await this.playerMove(this.selectedCharacter, col, row);
      return;
    }

    // --- Select current character for movement (only if hasn't moved) ---
    if (tile.occupant && tile.occupant === current && !state.hasMoved) {
      this.selectedCharacter = tile.occupant;
      showReachableTiles(grid, tile.occupant, this.engine.getEffectiveMovement(tile.occupant));
      this.charCard?.hideImmediate();
      this.gridRenderer.update(grid);
      return;
    }

    // --- Clicked any character (including current after moving): show large card ---
    if (tile.occupant && !tile.occupant.isDefeated) {
      this.charCard?.hideImmediate();
      this.charCard?.showLarge(tile.occupant, this.app.screen.width, this.app.screen.height);
      return;
    }

    // --- Clicked empty tile ---
    this.selectedCharacter = null;
    this.charCard?.hideImmediate();
    clearHighlights(grid);
    this.highlightCurrentCharacter();
    this.gridRenderer.update(grid);
  };

  private onStageClicked = (): void => {
    if (this.charCard?.isShowingLarge) {
      this.charCard.hideImmediate();
    }
  };

  // -- Hover handling --

  private onTileHovered = (col: number, row: number): void => {
    if (!this.engine || !this.charRenderer || !this.gridRenderer || !this.app) return;
    if (this.anim.isPlaying()) return;

    const state = this.engine.getState();

    // --- Targeting mode: damage previews take priority ---
    if (state.phase === 'select_target' && state.selectedAbility) {
      this.charCard?.hideImmediate();

      const grid = state.grid;
      const ability = state.selectedAbility;
      const attacker = this.engine.getCurrentCharacter();

      this.charRenderer.clearAllPreviews();

      if (!isValidTile(col, row)) {
        if (ability.targetType === 'aoe') {
          showTargetTiles(grid, attacker, ability);
          this.gridRenderer.update(grid);
        }
        return;
      }

      const tile = getTile(grid, col, row);
      if (!tile || tile.highlight !== 'attack') {
        if (ability.targetType === 'aoe') {
          showTargetTiles(grid, attacker, ability);
          this.gridRenderer.update(grid);
        }
        return;
      }

      const preview = previewAbility(ability, attacker, col, row, grid, state.characters);
      for (const entry of preview) {
        this.charRenderer.setPreview(entry.character.id, entry.damage, entry.wouldDefeat);
      }

      if (ability.targetType === 'aoe' && ability.aoeRadius) {
        showAoeRadius(grid, attacker, col, row, ability.aoeRadius);
        this.gridRenderer.update(grid);
      }
      return;
    }

    // --- Normal mode: show hover card on characters ---
    if (!this.charCard || this.charCard.isShowingLarge) return;
    if (this.processingEnemyTurns) return;

    if (!isValidTile(col, row)) {
      this.charCard.hideImmediate();
      return;
    }

    const tile = getTile(state.grid, col, row);
    if (tile?.occupant && !tile.occupant.isDefeated) {
      const gridContainer = this.gridRenderer.container;
      const screen = gridToScreen(col, row);
      const stageX = screen.x + gridContainer.x;
      const stageY = screen.y + gridContainer.y;
      this.charCard.showSmall(tile.occupant, stageX, stageY, this.app.screen.width, this.app.screen.height);
    } else {
      this.charCard.hideImmediate();
    }
  };

  // ========================================================
  // Pure animation helpers — no turn state management
  // ========================================================

  /** Animate a character sliding to a new tile and update engine grid state */
  private async playMoveAnimation(char: Character, col: number, row: number): Promise<void> {
    if (!this.engine || !this.charRenderer) return;

    const sprite = this.charRenderer.getSprite(char.id);
    if (!sprite) return;

    const newScreen = gridToScreen(col, row);

    await this.anim.play(async () => {
      this.charRenderer!.pauseIdle(char.id);
      await tweenMove(sprite, newScreen.x, newScreen.y);
      this.charRenderer!.resumeIdle(char.id);
    });

    this.engine.moveCharacter(char, col, row);
  }

  /** Animate an ability being used on a target tile, apply damage, handle defeats.
   *  Returns true if combat ended due to a defeat. */
  private async playAbilityAnimation(ability: Ability, attacker: Character, col: number, row: number): Promise<boolean> {
    if (!this.engine || !this.charRenderer || !this.gridRenderer) return false;

    const state = this.engine.getState();
    const attackerSprite = this.charRenderer.getSprite(attacker.id);
    const targetScreen = gridToScreen(col, row);

    let results: AbilityPreviewEntry[] = [];

    await this.anim.play(async () => {
      // Attack slide
      if (attackerSprite) {
        this.charRenderer!.pauseIdle(attacker.id);
        await tweenAttack(attackerSprite, targetScreen.x, targetScreen.y);
        this.charRenderer!.resumeIdle(attacker.id);
      }

      // Apply damage
      results = executeAbility(ability, attacker, col, row, state.grid, state.characters, this.bus);

      for (const entry of results) {
        const verb = entry.wouldDefeat ? 'DEFEATED' : 'hit';
        console.log(`${attacker.name} ${verb} ${entry.character.name} for ${entry.damage} resolve damage`);
        this.engine!.recordDamage(entry.damage);
      }

      // Emit abilityUsed for sound manager
      const targetChars = results.map((r) => r.character);
      this.bus.emit('abilityUsed', ability, attacker, targetChars);

      // Hit animations on all targets + screen shake in parallel
      const hitAnims: Promise<void>[] = [];
      for (const entry of results) {
        const tSprite = this.charRenderer!.getSprite(entry.character.id);
        if (tSprite) {
          this.charRenderer!.pauseIdle(entry.character.id);
          const aScreen = gridToScreen(attacker.position.col, attacker.position.row);
          const tScreen = gridToScreen(entry.character.position.col, entry.character.position.row);
          const dx = tScreen.x - aScreen.x;
          const dy = tScreen.y - aScreen.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          hitAnims.push(tweenHit(tSprite, (dx / len) * 5, (dy / len) * 5));
        }
      }
      hitAnims.push(tweenShake(this.gridRenderer!.container));
      await Promise.all(hitAnims);

      // Damage numbers (fire-and-forget) + resume idles + update visuals
      for (const entry of results) {
        const pos = gridToScreen(entry.character.position.col, entry.character.position.row);
        tweenDamageNumber(this.charRenderer!.container, `−${entry.damage}`, pos.x, pos.y - 20);
        if (!entry.wouldDefeat) {
          this.charRenderer!.resumeIdle(entry.character.id);
        }
      }
      this.charRenderer!.update(state.characters);

      // Defeat animations (sequential so each is visible)
      for (const entry of results) {
        if (entry.wouldDefeat) {
          const dSprite = this.charRenderer!.getSprite(entry.character.id);
          if (dSprite) {
            await tweenDefeat(dSprite);
          }
          this.engine!.defeatCharacter(entry.character);
        }
      }
    });

    this.charRenderer.clearAllPreviews();
    return this.handleVictoryCheck();
  }

  // ========================================================
  // Player turn actions — use helpers + manage turn state
  // ========================================================

  private async playerMove(char: Character, col: number, row: number): Promise<void> {
    if (!this.engine) return;

    this.selectedCharacter = null;
    this.charCard?.hideImmediate();

    await this.playMoveAnimation(char, col, row);

    this.engine.markMoved();
    this.checkTurnComplete();
  }

  private onAbilityButtonClicked = (ability: Ability): void => {
    if (!this.engine || !this.gridRenderer) return;
    if (this.anim.isPlaying() || this.combatOver) return;

    const state = this.engine.getState();
    if (state.hasActed) return;

    this.selectedCharacter = null;
    this.charCard?.hideImmediate();
    this.engine.selectAbility(ability);

    const grid = state.grid;
    showTargetTiles(grid, this.engine.getCurrentCharacter(), ability);
    this.gridRenderer.update(grid);
    this.hud?.hide();
  };

  private async playerUseAbility(col: number, row: number): Promise<void> {
    if (!this.engine) return;

    const state = this.engine.getState();
    const ability = state.selectedAbility!;
    const attacker = this.engine.getCurrentCharacter();

    const gameOver = await this.playAbilityAnimation(ability, attacker, col, row);
    if (gameOver) return;

    this.engine.markActed();
    this.checkTurnComplete();
  }

  private cancelTargeting(): void {
    if (!this.engine) return;
    this.engine.cancelAbility();
    this.charRenderer?.clearAllPreviews();
    this.refreshVisuals();
  }

  // -- Turn management --

  private checkTurnComplete(): void {
    if (!this.engine) return;
    const state = this.engine.getState();
    if (state.hasMoved && state.hasActed) {
      this.endCurrentTurn();
    } else {
      this.refreshVisuals();
    }
  }

  private async endCurrentTurn(): Promise<void> {
    if (!this.engine) return;
    this.selectedCharacter = null;
    this.charCard?.hideImmediate();
    this.engine.endTurn();
    this.refreshVisuals();

    // Show turn banner for the new current character
    await this.showTurnBanner();

    this.processEnemyTurns();
  }

  private async showTurnBanner(): Promise<void> {
    if (!this.engine || !this.app || !this.gridRenderer || this.combatOver) return;
    const current = this.engine.getCurrentCharacter();
    const color = current.team === 'player' ? 0x6ab4ff : 0xff6a6a;
    const gc = this.gridRenderer.container;
    const charScreen = gridToScreen(current.position.col, current.position.row);

    await this.anim.play(() =>
      Promise.all([
        tweenTurnBanner(this.app!.stage, current.name, color, this.app!.screen.width, this.app!.screen.height),
        tweenCameraFocus(gc, charScreen.x, charScreen.y, gc.x, gc.y),
      ]).then(() => {}),
    );
  }

  // ========================================================
  // Enemy AI turns
  // ========================================================

  private async processEnemyTurns(): Promise<void> {
    if (!this.engine) return;
    if (this.engine.getCurrentCharacter().team !== 'enemy') return;

    this.processingEnemyTurns = true;
    this.setEndTurnBtnVisible(false);
    this.hud?.hide();

    while (this.engine && !this.combatOver && this.engine.getCurrentCharacter().team === 'enemy') {
      const enemy = this.engine.getCurrentCharacter();
      const state = this.engine.getState();

      this.refreshVisuals();
      await this.showTurnBanner();
      await this.delay(200);
      if (!this.engine || this.combatOver) return;

      const decision = decideAction(enemy, state);

      // Move
      if (decision.moveTo) {
        await this.playMoveAnimation(enemy, decision.moveTo.col, decision.moveTo.row);
        this.refreshVisuals();
        await this.delay(200);
        if (!this.engine || this.combatOver) return;
      }

      // Attack
      if (decision.ability && decision.targetCol != null && decision.targetRow != null) {
        const gameOver = await this.playAbilityAnimation(
          decision.ability, enemy, decision.targetCol, decision.targetRow,
        );
        if (gameOver) return;
        this.refreshVisuals();
        await this.delay(200);
        if (!this.engine) return;
      }

      this.engine.endTurn();
    }

    this.processingEnemyTurns = false;
    if (!this.combatOver) {
      this.setEndTurnBtnVisible(true);
      this.refreshVisuals();
    }
  }

  // ========================================================
  // Victory / defeat
  // ========================================================

  /** Check victory condition. Returns true if combat is over. */
  private handleVictoryCheck(): boolean {
    if (!this.engine) return false;

    const result = this.engine.checkVictory();
    if (!result) return false;

    this.combatOver = true;
    if (result === 'player_wins') this.soundManager?.play('victory');
    this.showGameOverOverlay(result === 'player_wins' ? 'VICTORY' : 'DEFEAT',
      result === 'player_wins' ? 0x44dd44 : 0xff4444);
    return true;
  }

  private showGameOverOverlay(message: string, color: number): void {
    if (!this.app || !this.engine) return;

    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const stats = this.engine.getState().stats;

    const overlay = new Container();

    // Dim background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.65 });
    overlay.addChild(bg);

    // Panel
    const panelW = 300;
    const panelH = 240;
    const px = Math.round(sw / 2 - panelW / 2);
    const py = Math.round(sh / 2 - panelH / 2);

    const panel = new Graphics();
    panel.roundRect(px, py, panelW, panelH, 10);
    panel.fill({ color: 0x1e1e36, alpha: 0.95 });
    panel.stroke({ color: 0x5a5a8c, width: 2 });
    overlay.addChild(panel);

    // Title
    const title = new Text({
      text: message,
      style: { fontFamily: 'monospace', fontSize: 36, fontWeight: 'bold', fill: color },
    });
    title.anchor.set(0.5, 0);
    title.x = Math.round(sw / 2);
    title.y = py + 16;
    overlay.addChild(title);

    // Stats
    const statLines = [
      `Turns: ${stats.turnsPlayed}`,
      `Damage Dealt: ${stats.totalDamageDealt}`,
      `Enemies Defeated: ${stats.enemiesDefeated}`,
      `Allies Remaining: ${stats.playersRemaining}`,
    ];

    let sy = py + 70;
    for (const line of statLines) {
      const t = new Text({
        text: line,
        style: { fontFamily: 'monospace', fontSize: 13, fill: 0xcccccc },
      });
      t.anchor.set(0.5, 0);
      t.x = Math.round(sw / 2);
      t.y = sy;
      t.alpha = 0;
      overlay.addChild(t);
      // Staggered fade-in
      gsap.to(t, { alpha: 1, duration: 0.3, delay: 0.4 + statLines.indexOf(line) * 0.1 });
      sy += 24;
    }

    // Play Again button
    const btnW = 140;
    const btnH = 34;
    const btn = new Container();
    btn.x = Math.round(sw / 2);
    btn.y = py + panelH - 36;

    const btnBg = new Graphics();
    btnBg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    btnBg.fill({ color: 0x4a6a4a, alpha: 0.9 });
    btnBg.stroke({ color: 0x88aa88, width: 1.5 });

    const btnLabel = new Text({
      text: 'Play Again',
      style: { fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', fill: 0xddffdd },
    });
    btnLabel.anchor.set(0.5, 0.5);

    btn.addChild(btnBg, btnLabel);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => {
      this.restartCombat();
    });
    btn.alpha = 0;
    gsap.to(btn, { alpha: 1, duration: 0.3, delay: 0.8 });
    overlay.addChild(btn);

    this.gameOverOverlay = overlay;
    this.app.stage.addChild(overlay);

    // Fade in + title scale bounce
    overlay.alpha = 0;
    title.scale.set(0.5);
    gsap.to(overlay, { alpha: 1, duration: 0.4, ease: 'power2.out' });
    gsap.to(title.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.5)', delay: 0.1 });

    this.hud?.hide();
    this.setEndTurnBtnVisible(false);
  }

  /** Tear down and restart the combat scene */
  private restartCombat(): void {
    if (!this.app) return;
    const app = this.app;
    this.exit();
    this.enter(app);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => gsap.delayedCall(ms / 1000, resolve));
  }

  // -- Visual updates --

  private refreshVisuals(): void {
    if (!this.engine || !this.gridRenderer || !this.charRenderer || !this.initiativeBar || !this.hud || !this.app) return;

    const state = this.engine.getState();
    const current = this.engine.getCurrentCharacter();

    clearHighlights(state.grid);
    this.highlightCurrentCharacter();
    this.gridRenderer.update(state.grid);
    this.charRenderer.update(state.characters);
    this.charRenderer.clearAllPreviews();

    this.initiativeBar.update(state.turnOrder, state.currentTurnIndex);
    this.initiativeBar.centerOn(this.app.screen.width);

    if (current.team === 'player' && !state.hasActed && state.phase === 'select_action') {
      this.hud.update(current, state.hasActed);
      this.hud.positionAt(20, this.app.screen.height - current.abilities.length * 38 - 60);
      this.hud.show();
    } else {
      this.hud.hide();
    }

    this.positionEndTurnBtn();
    this.setEndTurnBtnVisible(current.team === 'player' && !this.combatOver);
  }

  private highlightCurrentCharacter(): void {
    if (!this.engine) return;
    const current = this.engine.getCurrentCharacter();
    const grid = this.engine.getState().grid;
    grid[current.position.col][current.position.row].highlight = 'selected';
  }

  // -- End Turn button --

  private buildEndTurnButton(): Container {
    const btn = new Container();

    const bg = new Graphics();
    bg.roundRect(-50, -15, 100, 30, 6);
    bg.fill({ color: 0x4a4a6a, alpha: 0.9 });
    bg.stroke({ color: 0x8a8aaa, width: 1.5 });

    const label = new Text({
      text: 'End Turn',
      style: {
        fontFamily: 'monospace',
        fontSize: 13,
        fontWeight: 'bold',
        fill: 0xdddddd,
      },
    });
    label.anchor.set(0.5, 0.5);

    btn.addChild(bg, label);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => {
      if (this.combatOver || this.processingEnemyTurns || this.anim.isPlaying()) return;
      if (!this.engine) return;
      if (this.engine.getCurrentCharacter().team === 'enemy') return;
      this.endCurrentTurn();
    });

    return btn;
  }

  private positionEndTurnBtn(): void {
    if (!this.endTurnBtn || !this.app) return;
    this.endTurnBtn.x = Math.round(this.app.screen.width / 2);
    this.endTurnBtn.y = this.app.screen.height - 40;
  }

  private setEndTurnBtnVisible(visible: boolean): void {
    if (this.endTurnBtn) this.endTurnBtn.visible = visible;
  }

  // -- Resize --

  private onResize = (): void => {
    if (!this.app) return;
    if (this.gridRenderer) this.gridRenderer.centerOn(this.app.screen.width, this.app.screen.height);
    if (this.initiativeBar) this.initiativeBar.centerOn(this.app.screen.width);
    this.positionEndTurnBtn();
  };
}
