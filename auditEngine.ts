export type Currency = "USD" | "INR";

export type PrimaryUseCase = "Coding" | "Writing" | "Data" | "Research" | "Mixed";

export type ToolName =
  | "ChatGPT"
  | "GitHub Copilot"
  | "Anthropic API direct"
  | "Claude"
  | "OpenAI API direct"
  | "Gemini"
  | "Windsurf";

export type AuditInput = {
  selectedTools: ToolName[];
  selectedPlans: Record<string, string>;
  monthlySpend: number;
  currency: Currency;
  primaryUseCase: PrimaryUseCase;
  teamSize: number;
  seats: number;
};

export type ToolRecommendation = {
  tool: ToolName;
  currentPlan: string;
  recommendedPlan: string;
  currentMonthlySpend: number;
  optimizedMonthlySpend: number;
  monthlySavings: number;
  annualSavings: number;
  action: string;
  reason: string;
  severity: "good" | "low" | "medium" | "high";
};

export type AuditResult = {
  currency: Currency;
  currencySymbol: "$" | "Rs ";
  currentMonthlySpend: number;
  optimizedMonthlySpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  savingsScore: number;
  overspendStatus: "Spending well" | "Low overspend" | "Moderate overspend" | "High overspend";
  summary: string;
  recommendations: ToolRecommendation[];
  chartData: {
    currentVsOptimized: {
      label: string;
      value: number;
    }[];
    overspendByTool: {
      tool: ToolName;
      savings: number;
    }[];
  };
};

type ToolPricing = {
  plans: Record<string, number | null>;
  defaultPlan: string;
  individualPlan?: string;
  teamPlan?: string;
};

const USD_TO_INR = 83;

const PRICING_USD: Record<ToolName, ToolPricing> = {
  ChatGPT: {
    plans: {
      Plus: 20,
      Team: 30,
      Enterprise: null,
      "API direct": null,
    },
    defaultPlan: "Plus",
    individualPlan: "Plus",
    teamPlan: "Team",
  },
  "GitHub Copilot": {
    plans: {
      Individual: 10,
      Business: 19,
      Enterprise: 39,
    },
    defaultPlan: "Individual",
    individualPlan: "Individual",
    teamPlan: "Business",
  },
  Claude: {
    plans: {
      Free: 0,
      Pro: 20,
      Max: 100,
      Team: 30,
      Enterprise: null,
      "API direct": null,
    },
    defaultPlan: "Pro",
    individualPlan: "Pro",
    teamPlan: "Team",
  },
  Gemini: {
    plans: {
      Pro: 20,
      Ultra: 250,
      API: null,
    },
    defaultPlan: "Pro",
    individualPlan: "Pro",
  },
  Windsurf: {
    plans: {
      Free: 0,
      Pro: 15,
      Team: 30,
      Enterprise: null,
    },
    defaultPlan: "Pro",
    individualPlan: "Pro",
    teamPlan: "Team",
  },
  "Anthropic API direct": {
    plans: {
      "API direct": null,
    },
    defaultPlan: "API direct",
  },
  "OpenAI API direct": {
    plans: {
      "API direct": null,
    },
    defaultPlan: "API direct",
  },
};

export function runAudit(input: AuditInput): AuditResult {
  const normalizedInput = normalizeInput(input);
  const perToolSpend = splitSpendAcrossTools(
    normalizedInput.monthlySpend,
    normalizedInput.selectedTools.length
  );

  const recommendations = normalizedInput.selectedTools.map((tool) =>
    auditTool(tool, normalizedInput, perToolSpend)
  );

  const currentMonthlySpend = roundMoney(normalizedInput.monthlySpend);
  const totalMonthlySavings = roundMoney(
    recommendations.reduce((total, item) => total + item.monthlySavings, 0)
  );
  const optimizedMonthlySpend = roundMoney(
    Math.max(currentMonthlySpend - totalMonthlySavings, 0)
  );
  const totalAnnualSavings = roundMoney(totalMonthlySavings * 12);
  const savingsScore = calculateSavingsScore(
    currentMonthlySpend,
    totalMonthlySavings
  );
  const overspendStatus = getOverspendStatus(
    normalizedInput.currency,
    totalMonthlySavings
  );

  return {
    currency: normalizedInput.currency,
    currencySymbol: normalizedInput.currency === "INR" ? "Rs " : "$",
    currentMonthlySpend,
    optimizedMonthlySpend,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsScore,
    overspendStatus,
    summary: createSummary({
      savingsScore,
      overspendStatus,
      totalMonthlySavings,
      totalAnnualSavings,
      currencySymbol: normalizedInput.currency === "INR" ? "₹" : "$",
    }),
    recommendations,
    chartData: {
      currentVsOptimized: [
        { label: "Current", value: currentMonthlySpend },
        { label: "Optimized", value: optimizedMonthlySpend },
      ],
      overspendByTool: recommendations.map((item) => ({
        tool: item.tool,
        savings: item.monthlySavings,
      })),
    },
  };
}

