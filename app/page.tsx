"use client";

import { useMemo, useState } from "react";
import {
  Crown,
  Hand,
  Lightbulb,
  Play,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type Rank = "A" | "10" | "K" | "Q" | "J" | "9" | "8" | "7";

type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

type PlayerPosition = "1" | "2" | "3" | "4";
type BidOutcome = "none" | "me" | "other";
type OtherTaker = "partner" | "opponent";
type OpponentPosition = "left" | "right";
type TablePlayer = "you" | "left" | "partner" | "right";
type PlaySnapshot = {
  trickCards: Partial<Record<TablePlayer, string>>;
  leadSuit: Suit | null;
  voidByPlayer: Record<TablePlayer, Suit[]>;
  playAlerts: string[];
};

const SUITS: { key: Suit; label: string; symbol: string; color: string }[] = [
  { key: "spades", label: "Pique", symbol: "♠", color: "text-zinc-900" },
  { key: "hearts", label: "Coeur", symbol: "♥", color: "text-red-600" },
  { key: "diamonds", label: "Carreau", symbol: "♦", color: "text-red-600" },
  { key: "clubs", label: "Trefle", symbol: "♣", color: "text-zinc-900" },
];

const RANKS: Rank[] = ["A", "10", "K", "Q", "J", "9", "8", "7"];

const TRUMP_VALUES: Record<Rank, number> = {
  J: 20,
  "9": 14,
  A: 11,
  "10": 10,
  K: 4,
  Q: 3,
  "8": 0,
  "7": 0,
};

const NON_TRUMP_VALUES: Record<Rank, number> = {
  A: 11,
  "10": 10,
  K: 4,
  Q: 3,
  J: 2,
  "9": 0,
  "8": 0,
  "7": 0,
};

const TOTAL_POINTS = 162;
const ESTIMATED_TWO_EXTRA_CARDS = 6;

const DECK: Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    id: `${rank}-${suit.key}`,
    suit: suit.key,
    rank,
  })),
);

const SMALL_RANKS: Rank[] = ["7", "8", "9"];
const TABLE_PLAYERS: { key: TablePlayer; label: string }[] = [
  { key: "you", label: "Vous" },
  { key: "left", label: "Adversaire gauche" },
  { key: "partner", label: "Partenaire" },
  { key: "right", label: "Adversaire droite" },
];
const PLAY_ORDER: TablePlayer[] = ["you", "left", "partner", "right"];
const POSITION_OPTIONS: { key: PlayerPosition; label: string }[] = [
  { key: "1", label: "1re - A droite du donneur" },
  { key: "2", label: "2e - Partenaire du donneur" },
  { key: "3", label: "3e - A gauche du donneur" },
  { key: "4", label: "4e - Donneur" },
];

const POSITION_LAYOUT: { key: PlayerPosition; grid: string }[] = [
  { key: "2", grid: "col-start-2 row-start-1" },
  { key: "1", grid: "col-start-1 row-start-2" },
  { key: "3", grid: "col-start-3 row-start-2" },
  { key: "4", grid: "col-start-2 row-start-3" },
];

function scoreCards(cards: Card[], trumpSuit: Suit) {
  return cards.reduce((sum, card) => {
    const values = card.suit === trumpSuit ? TRUMP_VALUES : NON_TRUMP_VALUES;
    return sum + values[card.rank];
  }, 0);
}

function hasBeloteRebelote(cards: Card[], trumpSuit: Suit) {
  const hasKing = cards.some((card) => card.suit === trumpSuit && card.rank === "K");
  const hasQueen = cards.some((card) => card.suit === trumpSuit && card.rank === "Q");
  return hasKing && hasQueen;
}

function hasCard(cards: Card[], suit: Suit, rank: Rank) {
  return cards.some((card) => card.suit === suit && card.rank === rank);
}

function cardLabel(card: Card) {
  const suit = SUITS.find((s) => s.key === card.suit);
  return `${card.rank}${suit?.symbol ?? ""}`;
}

function cardColorClass(card: Card) {
  return card.suit === "hearts" || card.suit === "diamonds" ? "text-red-600" : "text-zinc-900";
}

function suitColorClass(suit: Suit) {
  return suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-zinc-900";
}

