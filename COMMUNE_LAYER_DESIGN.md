# The Commune — Management Layer Design

## Philosophy

The management layer is **character-driven, not spatial.** The commune isn't a base-builder — it's a pressure cooker of incompatible personalities forced to coexist. The fun comes from managing *people*, not rooms. Every system feeds into one question: "Who do I send into the next fight, and can they stand each other long enough to win?"

Graphically, this layer runs almost entirely on **character portrait cards, text, and the dim-and-spotlight pattern.** One piece of art per character does triple duty: roster management, dialogue scenes, and combat info.

---

## The Character Card

The single most important visual asset in the game. Every character gets one card. It has two modes.

### Stats Mode (Roster / Combat / Recruitment)

```
┌──────────────────────────────┐
│                              │
│       [CHARACTER PORTRAIT]   │
│         (upper 60%)          │
│                              │
├──────────────────────────────┤
│  Karen                       │
│  Class: The Karen            │
│  ────────────────────────    │
│  Resolve: ██████████ 100     │
│  Move: 3    Initiative: 8    │
│  ────────────────────────    │
│  Traits: Self-Righteous,     │
│          Confrontational,    │
│          Surprisingly Loyal  │
│  ────────────────────────    │
│  Relationships:              │
│  ❤️ Dr. Feelings (bonded)    │
│  💢 Truthseeker Dave (clash) │
│  ────────────────────────    │
│  Abilities:                  │
│  • I WILL Speak to Manager   │
│  • Call Corporate             │
└──────────────────────────────┘
```

Used in: roster screen, recruitment preview, combat character card (M6), squad selection.

### Dialogue Mode (Events / Conflicts / Recruitment Conversations)

The stats half folds away (GSAP tween — bottom half scales to 0 vertically, card grows to fill more screen space). What remains is the portrait, large and expressive, with the character's name underneath. Speech bubbles appear beside the card. The player sees a *person talking*, not a stat sheet.

```
┌──────────────────────────────┐
│                              │
│                              │
│       [CHARACTER PORTRAIT]   │
│        (fills the card)      │
│                              │
│                              │
├──────────────────────────────┤
│  Karen                       │
└──────────────────────────────┘
        💬 "Who left QUINOA
           in MY fridge shelf?"
```

The portrait should support **3-4 expressions per character:**
- Neutral (default)
- Angry / Confrontational
- Happy / Smug
- Defeated / Sad

These are generated via the character LoRA with different prompt modifiers. Same character, same style, different facial expression. The card swaps expressions mid-dialogue to match the tone.

---

## The Dim-and-Spotlight Pattern

One universal visual pattern for every event, dialogue, and interaction in the management layer.

### How It Works

