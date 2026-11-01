import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEqualShares,
  validateSplitShares,
  getOutstandingShare,
  isUserSettlementAllowed,
  summarizeUserSplits,
} from "../src/utils/splitEngine.js";

test("equal split shares sum exactly to total paise", () => {
  for (const [amount, count] of [[1200, 3], [100, 6], [10, 3], [0.1, 3], [999.99, 7]]) {
    const shares = calculateEqualShares(amount, count);
    assert.equal(Math.round(shares.reduce((sum, share) => sum + share, 0) * 100), Math.round(amount * 100));
  }
});

test("validates exact custom shares and requires unique names including Me", () => {
  assert.equal(validateSplitShares(1200, [{name:"Me",share:400},{name:"A",share:400},{name:"B",share:400}]), null);
  assert.match(validateSplitShares(1200, [{name:"Me",share:400},{name:"A",share:399}]), /add up/);
  assert.match(validateSplitShares(1200, [{name:"Me",share:600},{name:"me",share:600}]), /unique/);
  assert.match(validateSplitShares(1200, [{name:"A",share:600},{name:"B",share:600}]), /Me/);
});

test("outstanding share never becomes negative", () => {
  assert.equal(getOutstandingShare({share:400,settledAmount:150}),250);
  assert.equal(getOutstandingShare({share:400,settledAmount:450}),0);
});

test("settlement action is limited to balances owed to or by the user", () => {
  assert.equal(isUserSettlementAllowed({paidBy:"Me"},{name:"Friend"}),true);
  assert.equal(isUserSettlementAllowed({paidBy:"Me"},{name:"Me"}),false);
  assert.equal(isUserSettlementAllowed({paidBy:"Friend"},{name:"Me"}),true);
  assert.equal(isUserSettlementAllowed({paidBy:"Friend"},{name:"Other friend"}),false);
});

test("summary shows user receivable and payable balances only", () => {
  const summary = summarizeUserSplits([
    {paidBy:"Me",participants:[{name:"Me",share:400,settledAmount:400},{name:"A",share:400,settledAmount:100}]},
    {paidBy:"A",participants:[{name:"Me",share:250,settledAmount:50},{name:"A",share:250,settledAmount:250}]}
  ]);
  assert.equal(summary.owedToYou,300);
  assert.equal(summary.youOwe,200);
  assert.equal(summary.openSplits,2);
});
