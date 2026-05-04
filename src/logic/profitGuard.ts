/**
 * Profit Guard Logic Module
 * 
 * Specifically designed to help sari-sari store owners maintain margins
 * during supplier price hikes.
 */

export interface PriceSuggestion {
  shouldUpdate: boolean;
  oldCost: number;
  newCost: number;
  currentSellingPrice: number;
  suggestedSellingPrice: number;
  marginImpact: number; // Percent
}

export const calculateProfitGuard = (
  currentCost: number,
  newCost: number,
  currentSellingPrice: number,
  targetMargin: number = 0.15
): PriceSuggestion => {
  const percentChange = ((newCost - currentCost) / currentCost) * 100;
  const suggestedSellingPrice = Math.ceil(newCost / (1 - targetMargin));
  const potentialMargin = (currentSellingPrice - newCost) / currentSellingPrice;
  const marginImpact = (targetMargin - potentialMargin) * 100;

  return {
    shouldUpdate: newCost > currentCost,
    oldCost: currentCost,
    newCost,
    currentSellingPrice,
    suggestedSellingPrice,
    marginImpact
  };
};

export const suggestLiquidationPrice = (
  costPrice: number,
  currentSellingPrice: number,
  daysInactive: number
): number => {
  if (daysInactive < 30) return currentSellingPrice;
  return Math.ceil(costPrice * 1.02);
};
