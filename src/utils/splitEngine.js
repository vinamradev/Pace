export function roundToPaise(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateEqualShares(total, count) {
  const amount = roundToPaise(total);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(count) || count < 1) {
    throw new Error("A valid amount and participant count are required.");
  }
  const cents = Math.round(amount * 100);
  const baseCents = Math.floor(cents / count);
  const remainderCents = cents - baseCents * count;
  return Array.from({ length: count }, (_, index) =>
    (baseCents + (index === count - 1 ? remainderCents : 0)) / 100
  );
}

export function validateSplitShares(total, participants) {
  const amount = roundToPaise(total);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount greater than zero.";
  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 30) {
    return "Add between 2 and 30 participants.";
  }
  const names = participants.map(person => String(person.name || "").trim().toLowerCase());
  if (names.some(name => !name) || new Set(names).size !== names.length) {
    return "Participant names must be present and unique.";
  }
  if (!names.includes("me")) return 'Add yourself using the name "Me".';
  const shares = participants.map(person => Number(person.share));
  if (shares.some(share => !Number.isFinite(share) || share < 0)) {
    return "Each participant must have a valid, non-negative share.";
  }
  if (shares.some(share => roundToPaise(share) !== share)) return "Shares must be entered up to two decimal places.";
  const allocated = roundToPaise(shares.reduce((sum, share) => sum + share, 0));
  if (allocated !== amount) return "Custom shares must add up to the full expense amount.";
  return null;
}

export function getOutstandingShare(participant) {
  return roundToPaise(Math.max(0, Number(participant?.share || 0) - Number(participant?.settledAmount || 0)));
}

export function isUserSettlementAllowed(split, participant) {
  const payerIsMe = String(split?.paidBy || "").toLowerCase() === "me";
  const participantIsMe = String(participant?.name || "").toLowerCase() === "me";
  return payerIsMe ? !participantIsMe : participantIsMe;
}

export function summarizeUserSplits(splits = []) {
  return splits.reduce((totals, split) => {
    const payerIsMe = String(split.paidBy || "").toLowerCase() === "me";
    const participants = split.participants || [];
    if (payerIsMe) {
      totals.owedToYou += participants
        .filter(person => String(person.name || "").toLowerCase() !== "me")
        .reduce((sum, person) => sum + getOutstandingShare(person), 0);
      if (participants.some(person => String(person.name || "").toLowerCase() !== "me" && getOutstandingShare(person) > 0)) {
        totals.openSplits += 1;
      }
    } else {
      const me = participants.find(person => String(person.name || "").toLowerCase() === "me");
      totals.youOwe += getOutstandingShare(me);
      if (getOutstandingShare(me) > 0) totals.openSplits += 1;
    }
    return totals;
  }, { owedToYou: 0, youOwe: 0, openSplits: 0 });
}