function normalizeInput(input: AuditInput): AuditInput {
  return {
    ...input,
    monthlySpend: Math.max(Number(input.monthlySpend) || 0, 0),
    teamSize: Math.max(Number(input.teamSize) || 1, 1),
    seats: Math.max(Number(input.seats) || 1, 1),
  };
}

function auditTool(
  tool: ToolName,
  input: AuditInput,
  currentMonthlySpend: number
): ToolRecommendation {
  const selectedPlan = input.selectedPlans[tool] || PRICING_USD[tool].defaultPlan;
  const planPrice = getPlanPrice(tool, selectedPlan, input.currency);
  const retailFit = auditRetailPlan({
    tool,
    selectedPlan,
    input,
    currentMonthlySpend,
    planPrice,
  });

  if (retailFit) {
    return retailFit;
  }

  if (isApiTool(tool) || selectedPlan === "API direct" || selectedPlan === "API") {
    return auditApiSpend(tool, selectedPlan, input, currentMonthlySpend);
  }

  return keepPlan({
    tool,
    selectedPlan,
    currentMonthlySpend,
    reason:
      "Your selected plan and seat count look aligned with the team details provided.",
  });
}

function auditRetailPlan({
  tool,
  selectedPlan,
  input,
  currentMonthlySpend,
  planPrice,
}: {
  tool: ToolName;
  selectedPlan: string;
  input: AuditInput;
  currentMonthlySpend: number;
  planPrice: number | null;
}) {
  const pricing = PRICING_USD[tool];
  const teamPlan = pricing.teamPlan;
  const individualPlan = pricing.individualPlan;

  if (!individualPlan) {
    return null;
  }

  const individualPrice = getPlanPrice(tool, individualPlan, input.currency) ?? 0;
  const expectedIndividualCost = individualPrice * input.seats;

  if (teamPlan && selectedPlan === teamPlan && input.seats <= 2) {
    return recommend({
      tool,
      currentPlan: selectedPlan,
      recommendedPlan: individualPlan,
      currentMonthlySpend,
      optimizedMonthlySpend: expectedIndividualCost,
      action: `Switch to ${individualPlan}`,
      reason: `${selectedPlan} is usually strongest when a team needs admin controls, shared billing, or policy management. With ${input.seats} seat(s), ${individualPlan} is the cleaner fit.`,
    });
  }

  if (selectedPlan === "Enterprise" && input.seats < 25) {
    const fallbackPlan = teamPlan || individualPlan;
    const fallbackPrice = getPlanPrice(tool, fallbackPlan, input.currency) ?? 0;

    return recommend({
      tool,
      currentPlan: selectedPlan,
      recommendedPlan: fallbackPlan,
      currentMonthlySpend,
      optimizedMonthlySpend: fallbackPrice * input.seats,
      action: `Move from Enterprise to ${fallbackPlan}`,
      reason:
        "Enterprise plans are normally justified by larger seat counts, procurement, security review, and admin requirements. Your seat count does not yet point to that need.",
    });
  }

  if (planPrice !== null) {
    const expectedCost = planPrice * input.seats;
    const overspend = currentMonthlySpend - expectedCost;
    const overspendThreshold = Math.max(expectedCost * 0.25, convertFromUsd(10, input.currency));

    if (overspend > overspendThreshold) {
      return recommend({
        tool,
        currentPlan: selectedPlan,
        recommendedPlan: selectedPlan,
        currentMonthlySpend,
        optimizedMonthlySpend: expectedCost,
        action: "Correct seat count or billing",
        reason: `Based on ${input.seats} seat(s), this plan should be near ${formatMoney(expectedCost, input.currency)} monthly. Your entered spend is materially higher.`,
      });
    }
  }

  if (
    input.primaryUseCase !== "Coding" &&
    (tool === "GitHub Copilot" || tool === "Windsurf")
  ) {
    return recommend({
      tool,
      currentPlan: selectedPlan,
      recommendedPlan: "Remove or limit seats",
      currentMonthlySpend,
      optimizedMonthlySpend: 0,
      action: "Remove coding-only tool from non-coding workflow",
      reason: `${tool} is most valuable for software development. Your primary use case is ${input.primaryUseCase}, so this spend is likely avoidable unless developers are actively using it.`,
    });
  }

  return null;
}

