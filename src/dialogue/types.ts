/**
 * Type definitions for the dialogue system.
 * Used by both DialogueEngine (pure data) and DialogueRenderer (visuals).
 */

/** Character expression for portrait swapping */
export type Expression = 'neutral' | 'angry' | 'happy' | 'defeated';

/** A single step in a dialogue script */
export type DialogueStep =
  | { type: 'narration'; text: string }
  | { type: 'speech'; characterId: string; text: string; expression?: Expression }
  | { type: 'choice'; prompt?: string; choices: Choice[] }
  | { type: 'outcome'; text: string; effects?: OutcomeEffect[] };

/** A player choice during dialogue */
export interface Choice {
  id: string;
  text: string;
  /** Index to jump to after selecting this choice. If omitted, advances to next step. */
  jumpTo?: number;
}

/** Placeholder for outcome effects — wired to real systems in C3 */
export interface OutcomeEffect {
  type: 'morale' | 'relationship' | 'money' | 'trait_gain' | 'trait_loss' | 'departure';
  target?: string;
  value: number | string;
  label: string;
}

/** A complete dialogue script */
export interface DialogueScript {
  id: string;
  title: string;
  /** Character IDs involved (determines which cards appear) */
  participants: string[];
  steps: DialogueStep[];
}

/** Side of screen for a dialogue card */
export type CardSlot = 'left' | 'right';

/** Mapping of participant ID to their card slot */
export type ParticipantSlots = Record<string, CardSlot>;

/** Events emitted by DialogueEngine via EventBus */
export interface DialogueEvents {
  dialogueStarted: [script: DialogueScript, slots: ParticipantSlots];
  stepChanged: [step: DialogueStep, stepIndex: number];
  choicePresented: [choices: Choice[]];
  choiceSelected: [choice: Choice];
  dialogueEnded: [];
}
