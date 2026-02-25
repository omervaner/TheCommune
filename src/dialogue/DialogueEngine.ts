/**
 * DialogueEngine — pure data state machine for dialogue scripts.
 * No PixiJS imports. Processes one step at a time, emits events via EventBus.
 * The renderer subscribes and handles all visuals.
 */

import { EventBus } from '../EventBus';
import type {
  DialogueScript,
  DialogueStep,
  Choice,
  DialogueEvents,
  ParticipantSlots,
  CardSlot,
} from '@dialogue/types';

export class DialogueEngine {
  private script: DialogueScript | null = null;
  private stepIndex = -1;
  private awaitingChoice = false;
  private running = false;

  constructor(private bus: EventBus<DialogueEvents>) {}

  /** Whether a dialogue is currently active */
  get isActive(): boolean {
    return this.running;
  }

  /** Start a dialogue script. Assigns participants to left/right slots and emits the first step. */
  start(script: DialogueScript): void {
    if (this.running) return;

    this.script = script;
    this.stepIndex = -1;
    this.awaitingChoice = false;
    this.running = true;

    const slots = this.assignSlots(script.participants);
    this.bus.emit('dialogueStarted', script, slots);

    this.advance();
  }

  /** Advance to the next step (or end dialogue if done). Call this on click-to-advance. */
  advance(): void {
    if (!this.script || !this.running || this.awaitingChoice) return;

    this.stepIndex++;

    if (this.stepIndex >= this.script.steps.length) {
      this.end();
      return;
    }

    const step = this.script.steps[this.stepIndex];
    this.bus.emit('stepChanged', step, this.stepIndex);

    if (step.type === 'choice') {
      this.awaitingChoice = true;
      this.bus.emit('choicePresented', step.choices);
    }
  }

  /** Player selects a choice. Resolves the choice and advances. */
  selectChoice(choiceId: string): void {
    if (!this.script || !this.awaitingChoice) return;

    const step = this.script.steps[this.stepIndex];
    if (step.type !== 'choice') return;

    const choice = step.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    this.awaitingChoice = false;
    this.bus.emit('choiceSelected', choice);

    // Jump to a specific step if specified, otherwise advance normally
    if (choice.jumpTo != null) {
      this.stepIndex = choice.jumpTo - 1; // -1 because advance() increments
    }

    this.advance();
  }

  /** End the dialogue immediately */
  private end(): void {
    this.running = false;
    this.awaitingChoice = false;
    this.script = null;
    this.stepIndex = -1;
    this.bus.emit('dialogueEnded');
  }

  /** Assign participants to left/right card slots. First participant goes left, second goes right. */
  private assignSlots(participants: string[]): ParticipantSlots {
    const slots: ParticipantSlots = {};
    const positions: CardSlot[] = ['left', 'right'];
    for (let i = 0; i < participants.length; i++) {
      slots[participants[i]] = positions[i % positions.length];
    }
    return slots;
  }
}
