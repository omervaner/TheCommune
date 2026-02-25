/**
 * DialogueRenderer — the visual layer for the dim-and-spotlight dialogue system.
 *
 * Subscribes to DialogueEvents from the bus. Manages:
 *  - Dim overlay (semi-transparent black over full screen)
 *  - PortraitCards sliding in from sides
 *  - Speech bubbles near the speaking character
 *  - Narration box at top center
 *  - Choice panel at bottom center
 *  - Outcome text display
 *  - Click-to-advance for narration/speech steps
 *
 * This is the rendering backbone of the entire commune management layer.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';
import { EventBus } from '../EventBus';
import { PortraitCard } from '@rendering/PortraitCard';
import { CARD_COLORS } from '@utils/constants';
import type { Character } from '@game/types';
import type {
  DialogueEvents,
  DialogueScript,
  DialogueStep,
  Choice,
  ParticipantSlots,
  CardSlot,
  Expression,
} from '@dialogue/types';

const BUBBLE_MAX_W = 260;
const BUBBLE_PADDING = 12;
const BUBBLE_RADIUS = 10;
const BUBBLE_FONT_SIZE = 13;
const NARRATION_FONT_SIZE = 14;
const CHOICE_FONT_SIZE = 13;
const OUTCOME_FONT_SIZE = 15;
const ADVANCE_HINT_TEXT = '[ click to continue ]';

export class DialogueRenderer {
  readonly container = new Container();

  private bus: EventBus<DialogueEvents>;
  private characters: Map<string, Character>;
  private screenWidth: number;
  private screenHeight: number;

  private overlay: Graphics | null = null;
  private cards = new Map<string, PortraitCard>();
  private slots: ParticipantSlots = {};
  private speechBubble: Container | null = null;
  private narrationBox: Container | null = null;
  private choicePanel: Container | null = null;
  private outcomeDisplay: Container | null = null;
  private advanceHint: Text | null = null;

  private unsubs: (() => void)[] = [];

  /** Set by whoever wires the dialogue system. Called on click-to-advance (narration/speech). */
  advanceCallback: (() => void) | null = null;
  /** Set by whoever wires the dialogue system. Called when player picks a choice. */
  choiceCallback: ((choiceId: string) => void) | null = null;

  constructor(
    bus: EventBus<DialogueEvents>,
    characters: Map<string, Character>,
    screenWidth: number,
    screenHeight: number,
  ) {
    this.bus = bus;
    this.characters = characters;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.container.eventMode = 'static';
    this.container.visible = false;

    this.unsubs.push(
      bus.on('dialogueStarted', this.onDialogueStarted),
      bus.on('stepChanged', this.onStepChanged),
      bus.on('choicePresented', this.onChoicePresented),
      bus.on('dialogueEnded', this.onDialogueEnded),
    );
  }

  /** Update screen dimensions (call on resize) */
  resize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  /** Clean up all listeners and children */
  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.clearAll();
    this.container.destroy({ children: true });
  }

  // ========================================================
  // Standalone card display (dim-and-spotlight, no dialogue)
  // ========================================================

  /** Show a single card on the dim overlay. Click anywhere to dismiss. */
  async showCard(char: Character, mode: 'stats' | 'dialogue' = 'stats'): Promise<void> {
    if (this.container.visible) return; // already showing something

    this.container.visible = true;

    // Dim overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, this.screenWidth, this.screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.overlay.alpha = 0;
    this.overlay.eventMode = 'static';
    this.container.addChild(this.overlay);
    gsap.to(this.overlay, { alpha: 1, duration: 0.3, ease: 'power2.out' });

    // Build card centered on screen
    const card = new PortraitCard();
    card.build(char, mode);
    this.container.addChild(card.container);
    this.cards.set(char.id, card);
    this.slots[char.id] = 'left'; // needed for animateOut

    // Position centered
    const targetX = Math.round(this.screenWidth / 2 - card.container.width / 2);
    const targetY = Math.round(this.screenHeight / 2 - card.container.height / 2);
    card.container.x = targetX;
    card.container.y = targetY - 20;
    card.container.alpha = 0;

    await new Promise<void>((resolve) => {
      gsap.to(card.container, {
        y: targetY,
        alpha: 1,
        duration: 0.3,
        ease: 'back.out(1.2)',
        onComplete: resolve,
      });
    });

    // Click overlay to dismiss
    this.overlay.cursor = 'pointer';
    this.overlay.on('pointerdown', this.dismissCard);
  }

  private dismissCard = async (): Promise<void> => {
    // Fade card out
    for (const [, card] of this.cards) {
      await new Promise<void>((resolve) => {
        gsap.to(card.container, {
          alpha: 0,
          y: card.container.y + 15,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: resolve,
        });
      });
    }

    // Fade overlay
    if (this.overlay) {
      this.overlay.off('pointerdown', this.dismissCard);
      await new Promise<void>((resolve) => {
        gsap.to(this.overlay, {
          alpha: 0,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: resolve,
        });
      });
    }

    this.clearAll();
    this.container.visible = false;
  };

  // ========================================================
  // Event handlers
  // ========================================================

  private onDialogueStarted = async (script: DialogueScript, slots: ParticipantSlots): Promise<void> => {
    this.slots = slots;
    this.container.visible = true;

    // Dim overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, this.screenWidth, this.screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.overlay.alpha = 0;
    this.overlay.eventMode = 'static'; // blocks clicks to things behind
    this.container.addChild(this.overlay);
    gsap.to(this.overlay, { alpha: 1, duration: 0.3, ease: 'power2.out' });

    // Build and animate in cards for each participant
    const animPromises: Promise<void>[] = [];
    for (const charId of script.participants) {
      const char = this.characters.get(charId);
      if (!char) continue;

      const card = new PortraitCard();
      card.build(char, 'dialogue');
      this.container.addChild(card.container);
      this.cards.set(charId, card);

      const slot = slots[charId];
      animPromises.push(card.animateIn(slot, this.screenWidth, this.screenHeight));
    }

    await Promise.all(animPromises);
  };

  private onStepChanged = (step: DialogueStep, _stepIndex: number): void => {
    // Clear previous step visuals
    this.clearStepVisuals();

    switch (step.type) {
      case 'narration':
        this.showNarration(step.text);
        break;
      case 'speech':
        this.showSpeech(step.characterId, step.text, step.expression);
        break;
      case 'choice':
        // Choices are handled by onChoicePresented
        break;
      case 'outcome':
        this.showOutcome(step.text);
        break;
    }
  };

  private onChoicePresented = (choices: Choice[]): void => {
    this.clearStepVisuals();
    this.showChoices(choices);
  };

  private onDialogueEnded = async (): Promise<void> => {
    this.clearStepVisuals();

    // Animate cards out
    const animPromises: Promise<void>[] = [];
    for (const [charId, card] of this.cards) {
      const slot = this.slots[charId];
      animPromises.push(card.animateOut(slot, this.screenWidth));
    }
    await Promise.all(animPromises);

    // Fade overlay
    if (this.overlay) {
      await new Promise<void>((resolve) => {
        gsap.to(this.overlay, {
          alpha: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: resolve,
        });
      });
    }

    this.clearAll();
    this.container.visible = false;
  };

  // ========================================================
  // Visual builders
  // ========================================================

  private showNarration(text: string): void {
    this.narrationBox = new Container();

    const txt = new Text({
      text,
      style: {
        fontFamily: 'monospace',
        fontSize: NARRATION_FONT_SIZE,
        fontStyle: 'italic',
        fill: 0xcccccc,
        wordWrap: true,
        wordWrapWidth: this.screenWidth * 0.6,
        align: 'center',
      },
    });
    txt.anchor.set(0.5, 0);

    // Background panel
    const padX = 20;
    const padY = 14;
    const bg = new Graphics();
    bg.roundRect(
      -txt.width / 2 - padX,
      -padY,
      txt.width + padX * 2,
      txt.height + padY * 2,
      8,
    );
    bg.fill({ color: 0x000000, alpha: 0.6 });

    this.narrationBox.addChild(bg, txt);
    this.narrationBox.x = Math.round(this.screenWidth / 2);
    this.narrationBox.y = Math.round(this.screenHeight * 0.12);

    this.container.addChild(this.narrationBox);
    this.fadeIn(this.narrationBox);
    this.enableClickToAdvance();
  }

  private showSpeech(characterId: string, text: string, expression?: Expression): void {
    const card = this.cards.get(characterId);
    const slot = this.slots[characterId];

    // Set expression on the speaking card
    if (card && expression) {
      card.setExpression(expression);
    }

    // Dim non-speaking cards, brighten the speaker
    for (const [id, c] of this.cards) {
      gsap.to(c.container, {
        alpha: id === characterId ? 1 : 0.5,
        duration: 0.2,
      });
    }

    // Build speech bubble
    this.speechBubble = new Container();

    const txt = new Text({
      text,
      style: {
        fontFamily: 'monospace',
        fontSize: BUBBLE_FONT_SIZE,
        fill: 0xeeeeee,
        wordWrap: true,
        wordWrapWidth: BUBBLE_MAX_W - BUBBLE_PADDING * 2,
      },
    });
    txt.x = BUBBLE_PADDING;
    txt.y = BUBBLE_PADDING;

    const bubbleW = Math.min(txt.width + BUBBLE_PADDING * 2, BUBBLE_MAX_W);
    const bubbleH = txt.height + BUBBLE_PADDING * 2;

    const bg = new Graphics();
    bg.roundRect(0, 0, bubbleW, bubbleH, BUBBLE_RADIUS);
    bg.fill({ color: CARD_COLORS.bg, alpha: 0.95 });
    bg.stroke({ color: CARD_COLORS.border, width: 1.5 });

    // Tail triangle pointing at the card
    const tailDir = slot === 'left' ? -1 : 1;
    const tailX = slot === 'left' ? 0 : bubbleW;
    bg.moveTo(tailX, bubbleH * 0.4);
    bg.lineTo(tailX + tailDir * -14, bubbleH * 0.5);
    bg.lineTo(tailX, bubbleH * 0.6);
    bg.fill({ color: CARD_COLORS.bg, alpha: 0.95 });

    this.speechBubble.addChild(bg, txt);

    // Position bubble next to the card
    if (card) {
      const cardBounds = card.container;
      if (slot === 'left') {
        this.speechBubble.x = cardBounds.x + 230;
        this.speechBubble.y = cardBounds.y + 40;
      } else {
        this.speechBubble.x = cardBounds.x - bubbleW - 20;
        this.speechBubble.y = cardBounds.y + 40;
      }
    } else {
      this.speechBubble.x = Math.round(this.screenWidth / 2 - bubbleW / 2);
      this.speechBubble.y = Math.round(this.screenHeight * 0.35);
    }

    this.container.addChild(this.speechBubble);
    this.fadeIn(this.speechBubble);
    this.enableClickToAdvance();
  }

  private showChoices(choices: Choice[]): void {
    this.choicePanel = new Container();

    // Reset all card brightness
    for (const [, c] of this.cards) {
      gsap.to(c.container, { alpha: 1, duration: 0.2 });
    }

    const btnW = Math.min(this.screenWidth * 0.5, 400);
    const btnH = 40;
    const gap = 10;
    const totalH = choices.length * btnH + (choices.length - 1) * gap;
    const startY = -totalH / 2;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const btn = this.buildChoiceButton(choice, btnW, btnH);
      btn.y = startY + i * (btnH + gap);
      btn.x = -btnW / 2;

      // Staggered entrance
      btn.alpha = 0;
      gsap.to(btn, { alpha: 1, duration: 0.2, delay: i * 0.08 });

      this.choicePanel.addChild(btn);
    }

    this.choicePanel.x = Math.round(this.screenWidth / 2);
    this.choicePanel.y = Math.round(this.screenHeight * 0.78);

    this.container.addChild(this.choicePanel);
  }

  private buildChoiceButton(choice: Choice, w: number, h: number): Container {
    const btn = new Container();

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 6);
    bg.fill({ color: 0x2a2a4a, alpha: 0.9 });
    bg.stroke({ color: 0x6a6a9a, width: 1.5 });

    const label = new Text({
      text: choice.text,
      style: {
        fontFamily: 'monospace',
        fontSize: CHOICE_FONT_SIZE,
        fill: 0xdddddd,
        wordWrap: true,
        wordWrapWidth: w - 24,
      },
    });
    label.x = 12;
    label.y = Math.round(h / 2 - label.height / 2);

    btn.addChild(bg, label);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    // Hover effect
    btn.on('pointerover', () => {
      bg.tint = 0x6a6aaa;
      label.tint = 0xffffff;
    });
    btn.on('pointerout', () => {
      bg.tint = 0xffffff;
      label.tint = 0xffffff;
    });

    btn.on('pointerdown', () => {
      if (this.choiceCallback) {
        this.choiceCallback(choice.id);
      }
    });

    return btn;
  }

  private showOutcome(text: string): void {
    this.outcomeDisplay = new Container();

    const txt = new Text({
      text,
      style: {
        fontFamily: 'monospace',
        fontSize: OUTCOME_FONT_SIZE,
        fontWeight: 'bold',
        fill: 0xffcc44,
        wordWrap: true,
        wordWrapWidth: this.screenWidth * 0.5,
        align: 'center',
      },
    });
    txt.anchor.set(0.5, 0.5);

    const padX = 24;
    const padY = 16;
    const bg = new Graphics();
    bg.roundRect(
      -txt.width / 2 - padX,
      -txt.height / 2 - padY,
      txt.width + padX * 2,
      txt.height + padY * 2,
      8,
    );
    bg.fill({ color: 0x000000, alpha: 0.7 });
    bg.stroke({ color: 0xffcc44, width: 1, alpha: 0.5 });

    this.outcomeDisplay.addChild(bg, txt);
    this.outcomeDisplay.x = Math.round(this.screenWidth / 2);
    this.outcomeDisplay.y = Math.round(this.screenHeight / 2);

    this.container.addChild(this.outcomeDisplay);
    this.fadeIn(this.outcomeDisplay);
    this.enableClickToAdvance();
  }

  // ========================================================
  // Click-to-advance
  // ========================================================

  private enableClickToAdvance(): void {
    this.disableClickToAdvance();

    // Show hint
    this.advanceHint = new Text({
      text: ADVANCE_HINT_TEXT,
      style: {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x888888,
      },
    });
    this.advanceHint.anchor.set(0.5, 0);
    this.advanceHint.x = Math.round(this.screenWidth / 2);
    this.advanceHint.y = this.screenHeight - 30;
    this.advanceHint.alpha = 0;
    this.container.addChild(this.advanceHint);
    gsap.to(this.advanceHint, { alpha: 1, duration: 0.3, delay: 0.5 });

    // Pulse the hint
    gsap.to(this.advanceHint, {
      alpha: 0.4,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 1,
    });

    if (this.overlay) {
      this.overlay.cursor = 'pointer';
      this.overlay.on('pointerdown', this.handleAdvanceClick);
    }
  }

  private disableClickToAdvance(): void {
    if (this.advanceHint) {
      gsap.killTweensOf(this.advanceHint);
      this.container.removeChild(this.advanceHint);
      this.advanceHint.destroy();
      this.advanceHint = null;
    }
    if (this.overlay) {
      this.overlay.cursor = 'default';
      this.overlay.off('pointerdown', this.handleAdvanceClick);
    }
  }

  private handleAdvanceClick = (): void => {
    if (this.advanceCallback) {
      this.advanceCallback();
    }
  };

  // ========================================================
  // Cleanup helpers
  // ========================================================

  private clearStepVisuals(): void {
    this.disableClickToAdvance();

    if (this.speechBubble) {
      this.container.removeChild(this.speechBubble);
      this.speechBubble.destroy({ children: true });
      this.speechBubble = null;
    }
    if (this.narrationBox) {
      this.container.removeChild(this.narrationBox);
      this.narrationBox.destroy({ children: true });
      this.narrationBox = null;
    }
    if (this.choicePanel) {
      this.container.removeChild(this.choicePanel);
      this.choicePanel.destroy({ children: true });
      this.choicePanel = null;
    }
    if (this.outcomeDisplay) {
      this.container.removeChild(this.outcomeDisplay);
      this.outcomeDisplay.destroy({ children: true });
      this.outcomeDisplay = null;
    }
  }

  private clearAll(): void {
    this.clearStepVisuals();

    for (const [, card] of this.cards) {
      card.destroy();
    }
    this.cards.clear();

    if (this.overlay) {
      this.container.removeChild(this.overlay);
      this.overlay.destroy();
      this.overlay = null;
    }

    this.container.removeChildren();
    this.slots = {};
  }

  private fadeIn(target: Container, duration = 0.2): void {
    target.alpha = 0;
    gsap.to(target, { alpha: 1, duration, ease: 'power2.out' });
  }
}