export default function Home() {
  const [handIds, setHandIds] = useState<string[]>([]);
  const [turnId, setTurnId] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>("1");
  const [dealerPosition, setDealerPosition] = useState<PlayerPosition>("4");
  const [bidOutcome, setBidOutcome] = useState<BidOutcome>("none");
  const [otherTaker, setOtherTaker] = useState<OtherTaker | "">("");
  const [opponentPosition, setOpponentPosition] = useState<OpponentPosition | "">("");
  const [contractSuit, setContractSuit] = useState<Suit | "">("");
  const [passedToSecondRound, setPassedToSecondRound] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [trickCards, setTrickCards] = useState<Partial<Record<TablePlayer, string>>>({});
  const [deadCardIds, setDeadCardIds] = useState<string[]>([]);
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null);
  const [activeOtherPlayer, setActiveOtherPlayer] = useState<Exclude<TablePlayer, "you">>("left");
  const [voidByPlayer, setVoidByPlayer] = useState<Record<TablePlayer, Suit[]>>({
    you: [],
    left: [],
    partner: [],
    right: [],
  });
  const [playAlerts, setPlayAlerts] = useState<string[]>([]);
  const [playUndoStack, setPlayUndoStack] = useState<PlaySnapshot[]>([]);

  const handCards = useMemo(
    () => handIds.map((id) => DECK.find((card) => card.id === id)).filter(Boolean) as Card[],
    [handIds],
  );
  const turnCard = useMemo(
    () => DECK.find((card) => card.id === turnId) ?? null,
    [turnId],
  );
  const extraCards = useMemo(
    () => extraIds.map((id) => DECK.find((card) => card.id === id)).filter(Boolean) as Card[],
    [extraIds],
  );

  const firstRoundCards = turnCard ? [...handCards, turnCard] : handCards;
  const fullHandCards =
    bidOutcome === "me"
      ? [...firstRoundCards, ...extraCards]
      : bidOutcome === "other"
        ? [...handCards, ...extraCards]
        : firstRoundCards;
  const takenTrumpSuit = (contractSuit || turnCard?.suit) as Suit | undefined;

  const firstRoundScore = useMemo(() => {
    if (!turnCard) return null;
    return scoreCards(firstRoundCards, turnCard.suit);
  }, [firstRoundCards, turnCard]);

  const firstRoundProjected = firstRoundScore !== null ? firstRoundScore + ESTIMATED_TWO_EXTRA_CARDS : null;
  const firstRoundBelote = takenTrumpSuit ? hasBeloteRebelote(fullHandCards, takenTrumpSuit) : false;

  const secondRoundScores = useMemo(
    () =>
      SUITS.filter((suit) => suit.key !== turnCard?.suit).map((suit) => ({
        suit: suit.key,
        label: `${suit.label} ${suit.symbol}`,
        score: scoreCards(handCards, suit.key),
        hasBelote: hasBeloteRebelote(handCards, suit.key),
      })),
    [handCards, turnCard],
  );

  const selectedIds = new Set([...handIds, ...extraIds, ...(turnId ? [turnId] : [])]);
  const fullHandIdSet = new Set(fullHandCards.map((card) => card.id));
  const currentTrickIds = Object.values(trickCards).filter(Boolean) as string[];
  const playedCardSet = new Set([...deadCardIds, ...currentTrickIds]);
  const expectedPlayer = PLAY_ORDER[currentTrickIds.length] ?? null;

  const selectedCardCount = handIds.length + (turnId ? 1 : 0) + extraIds.length;
  const readyForFirstDecision = handIds.length === 5 && !!turnCard;
  const readyForSecondDecision = handIds.length === 5;
  const readyForBidTransition = readyForFirstDecision;
  const myTakeNeedsExtras = 2;
  const neededExtras = bidOutcome === "me" ? myTakeNeedsExtras : bidOutcome === "other" ? 3 : 0;
  const fullHandReady =
    bidOutcome === "me"
      ? handCards.length + (turnCard ? 1 : 0) + extraCards.length === 8
      : bidOutcome === "other"
        ? handCards.length + extraCards.length === 8
        : false;
  const otherBidDetailsReady =
    otherTaker === "partner" ? !!contractSuit : otherTaker === "opponent" ? !!contractSuit && !!opponentPosition : false;
  const myBidDetailsReady = bidOutcome === "me" ? (passedToSecondRound ? !!contractSuit : true) : false;
  const canShowCompletion =
    bidOutcome === "me" ? myBidDetailsReady : bidOutcome === "other" ? otherBidDetailsReady : false;
  const canOpenDeck =
    handIds.length < 5 ||
    !turnId ||
    (bidOutcome === "me" && extraIds.length < myTakeNeedsExtras) ||
    (bidOutcome === "other" && extraIds.length < 3);
  const deckStepLabel =
    handIds.length < 5
      ? "Selectionnez les 5 cartes de votre main."
      : !turnId
        ? "Selectionnez la carte de la tourne."
        : bidOutcome === "me" && extraIds.length < myTakeNeedsExtras
          ? `Ajoutez vos ${myTakeNeedsExtras} cartes de completion.`
          : bidOutcome === "other" && extraIds.length < 3
            ? "Ajoutez vos 3 cartes de completion."
            : "Aucune selection de carte requise pour l'instant.";
  const userCurrentHandCards = fullHandCards.filter((card) => !playedCardSet.has(card.id));
  const remainingDeckForOthers = DECK.filter(
    (card) => !playedCardSet.has(card.id) && !fullHandIdSet.has(card.id),
  );

  const insights = useMemo(() => {
    if (!turnCard || firstRoundScore === null) return [];
    const trump = turnCard.suit;
    const keyTrump = [hasCard(firstRoundCards, trump, "J"), hasCard(firstRoundCards, trump, "9"), hasCard(firstRoundCards, trump, "A")].filter(Boolean).length;
    const lines: string[] = [];

    if (keyTrump >= 2) {
      lines.push("Main de solide atout (Valet/9/As) : prendre est souvent sur.");
    } else {
      lines.push("Profil risquee : il manque la plupart des gros atouts.");
    }

    if (!hasCard(firstRoundCards, trump, "9")) {
      lines.push("Alerte risque : sans le 9 d'atout, le potentiel de coupe baisse.");
    }

    if (firstRoundProjected !== null && firstRoundProjected > 45) {
      lines.push("Projection au-dessus de 45 avec les 2 cartes inconnues : signal clair pour prendre.");
    } else if (firstRoundProjected !== null && firstRoundProjected > 40) {
      lines.push("Zone limite mais jouable (40-45) : prenez si vous faites confiance au partenaire.");
    } else {
      lines.push("Sous 40 points projetes : passez et cherchez une meilleure couleur au 2e tour.");
    }

    if (firstRoundBelote) {
      lines.push("Belote-Rebelote disponible : +20 points si l'atout est confirme.");
    }

    return lines;
  }, [firstRoundBelote, firstRoundCards, firstRoundProjected, firstRoundScore, turnCard]);

  const hasImpassePattern = useMemo(() => {
    const pool = fullHandCards.length > 0 ? fullHandCards : firstRoundCards;
    return SUITS.some(
      (suit) =>
        pool.some((card) => card.suit === suit.key && card.rank === "A") &&
        pool.some((card) => card.suit === suit.key && card.rank === "K"),
    );
  }, [firstRoundCards, fullHandCards]);

  const trumpCountInWild = useMemo(() => {
    if (!contractSuit) return null;
    return DECK.filter(
      (card) =>
        card.suit === contractSuit &&
        !playedCardSet.has(card.id) &&
        !userCurrentHandCards.some((handCard) => handCard.id === card.id),
    ).length;
  }, [contractSuit, playedCardSet, userCurrentHandCards]);

  const masterCardIds = useMemo(() => {
    if (!contractSuit) return new Set<string>();
    const masters = new Set<string>();
    const strengthOrder: Rank[] = ["A", "10", "K", "Q", "J", "9", "8", "7"];
    const trumpStrengthOrder: Rank[] = ["J", "9", "A", "10", "K", "Q", "8", "7"];
    const liveCards = DECK.filter((card) => !deadCardIds.includes(card.id));

    SUITS.forEach((suit) => {
      const order = suit.key === contractSuit ? trumpStrengthOrder : strengthOrder;
      const topLiveRank = order.find((rank) =>
        liveCards.some((card) => card.suit === suit.key && card.rank === rank),
      );
      if (!topLiveRank) return;
      const matchingUserCard = userCurrentHandCards.find(
        (card) => card.suit === suit.key && card.rank === topLiveRank,
      );
      if (matchingUserCard) {
        masters.add(matchingUserCard.id);
      }
    });

    return masters;
  }, [contractSuit, deadCardIds, userCurrentHandCards]);

  const firstLeadTip = useMemo(() => {
    if (!fullHandReady) return "";
    const positionLabel =
      playerPosition === "1"
        ? "1re position"
        : playerPosition === "2"
          ? "2e position"
          : playerPosition === "3"
            ? "3e position"
            : "4e position";

    if (bidOutcome === "me" && contractSuit) {
      const pool = fullHandCards;
      const hasTrumpJack = hasCard(pool, contractSuit, "J");
      const hasTrumpNine = hasCard(pool, contractSuit, "9");
      const hasTrumpAce = hasCard(pool, contractSuit, "A");

      if (playerPosition === "1") {
        if (hasTrumpJack) {
          return `${positionLabel} et vous avez pris : entamez votre plus gros atout (Valet) pour faire tomber les atouts adverses.`;
        }
        if (hasTrumpNine) {
          return `${positionLabel} et vous avez pris : commencez atout avec le 9 pour imposer le rythme.`;
        }
        if (hasTrumpAce) {
          return `${positionLabel} et vous avez pris : l'As d'atout est une bonne entame pour securiser le pli d'ouverture.`;
        }
        return `${positionLabel} et vous avez pris : entamez dans votre couleur la plus solide, puis reprenez l'initiative a l'atout.`;
      }

      return `${positionLabel} et vous avez pris : jouez proprement vos atouts forts, puis valorisez vos As hors-atout.`;
    }

    if (bidOutcome === "other" && otherTaker === "partner") {
      if (playerPosition === "3") {
        return "Vous etes 3e position. Votre partenaire a pris : gardez vos As pour plus tard et jouez bas au debut.";
      }
      return `${positionLabel}. Votre partenaire a pris : soutenez son plan, economisez vos grosses cartes et coupez seulement quand utile.`;
    }

    if (bidOutcome === "other" && otherTaker === "opponent") {
      return `${positionLabel}. Un adversaire a pris : entamez prudent, gardez des reprises et forcez-le a depenser ses atouts.`;
    }

    return `${positionLabel} : adaptez l'entame a la couleur d'atout et a la force reelle de votre main.`;
  }, [bidOutcome, contractSuit, fullHandReady, fullHandCards, otherTaker, playerPosition]);

  function resetAll() {
    setHandIds([]);
    setTurnId(null);
    setExtraIds([]);
    setPlayerPosition("1");
    setDealerPosition("4");
    setBidOutcome("none");
    setOtherTaker("");
    setOpponentPosition("");
    setContractSuit("");
    setPassedToSecondRound(false);
    setTrickCards({});
    setDeadCardIds([]);
    setLeadSuit(null);
    setActiveOtherPlayer("left");
    setVoidByPlayer({ you: [], left: [], partner: [], right: [] });
    setPlayAlerts([]);
    setPlayUndoStack([]);
    setIsDeckModalOpen(false);
  }

  function pickCard(card: Card) {
    if (selectedIds.has(card.id)) return;

    if (handIds.length < 5) {
      setHandIds((prev) => [...prev, card.id]);
      return;
    }

    if (!turnId) {
      setTurnId(card.id);
      return;
    }

    if ((bidOutcome === "me" && extraIds.length < myTakeNeedsExtras) || (bidOutcome === "other" && extraIds.length < 3)) {
      setExtraIds((prev) => [...prev, card.id]);
    }
  }

  function removeFromHand(id: string) {
    setHandIds((prev) => prev.filter((cardId) => cardId !== id));
  }

  function clearTurn() {
    setTurnId(null);
    setBidOutcome("none");
    setOtherTaker("");
    setOpponentPosition("");
    setContractSuit("");
    setExtraIds([]);
    setPassedToSecondRound(false);
    setTrickCards({});
    setDeadCardIds([]);
    setLeadSuit(null);
    setVoidByPlayer({ you: [], left: [], partner: [], right: [] });
    setPlayAlerts([]);
    setPlayUndoStack([]);
    setIsDeckModalOpen(false);
  }

  function removeExtra(id: string) {
    setExtraIds((prev) => prev.filter((cardId) => cardId !== id));
  }

  function chooseTake() {
    if (!turnCard && !passedToSecondRound) return;
    setBidOutcome("me");
    if (passedToSecondRound) {
      setContractSuit("");
    } else if (turnCard) {
      setContractSuit(turnCard.suit);
    }
    setOtherTaker("");
    setOpponentPosition("");
    setExtraIds([]);
    setTrickCards({});
    setDeadCardIds([]);
    setLeadSuit(null);
    setVoidByPlayer({ you: [], left: [], partner: [], right: [] });
    setPlayAlerts([]);
    setPlayUndoStack([]);
    setIsDeckModalOpen(false);
  }

  function chooseOtherTake() {
    setBidOutcome("other");
    setOtherTaker("");
    setOpponentPosition("");
    setExtraIds([]);
    setPassedToSecondRound(false);
    setTrickCards({});
    setDeadCardIds([]);
    setLeadSuit(null);
    setVoidByPlayer({ you: [], left: [], partner: [], right: [] });
    setPlayAlerts([]);
    setPlayUndoStack([]);
    setIsDeckModalOpen(false);
  }

  function handlePositionDrop(position: PlayerPosition, role: "me" | "dealer") {
    if (role === "me") {
      setPlayerPosition(position);
      return;
    }
    setDealerPosition(position);
  }

  function pushPlayAlert(message: string) {
    setPlayAlerts((prev) => [message, ...prev].slice(0, 4));
  }

  function registerPlay(player: TablePlayer, cardId: string) {
    if (!fullHandReady || trickCards[player]) return;
    if (playedCardSet.has(cardId)) return;
    if (expectedPlayer && player !== expectedPlayer) return;

    const card = DECK.find((entry) => entry.id === cardId);
    if (!card) return;
    setPlayUndoStack((prev) => [
      ...prev,
      {
        trickCards: { ...trickCards },
        leadSuit,
        voidByPlayer: {
          you: [...voidByPlayer.you],
          left: [...voidByPlayer.left],
          partner: [...voidByPlayer.partner],
          right: [...voidByPlayer.right],
        },
        playAlerts: [...playAlerts],
      },
    ]);

    const currentLeadSuit = leadSuit;
    if (!currentLeadSuit) {
      setLeadSuit(card.suit);
    } else if (card.suit !== currentLeadSuit) {
      setVoidByPlayer((prev) => {
        const suits = prev[player];
        if (suits.includes(currentLeadSuit)) return prev;
        return { ...prev, [player]: [...suits, currentLeadSuit] };
      });
      pushPlayAlert(`${TABLE_PLAYERS.find((p) => p.key === player)?.label} est coupe dans ${SUITS.find((s) => s.key === currentLeadSuit)?.label}.`);
    }

    const opponentPlayed = player === "left" || player === "right";
    const userHasAceInSuit = userCurrentHandCards.some((entry) => entry.suit === card.suit && entry.rank === "A");
    if (opponentPlayed && SMALL_RANKS.includes(card.rank) && userHasAceInSuit) {
      pushPlayAlert(
        `Impasse potentielle : petit ${cardLabel(card)} adverse, vous gardez l'As de ${SUITS.find((s) => s.key === card.suit)?.label}.`,
      );
    }

    setTrickCards((prev) => ({ ...prev, [player]: cardId }));
  }

  function undoLastPlay() {
    if (playUndoStack.length === 0) return;
    const snapshot = playUndoStack[playUndoStack.length - 1];
    setTrickCards(snapshot.trickCards);
    setLeadSuit(snapshot.leadSuit);
    setVoidByPlayer(snapshot.voidByPlayer);
    setPlayAlerts(snapshot.playAlerts);
    setPlayUndoStack((prev) => prev.slice(0, -1));
  }

  function closeTrick() {
    const cards = Object.values(trickCards).filter(Boolean) as string[];
    if (cards.length !== 4) return;
    setDeadCardIds((prev) => [...prev, ...cards]);
    setTrickCards({});
    setLeadSuit(null);
    setPlayUndoStack([]);
  }

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-900 sm:px-6">
      <div className="fixed right-4 top-4 z-50 flex gap-2 sm:right-6">
        <button
          onClick={() => setIsDeckModalOpen(true)}
          className="min-h-9 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white shadow"
        >
          Deck
        </button>
        <button
          onClick={resetAll}
          className="min-h-9 rounded-lg bg-zinc-700 px-3 text-xs font-semibold text-white shadow"
        >
          Reset
        </button>
      </div>
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <h2 className="mb-2 text-base font-semibold">Votre position</h2>
          <p className="mb-2 text-xs text-zinc-600">Glissez-deposez les jetons sur la table: `Moi` et `Donneur`.</p>
          <div className="mb-2 flex gap-2">
            <div
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/role", "me")}
              className="cursor-grab rounded-lg bg-blue-700 px-3 py-1 text-xs font-semibold text-white active:cursor-grabbing"
            >
              Moi
            </div>
            <div
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/role", "dealer")}
              className="cursor-grab rounded-lg border-2 border-amber-500 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 active:cursor-grabbing"
            >
              Donneur
            </div>
          </div>
          <div className="mx-auto grid max-w-sm grid-cols-3 grid-rows-3 gap-1.5">
            {POSITION_LAYOUT.map((spot) => {
              const option = POSITION_OPTIONS.find((item) => item.key === spot.key)!;
              const isMine = playerPosition === spot.key;
              const isDealer = dealerPosition === spot.key;
              const blockClass = isMine
                ? isDealer
                  ? "border-2 border-amber-400 bg-blue-700 text-white"
                  : "border border-blue-700 bg-blue-700 text-white"
                : isDealer
                  ? "border-2 border-amber-500 bg-amber-50 text-zinc-900"
                  : "border border-zinc-300 bg-white text-zinc-900";
              return (
                <div
                  key={`drop-${spot.key}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const role = event.dataTransfer.getData("text/role");
                    if (role === "me" || role === "dealer") {
                      handlePositionDrop(spot.key, role);
                    }
                  }}
                  className={`${spot.grid} min-h-14 rounded-lg px-1 py-1 text-[10px] font-semibold ${blockClass}`}
                >
                  <p>{option.label}</p>
                </div>
              );
            })}
            <div className="col-start-2 row-start-2 flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-1 text-[10px] font-semibold text-zinc-500">
              TABLE
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            La 1re position commence l'entame du premier pli.
          </p>
        </section>

        <section className="grid grid-cols-[3fr_1fr] gap-3 items-stretch">
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5 h-full">
            <div className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Hand className="h-4 w-4" />
              Votre main (Phase 1 : 5 cartes)
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, idx) => {
                const card = handCards[idx];
                return (
                <button
                    key={`hand-slot-${idx}`}
                    onClick={() => card && removeFromHand(card.id)}
                  className="min-h-12 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-1 text-[11px] font-semibold sm:text-xs"
                  >
                    {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "Vide"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5 h-full">
            <div className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Crown className="h-4 w-4" />
              La Tourne
            </div>
            <button
              onClick={() => turnCard && clearTurn()}
              className="min-h-12 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-xs font-semibold"
            >
              {turnCard ? <span className={cardColorClass(turnCard)}>{cardLabel(turnCard)}</span> : "Choisir la carte retournee"}
            </button>
          </div>
          <p className="col-span-2 -mt-1 text-xs text-zinc-500">
            Phase 2 : apres prise, ajoutez 2 cartes (vous montez a 8 ; les adversaires recoivent 3 chacun).
          </p>
        </section>

        {canShowCompletion && bidOutcome === "me" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Completion de la main : ajoutez {myTakeNeedsExtras} cartes</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {extraIds.length}/{myTakeNeedsExtras}
              </span>
            </div>
            {passedToSecondRound && (
              <p className="mb-3 text-sm text-zinc-600">
                Prise au 2e tour : la tourne vient chez vous, puis completez avec 2 cartes de distribution.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: myTakeNeedsExtras }).map((_, idx) => {
                const card = extraCards[idx];
                return (
                  <button
                    key={`extra-slot-${idx}`}
                    onClick={() => card && removeExtra(card.id)}
                    className="min-h-11 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-1 text-[11px] font-semibold sm:text-xs"
                  >
                    {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "Carte a venir"}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {canShowCompletion && bidOutcome === "other" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Completion de votre main : ajoutez 3 cartes</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {extraIds.length}/3
              </span>
            </div>
            <p className="mb-3 text-sm text-zinc-600">
              La carte retournee va au preneur, pas a vous.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 3 }).map((_, idx) => {
                const card = extraCards[idx];
                return (
                  <button
                    key={`extra-other-slot-${idx}`}
                    onClick={() => card && removeExtra(card.id)}
                    className="min-h-11 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-1 text-[11px] font-semibold sm:text-xs"
                  >
                    {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "Carte a venir"}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-2 text-lg font-semibold">Deck de cartes</h2>
          <p className="text-xs text-zinc-600">{deckStepLabel}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Les cartes deja choisies sont grisees. Compteur actuel : {selectedCardCount}/
            {bidOutcome === "me" ? 6 + myTakeNeedsExtras : bidOutcome === "other" ? 9 : 6}.
          </p>
        </section>

        {isDeckModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-xl sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Selection des cartes (32 cartes)</h3>
                  <p className="text-xs text-zinc-600">{deckStepLabel}</p>
                </div>
                <button
                  onClick={() => setIsDeckModalOpen(false)}
                  className="min-h-9 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white"
                >
                  Fermer
                </button>
              </div>
              <div className="grid max-h-[65vh] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
                {DECK.map((card) => {
                  const suit = SUITS.find((s) => s.key === card.suit)!;
                  const isSelected = selectedIds.has(card.id);
                  return (
                    <button
                      key={`modal-${card.id}`}
                      onClick={() => pickCard(card)}
                      disabled={isSelected || !canOpenDeck}
                      className={`min-h-10 rounded-lg border px-1 text-xs font-bold transition ${
                        isSelected || !canOpenDeck
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-200 text-zinc-500"
                          : `border-zinc-300 bg-white ${suit.color}`
                      }`}
                    >
                      {card.rank}
                      {suit.symbol}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {readyForFirstDecision && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-lg font-semibold">Decision 1 : Premier tour (couleur de la tourne a l'atout)</h3>
            {readyForFirstDecision && turnCard && firstRoundScore !== null ? (
              <div className="space-y-3 text-sm">
                <p>
                  Atout teste :{" "}
                  <strong className={suitColorClass(turnCard.suit)}>
                    {SUITS.find((s) => s.key === turnCard.suit)?.label} ({turnCard.rank}
                    {SUITS.find((s) => s.key === turnCard.suit)?.symbol})
                  </strong>
                </p>
                <p>
                  Score de base (5 cartes + tourne) : <strong>{firstRoundScore}</strong>
                </p>
                <p>
                  Projection avec 2 cartes inconnues : <strong>{firstRoundProjected}</strong>
                </p>
                <p className={firstRoundProjected && firstRoundProjected > 40 ? "text-emerald-700" : "text-orange-700"}>
                  Recommandation :{" "}
                  <strong>
                    {firstRoundProjected && firstRoundProjected > 45
                      ? "Prenez avec confiance"
                      : firstRoundProjected && firstRoundProjected > 40
                        ? "Prise jouable mais limite"
                        : "Passez et re-evaluez au 2e tour"}
                  </strong>
                </p>
                {firstRoundBelote && (
                  <p className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    Belote-Rebelote detectee (R+D a l'atout) : +20 points potentiels.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Choisissez exactement 5 cartes de main et 1 carte de tourne pour activer l'avis du 1er tour.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-lg font-semibold">Decision 2 : Si la tourne est refusee</h3>
            <div className="mb-3">
              <button
                onClick={() => setPassedToSecondRound((prev) => !prev)}
                disabled={!readyForSecondDecision || bidOutcome !== "none"}
                className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${
                  !readyForSecondDecision || bidOutcome !== "none"
                    ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                    : passedToSecondRound
                      ? "bg-orange-700 text-white"
                      : "bg-orange-100 text-orange-800"
                }`}
              >
                {passedToSecondRound ? "Passe annoncee pour le 2e tour" : "Je passe (aller au choix 2)"}
              </button>
              <p className="mt-1 text-xs text-zinc-500">
                Utilisez ce bouton pour indiquer a l'IA que vous passez au premier tour.
              </p>
            </div>
            {readyForSecondDecision && passedToSecondRound ? (
              <div className="space-y-2 text-sm">
                {secondRoundScores.map((item) => (
                  <div key={item.suit} className="rounded-lg border border-zinc-200 p-2">
                    <p>
                      <strong className={suitColorClass(item.suit)}>
                        {item.label}
                      </strong>
                      : {item.score} pts sur vos 5 cartes
                    </p>
                    {item.hasBelote && (
                      <p className="text-emerald-700">Belote-Rebelote disponible (+20) sur cette couleur.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {readyForSecondDecision
                  ? "Indiquez d'abord que vous passez pour afficher l'analyse du 2e tour."
                  : "Renseignez d'abord vos 5 cartes pour comparer les couleurs du 2e tour."}
              </p>
            )}
          </div>
        </section>
        )}

        {readyForBidTransition && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-lg font-semibold">Issue des encheres</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={chooseTake}
                className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${
                  bidOutcome === "me" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <Play className="h-4 w-4" />
                Je prends
              </button>
              <button
                onClick={chooseOtherTake}
                className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${
                  bidOutcome === "other" ? "bg-orange-700 text-white" : "bg-orange-100 text-orange-800"
                }`}
              >
                <Play className="h-4 w-4" />
                Quelqu'un d'autre prend
              </button>
            </div>

            {bidOutcome === "me" && passedToSecondRound && (
              <div className="mt-4 rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-semibold">Quelle couleur prenez-vous au 2e tour ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUITS.filter((suit) => suit.key !== turnCard?.suit).map((suit) => (
                    <button
                      key={`my-second-round-${suit.key}`}
                      onClick={() => setContractSuit(suit.key)}
                      className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${
                        contractSuit === suit.key
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : `border-zinc-300 bg-white ${suit.color}`
                      }`}
                    >
                      {suit.label} {suit.symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bidOutcome === "other" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-3">
                  <p className="mb-2 text-sm font-semibold">Qui prend ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setOtherTaker("partner");
                        setOpponentPosition("");
                      }}
                      className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${
                        otherTaker === "partner" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      Partenaire
                    </button>
                    <button
                      onClick={() => setOtherTaker("opponent")}
                      className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${
                        otherTaker === "opponent" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      Opposant
                    </button>
                  </div>
                  {otherTaker === "opponent" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOpponentPosition("left")}
                        className={`min-h-10 rounded-lg px-2 text-xs font-semibold ${
                          opponentPosition === "left" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        Opposant de gauche prend
                      </button>
                      <button
                        onClick={() => setOpponentPosition("right")}
                        className={`min-h-10 rounded-lg px-2 text-xs font-semibold ${
                          opponentPosition === "right" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        Opposant de droite prend
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 p-3">
                  <p className="mb-2 text-sm font-semibold">Quelle couleur ?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUITS.map((suit) => (
                      <button
                        key={`contract-${suit.key}`}
                        onClick={() => setContractSuit(suit.key)}
                        className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${
                          contractSuit === suit.key
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : `border-zinc-300 bg-white ${suit.color}`
                        }`}
                      >
                        {suit.label} {suit.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {bidOutcome === "other" && otherTaker === "opponent" && opponentPosition && (
              <p className="mt-3 text-sm text-zinc-600">
                Information prise en compte :{" "}
                <strong>{opponentPosition === "left" ? "l'opposant de gauche" : "l'opposant de droite"}</strong> prend
                la tourne.
              </p>
            )}
          </section>
        )}

        {fullHandReady && (
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">Main complete (8 cartes)</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: 8 }).map((_, idx) => {
              const card = fullHandCards[idx];
              return (
                <div
                  key={`full-hand-${idx}`}
                  className="min-h-12 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-2 py-2 text-center text-sm font-semibold"
                >
                  {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "-"}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Cette vue devient complete apres la prise et l'ajout des 2 cartes finales.
          </p>
        </section>
        )}

        {fullHandReady && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Play Phase - Table</h2>
              <div className="flex gap-2">
                <button
                  onClick={undoLastPlay}
                  disabled={playUndoStack.length === 0}
                  className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                    playUndoStack.length > 0 ? "bg-zinc-700 text-white" : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  Retour arriere
                </button>
                <button
                  onClick={closeTrick}
                  disabled={currentTrickIds.length !== 4}
                  className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                    currentTrickIds.length === 4 ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  Terminer le pli
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs text-zinc-600">
              Saisie en ordre des joueurs. Joueur attendu :{" "}
              <strong>{expectedPlayer ? TABLE_PLAYERS.find((p) => p.key === expectedPlayer)?.label : "Pli complet"}</strong>
            </p>

            <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
              <div />
              {(() => {
                const player = TABLE_PLAYERS.find((entry) => entry.key === "partner")!;
                const cardId = trickCards[player.key];
                const card = cardId ? DECK.find((entry) => entry.id === cardId) : null;
                const isVoidInLead = leadSuit ? voidByPlayer[player.key].includes(leadSuit) : false;
                const isExpected = expectedPlayer === player.key;
                return (
                  <div
                    key={`table-${player.key}`}
                    className={`rounded-xl border p-3 ${isExpected ? "border-2 border-blue-600 bg-blue-50" : "border-zinc-200 bg-white"}`}
                  >
                    <p className="text-xs font-semibold text-zinc-500">{player.label}</p>
                    <div className="mt-2 min-h-10 rounded-lg bg-zinc-50 px-2 py-2 text-center text-sm font-semibold">
                      {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "-"}
                    </div>
                    {isVoidInLead && <p className="mt-1 text-[11px] text-orange-700">Coupe/void sur la couleur demandee</p>}
                  </div>
                );
              })()}
              <div />
              {(["left", "right"] as TablePlayer[]).map((key, index) => {
                const player = TABLE_PLAYERS.find((entry) => entry.key === key)!;
                const cardId = trickCards[player.key];
                const card = cardId ? DECK.find((entry) => entry.id === cardId) : null;
                const isVoidInLead = leadSuit ? voidByPlayer[player.key].includes(leadSuit) : false;
                const isExpected = expectedPlayer === player.key;
                return (
                  <div
                    key={`table-${player.key}-${index}`}
                    className={`rounded-xl border p-3 ${isExpected ? "border-2 border-blue-600 bg-blue-50" : "border-zinc-200 bg-white"}`}
                  >
                    <p className="text-xs font-semibold text-zinc-500">{player.label}</p>
                    <div className="mt-2 min-h-10 rounded-lg bg-zinc-50 px-2 py-2 text-center text-sm font-semibold">
                      {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "-"}
                    </div>
                    {isVoidInLead && <p className="mt-1 text-[11px] text-orange-700">Coupe/void sur la couleur demandee</p>}
                  </div>
                );
              })}
              <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-2 text-[11px] font-semibold text-zinc-500">
                TABLE
              </div>
              <div />
              {(() => {
                const player = TABLE_PLAYERS.find((entry) => entry.key === "you")!;
                const cardId = trickCards[player.key];
                const card = cardId ? DECK.find((entry) => entry.id === cardId) : null;
                const isVoidInLead = leadSuit ? voidByPlayer[player.key].includes(leadSuit) : false;
                const isExpected = expectedPlayer === player.key;
                return (
                  <div
                    key={`table-${player.key}`}
                    className={`rounded-xl border p-3 ${isExpected ? "border-2 border-blue-600 bg-blue-50" : "border-zinc-200 bg-white"}`}
                  >
                    <p className="text-xs font-semibold text-zinc-500">{player.label}</p>
                    <div className="mt-2 min-h-10 rounded-lg bg-zinc-50 px-2 py-2 text-center text-sm font-semibold">
                      {card ? <span className={cardColorClass(card)}>{cardLabel(card)}</span> : "-"}
                    </div>
                    {isVoidInLead && <p className="mt-1 text-[11px] text-orange-700">Coupe/void sur la couleur demandee</p>}
                  </div>
                );
              })()}
              <div />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-semibold">Votre main jouable</p>
                <div className="grid grid-cols-4 gap-2">
                  {userCurrentHandCards.map((card) => (
                    <button
                      key={`play-you-${card.id}`}
                      onClick={() => registerPlay("you", card.id)}
                      disabled={!!trickCards.you || expectedPlayer !== "you"}
                      className={`min-h-9 rounded-lg border px-1 text-xs font-semibold ${
                        trickCards.you || expectedPlayer !== "you"
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-200 text-zinc-500"
                          : `border-zinc-300 bg-white ${cardColorClass(card)}`
                      }`}
                    >
                      {cardLabel(card)}
                      {masterCardIds.has(card.id) ? " ★" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-semibold">Saisie rapide des autres joueurs (1 tap)</p>
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {TABLE_PLAYERS.filter((player) => player.key !== "you").map((player) => (
                    <button
                      key={`active-${player.key}`}
                      onClick={() => setActiveOtherPlayer(player.key)}
                      disabled={expectedPlayer === "you"}
                      className={`min-h-9 rounded-lg px-2 text-xs font-semibold ${
                        activeOtherPlayer === player.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      {player.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {remainingDeckForOthers.map((card) => (
                    <button
                      key={`other-play-${card.id}`}
                      onClick={() => registerPlay(expectedPlayer && expectedPlayer !== "you" ? expectedPlayer : activeOtherPlayer, card.id)}
                      disabled={
                        expectedPlayer === "you" ||
                        (expectedPlayer !== null && expectedPlayer !== "you" && !!trickCards[expectedPlayer]) ||
                        (expectedPlayer === null && !!trickCards[activeOtherPlayer])
                      }
                      className={`min-h-7 rounded-md border px-1 text-[11px] font-semibold ${
                        expectedPlayer === "you" ||
                        (expectedPlayer !== null && expectedPlayer !== "you" && !!trickCards[expectedPlayer]) ||
                        (expectedPlayer === null && !!trickCards[activeOtherPlayer])
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-200 text-zinc-500"
                          : `border-zinc-300 bg-white ${cardColorClass(card)}`
                      }`}
                    >
                      {cardLabel(card)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="text-sm font-semibold">Dashboard</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Atouts restants en circulation : <strong>{trumpCountInWild ?? "-"}</strong>
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Cartes maitresses dans votre main : <strong>{masterCardIds.size}</strong>
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3 lg:col-span-2">
                <p className="mb-2 text-sm font-semibold">Miniature deck - cartes jouees</p>
                <div className="grid grid-cols-8 gap-1">
                  {deadCardIds.length === 0 ? (
                    <p className="col-span-8 text-xs text-zinc-500">Aucune carte morte pour l'instant.</p>
                  ) : (
                    deadCardIds.map((id) => {
                      const card = DECK.find((entry) => entry.id === id);
                      if (!card) return null;
                      return (
                        <div
                          key={`dead-${id}`}
                          className={`rounded-md border border-zinc-200 bg-zinc-50 px-1 py-1 text-center text-[11px] font-semibold ${cardColorClass(card)}`}
                        >
                          {cardLabel(card)}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {playAlerts.length > 0 && (
              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <p className="mb-2 text-sm font-semibold text-orange-800">Alertes strategiques</p>
                <ul className="space-y-1 text-xs text-orange-800">
                  {playAlerts.map((alert) => (
                    <li key={alert}>- {alert}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {readyForFirstDecision && (
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">Conseils du coach</h2>
          {fullHandReady ? (
            <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Conseil d'entame :</strong> {firstLeadTip}
            </div>
          ) : null}
          {insights.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {insights.map((insight) => (
                <li key={insight} className="flex items-start gap-2 rounded-lg bg-zinc-50 p-2">
                  {insight.toLowerCase().includes("risque") ? (
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  ) : insight.toLowerCase().includes("solide") ? (
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  )}
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              Les conseils apparaissent apres selection de la main et de la tourne.
            </p>
          )}
        </section>
        )}

        <footer className="rounded-2xl bg-zinc-900 p-4 text-zinc-100 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4" />
            Pro Tip
          </div>
          <p className="mt-2 text-xs text-zinc-400">Rappel total des points : {TOTAL_POINTS} (10 de der inclus).</p>
          <p className="mt-2 text-sm text-zinc-300">
            {hasImpassePattern
              ? "Vous avez un As et un Roi dans la meme couleur : pensez a l'impasse (finesse) pour pieger la Dame ou le Valet manquant selon le contexte."
              : "Impasse (finesse) : jouez depuis votre force pour faire tomber un honneur cle adverse, puis gardez le controle avec votre autre grosse carte."}
          </p>
        </footer>
      </main>
    </div>
  );
}