1. **Dim**: The commune background (whatever screen you're on) dims to ~30% brightness with a dark overlay.
2. **Spotlight**: Character cards animate in from the sides (GSAP slide + slight rotation for personality). They're lit, the background is dark — all attention is on the characters.
3. **Interaction**: Speech bubbles, choices, outcomes play out between the cards.
4. **Resolve**: Cards spin/slide out. Background brightness returns. The commune state updates.

### Where It's Used

| Trigger | What Appears |
|---------|-------------|
| Internal conflict event | Two resident cards face each other, argue |
| Recruitment | New arrival card slides in, introduces themselves, player decides |
| Threat briefing | "Enemy" card appears (billionaire, inspector, zealot) with a description of the problem |
| Mission selection | Threat card on one side, your squad slots on the other |
| Random commune event | One or two resident cards + narration text |
| Relationship change | Two cards + brief dialogue showing bond forming or breaking |
| Character departure | One card + farewell dialogue, card slides out and fades |

This means **one system handles all narrative content.** The dialogue engine is the management layer's core renderer, just like the grid renderer is combat's core renderer.

---

## Personality Traits

Each character has 2-3 personality traits visible on their card. Traits are the mechanical backbone of the management layer — they drive events, relationships, and combat synergies.

### Trait Examples

| Trait | Effect |
|-------|--------|
| Self-Righteous | Clashes with other Self-Righteous characters. +10% resolve damage when "winning" an argument (target below 50% resolve) |
| Paranoid | Generates more conflict events. Can't be surprised in combat (always acts first in ambush scenarios) |
| Passive-Aggressive | Debuffs adjacent allies' initiative by 1 in combat. Generates subtle conflict events that escalate over time |
| Loud Chewer | Annoys everyone. Small morale penalty commune-wide. But completely unbothered by enemy intimidation abilities |
| Empathetic | Bonds form faster. Heals 5 resolve to adjacent allies per turn in combat |
| Contrarian | Disagrees with every group decision. But gets a damage bonus when outnumbered in combat |
| Night Owl | Unavailable for morning missions. Gets bonus initiative in evening/night missions |
| Conspiracy Brain | Generates wild event chains. Sometimes they're right and you get a bonus. Usually they're not |
| MLM Energy | Tries to recruit everyone. Annoys residents. But their "recruitment" ability in combat can convert weakened enemies |

Traits create the comedy. The player reads "Passive-Aggressive" and immediately knows what this person is like. The game doesn't need to explain the character — the trait does it.

### Trait Interactions

Some trait pairs cause **clashes** (conflict events, combat debuffs when paired):
- Self-Righteous + Self-Righteous
- Paranoid + Empathetic (paranoid person doesn't trust the empathetic one)
- Contrarian + anyone with strong opinions

Some trait pairs cause **bonds** (friendship events, combat synergy buffs):
- Empathetic + anyone who's been defeated recently
- Night Owl + Night Owl (late-night solidarity)
- Conspiracy Brain + Paranoid (they feed each other's theories)

---

## Commune Events

The primary content system between battles. Events are short narrative encounters that pop up between missions, using the dim-and-spotlight pattern.

### Event Structure

```
Event {
  id: string
  title: string               // "Kitchen Cold War"
  description: string          // Narration text
  participants: CharacterId[]  // Who's involved (1-3 characters)
  trigger: EventTrigger        // What caused this event
  choices: Choice[]            // Player decisions (2-3 options)
}

Choice {
  text: string                 // "Side with Karen"
  requirements?: Condition[]   // Optional: requires a trait, relationship, or resource
  outcomes: Outcome[]          // What happens
}

Outcome {
  type: 'morale' | 'relationship' | 'trait_gain' | 'trait_loss' | 'resource' | 'departure' | 'injury' | 'buff'
  target: CharacterId
  value: number | string
  description: string          // Flavor text for the outcome
}
```

### Event Triggers

- **Trait-based**: Two characters with clashing traits are both in the commune → conflict event fires
- **Time-based**: Every X days/missions, a random commune event fires
- **Threshold-based**: Commune morale drops below X → crisis event
- **Story-based**: Scripted events at specific progression points
- **Relationship-based**: Two characters reach bond/clash threshold → event fires

### Example Event: "Kitchen Cold War"

**Trigger:** Vegan + Gym Bro both in commune for 3+ days

**Scene:** Dim background. Vegan card slides in from left (angry expression). Gym Bro card slides in from right (smug expression).

**Narration:** "The commune kitchen has become a warzone. Someone labeled all the shelves. Someone else ignored the labels. Passive-aggressive Post-it notes have been escalating for days."

**Vegan:** "I found WHEY PROTEIN in the blender. MY blender. The one I specifically labeled 'PLANT-BASED ONLY.'"

**Gym Bro:** "Bro, it's just protein. Protein is protein. You need to relax."

**Choices:**
1. **Side with the Vegan** → Vegan +morale, Gym Bro -morale, Gym Bro gains trait "Grudge (Vegan)"
2. **Side with the Gym Bro** → Gym Bro +morale, Vegan -morale, Vegan starts petition event chain
3. **Buy a second blender** → -$50, both +morale, no hard feelings. But you're out $50.

**Cards animate out. Background restores. Resource/relationship updates appear briefly.**

---

## Roster Management

### The Commune Screen

The main hub between battles. NOT a spatial building view — it's a **roster board.**

```
┌─────────────────────────────────────────────────────┐
│  THE COMMUNE                        Day 12 | $340   │
│  ───────────────────────────────────────────────     │
│                                                      │
│  RESIDENTS (6/8)                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │Karen│ │Dr.F │ │Dave │ │Vegan│ │GymBr│ │ DJ  │  │
│  │ 😠  │ │ 😐  │ │ 🤔  │ │ 😤  │ │ 💪  │ │ 🎧  │  │
│  │ 85% │ │ 90% │ │ 70% │ │ 60% │ │ 95% │ │ 80% │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 📋 MISSIONS  │  │ 🚪 RECRUIT  │                  │
│  │  2 available │  │  1 waiting   │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ 🏠 UPGRADES │  │ 📰 EVENTS   │                  │
│  │  Kitchen L2  │  │  1 pending   │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                      │
│  MORALE: ████████░░ 78%                              │
└─────────────────────────────────────────────────────┘
```

Clicking a resident opens their full card (stats mode). Clicking MISSIONS opens mission select. Clicking RECRUIT opens the recruitment dialogue. Clicking EVENTS plays the pending event. Clicking UPGRADES opens the upgrade menu.

**All of these use the dim-and-spotlight pattern for their interactions.** The commune screen is just the hub — a menu of portrait thumbnails and buttons. The real content happens in the spotlight.

### Resident Capacity

The commune has limited rooms (starts at 6, upgradeable to 8, then 10). If the commune is full, you can't recruit. If someone leaves or is permanently defeated in combat, a slot opens. This creates tension: do you kick out the underperformer to make room for a stronger recruit?

### Morale

A global commune stat (0-100%). Affected by:
- Events and choices
- Combat results (winning = morale boost, losing = morale hit)
- Relationship states (lots of clashes = morale drain, bonds = morale boost)
- Upgrades (kitchen, common room improve morale)

Low morale triggers crisis events and increases departure risk. High morale gives combat bonuses (starting resolve buff).

---

## Recruitment

New characters show up periodically (after missions, via events, random).

### Recruitment Flow

1. Notification on commune screen: "1 waiting"
2. Click RECRUIT → dim-and-spotlight
3. New character's card slides in (dialogue mode)
4. They introduce themselves — personality, why they're here, what they bring
5. Player sees their stats card: class, traits, abilities
6. Player also sees **compatibility preview**: "Will clash with Dave (both Paranoid)" / "Will bond with Dr. Feelings (Empathetic + recently defeated)"
7. Choice: Accept (if room) / Reject / Accept but someone has to go (pick who leaves)
8. If accepted: card joins the roster. Welcome event may fire.

### Recruitment Is A Meaningful Choice

Every recruit changes the social dynamics. A strong fighter with bad traits can tank morale. A weak fighter with Empathetic can hold the commune together. The player is always balancing tactical power against social stability.

---

## Missions / Threats

Missions are the bridge between management and combat.

### Mission Select Flow

1. Click MISSIONS on commune screen
2. Dim-and-spotlight: threat card appears with mission description
3. Threat description, difficulty rating, rewards
4. Player picks their squad (3-4 characters from roster)
5. **Squad chemistry preview**: Shows bond/clash pairs in the selected squad and their combat effects
6. Confirm → transition to combat scene
7. After combat → return to commune screen with results (rewards, injuries, morale change)

### Mission Types

| Type | Description | Enemy Faction |
|------|-------------|--------------|
| Eviction Defense | Goons trying to clear out the building | Corporate (goons, lawyers, PR people) |
| Inspection | Corrupt inspector needs to be "persuaded" | City Officials (inspectors, bureaucrats) |
| Neighborhood Dispute | Local business being muscled out | Developers (gentrifiers, chain store managers) |
| Recruitment Drive | Religious group recruiting in the area | Zealots (preachers, door-knockers) |
| Protest | Standing up to city hall | Mixed (police, counter-protesters, media) |

Each threat faction has its own enemy types with unique abilities and AI patterns. This is content, not systems — the combat engine handles all of it already.

---

## The Building (Upgrades)

Simple menu, not spatial. Each upgrade is a line item with a cost and a benefit.

| Upgrade | Level | Cost | Effect |
|---------|-------|------|--------|
| Kitchen | 1/3 | — | Base. Residents can cook. |
| Kitchen | 2/3 | $200 | Shared meals: -20% conflict event frequency |
| Kitchen | 3/3 | $500 | Communal dinners: +5 morale per mission completed |
| Common Room | 1/3 | $150 | Residents can socialize. Enables bond-forming events. |
| Common Room | 2/3 | $400 | Game nights: +10% bond formation speed |
| Common Room | 3/3 | $800 | The room becomes legendary. Morale floor of 30% (can't drop below) |
| Rooftop | 0/2 | $300 | Meditation spot. Injured characters heal 1 day faster. |
| Rooftop | 2/2 | $600 | Garden. Passive income of $20/mission. |
| Basement | 0/2 | $250 | Storage. +2 resident capacity. |
| Basement | 2/2 | $500 | Training room. Characters gain XP 20% faster. |

Upgrades are purchased from the commune screen. No animation needed — just a menu with costs and descriptions. The effects feed into the event system and combat buffs.

---

## Resources

Keep it simple. Two resources:

- **Money** — earned from missions, spent on upgrades and event choices. Scarce enough to force decisions.
- **Morale** — the commune's health. Affected by everything. The resource you're always managing.

That's it. No influence, no reputation, no favor tokens. Two numbers the player always cares about.

---

## Progression Loop

```
┌─────────────────┐
│  COMMUNE SCREEN  │ ◄── Hub. See your people. Handle events.
│  (Management)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EVENTS FIRE     │ ◄── Trait clashes, random events, story beats.
│  (Dim+Spotlight) │     Player makes choices. Relationships shift.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MISSION SELECT  │ ◄── Pick a threat. Pick your squad.
│  (Dim+Spotlight) │     Balance power vs chemistry.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  COMBAT          │ ◄── Fight. Synergies and clashes matter.
│  (Grid scene)    │     Win or lose, there are consequences.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  RESULTS         │ ◄── Rewards, injuries, morale shifts.
│  (Dim+Spotlight) │     Back to commune screen.
└────────┬────────┘
         │
         ▼
   [LOOP BACK TO COMMUNE]
```

Each loop takes ~10-15 minutes. The game gets harder as threats escalate, but you get stronger through upgrades, recruitment, and character growth. The tension between "best fighters" and "most stable commune" is the strategic spine.

---

## What This Requires Graphically

Per character:
- 1 portrait (4 expression variants: neutral, angry, happy, defeated)
- These are used EVERYWHERE — cards, roster, dialogue, combat info

Per enemy faction:
- 1 "threat card" illustration (the billionaire, the inspector, etc.)
- Individual enemy types reuse combat sprites

UI:
- Commune screen background (one static illustration of the building exterior or a simple stylized layout)
- Card template frames (one for player, one for enemy/threat)
- Speech bubble assets
- Button/menu styling

That's it. The dim-and-spotlight pattern means you never need background art for dialogue scenes — the commune screen IS the background, just dimmed. The cards ARE the characters. Text does the heavy lifting.