function auditApiSpend(
  tool: ToolName,
  selectedPlan: string,
  input: AuditInput,
  currentMonthlySpend: number
) {
  const monthlyPerSeat = currentMonthlySpend / input.seats;
  const highApiThreshold = convertFromUsd(75, input.currency);
  const optimizedMonthlySpend =
    monthlyPerSeat > highApiThreshold
      ? currentMonthlySpend * 0.75
      : currentMonthlySpend;

  if (optimizedMonthlySpend < currentMonthlySpend) {
    return recommend({
      tool,
      currentPlan: selectedPlan,
      recommendedPlan: "Usage caps + cheaper model routing",
      currentMonthlySpend,
      optimizedMonthlySpend,
      action: "Add usage caps and route simple work to cheaper models",
      reason:
        "API billing is usage-based. Your spend per seat is high enough to justify model routing, budget alerts, caching, or credits before buying more seats.",
    });
  }

  return keepPlan({
    tool,
    selectedPlan,
    currentMonthlySpend,
    reason:
      "API spend does not look high enough from these inputs to force a downgrade. Keep monitoring usage and set budget alerts.",
  });
}

function recommend({
  tool,
  currentPlan,
  recommendedPlan,
  currentMonthlySpend,
  optimizedMonthlySpend,
  action,
  reason,
}: {
  tool: ToolName;
  currentPlan: string;
  recommendedPlan: string;
  currentMonthlySpend: number;
  optimizedMonthlySpend: number;
  action: string;
  reason: string;
}): ToolRecommendation {
  const safeOptimizedSpend = roundMoney(Math.max(optimizedMonthlySpend, 0));
  const monthlySavings = roundMoney(
    Math.max(currentMonthlySpend - safeOptimizedSpend, 0)
  );

  return {
    tool,
    currentPlan,
    recommendedPlan,
    currentMonthlySpend: roundMoney(currentMonthlySpend),
    optimizedMonthlySpend: safeOptimizedSpend,
    monthlySavings,
    annualSavings: roundMoney(monthlySavings * 12),
    action,
    reason,
    severity: getSeverity(monthlySavings),
  };
}

function keepPlan({
  tool,
  selectedPlan,
  currentMonthlySpend,
  reason,
}: {
  tool: ToolName;
  selectedPlan: string;
  currentMonthlySpend: number;
  reason: string;
}): ToolRecommendation {
  return {
    tool,
    currentPlan: selectedPlan,
    recommendedPlan: selectedPlan,
    currentMonthlySpend: roundMoney(currentMonthlySpend),
    optimizedMonthlySpend: roundMoney(currentMonthlySpend),
    monthlySavings: 0,
    annualSavings: 0,
    action: "Keep current plan",
    reason,
    severity: "good",
  };
}

function splitSpendAcrossTools(monthlySpend: number, toolCount: number) {
  if (toolCount <= 0) {
    return 0;
  }

  return roundMoney(monthlySpend / toolCount);
}

function getPlanPrice(
  tool: ToolName,
  plan: string,
  currency: Currency
): number | null {
  const priceUsd = PRICING_USD[tool].plans[plan];

  if (priceUsd === null || priceUsd === undefined) {
    return null;
  }

  return convertFromUsd(priceUsd, currency);
}

function convertFromUsd(amount: number, currency: Currency) {
  return currency === "INR" ? roundMoney(amount * USD_TO_INR) : amount;
}

function calculateSavingsScore(currentSpend: number, savings: number) {
  if (currentSpend <= 0 || savings <= 0) {
    return 100;
  }

  const wastedRatio = savings / currentSpend;

  return Math.max(0, Math.min(100, Math.round(100 - wastedRatio * 100)));
}

function getOverspendStatus(currency: Currency, savings: number) {
  const high = convertFromUsd(500, currency);
  const moderate = convertFromUsd(100, currency);

  if (savings >= high) {
    return "High overspend";
  }

  if (savings >= moderate) {
    return "Moderate overspend";
  }

  if (savings > 0) {
    return "Low overspend";
  }

  return "Spending well";
}

function getSeverity(monthlySavings: number): ToolRecommendation["severity"] {
  if (monthlySavings >= 500) {
    return "high";
  }

  if (monthlySavings >= 100) {
    return "medium";
  }

  if (monthlySavings > 0) {
    return "low";
  }

  return "good";
}

function createSummary({
  savingsScore,
  overspendStatus,
  totalMonthlySavings,
  totalAnnualSavings,
  currencySymbol,
}: {
  savingsScore: number;
  overspendStatus: AuditResult["overspendStatus"];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  currencySymbol: "$" | "₹";
}) {
  if (totalMonthlySavings <= 0) {
    return `Your AI stack looks controlled. Savings score is ${savingsScore}/100, and no obvious monthly waste was detected from the current inputs.`;
  }

  return `Your audit found ${overspendStatus.toLowerCase()} with estimated savings of ${currencySymbol}${totalMonthlySavings}/month, or ${currencySymbol}${totalAnnualSavings}/year. Start with the highest-savings recommendation first.`;
}

function formatMoney(amount: number, currency: Currency) {
  const symbol = currency === "INR" ? "Rs " : "$";

  return `${symbol}${roundMoney(amount)}`;
}

function isApiTool(tool: ToolName) {
  return tool === "Anthropic API direct" || tool === "OpenAI API direct";
}

function roundMoney(amount: number) {
  return Math.round(amount);
}
