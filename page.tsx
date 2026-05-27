"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  runAudit,
  type AuditResult,
  type Currency,
  type PrimaryUseCase,
  type ToolName,
} from "@/lib/auditEngine";

const tools: ToolName[] = [
  "ChatGPT",
  "GitHub Copilot",
  "Anthropic API direct",
  "Claude",
  "OpenAI API direct",
  "Gemini",
  "Windsurf",
];

const useCases = ["Coding", "Writing", "Data", "Research", "Mixed"] as const;
const currencies = ["USD", "INR"] as const;

const plansByTool: Record<ToolName, string[]> = {
  ChatGPT: ["Plus", "Team", "Enterprise", "API direct"],
  "GitHub Copilot": ["Individual", "Business", "Enterprise"],
  "Anthropic API direct": ["API direct"],
  Claude: ["Free", "Pro", "Max", "Team", "Enterprise", "API direct"],
  "OpenAI API direct": ["API direct"],
  Gemini: ["Pro", "Ultra", "API"],
  Windsurf: ["Free", "Pro", "Team", "Enterprise"],
};

function onlyPositiveDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function Home() {
    const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedTools, setSelectedTools] = useState<ToolName[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>(
    {}
  );

  const [monthlySpend, setMonthlySpend] = useState("");
  const [currency, setCurrency] = useState<"" | "USD" | "INR">("");
  const [primaryUseCase, setPrimaryUseCase] = useState<
    "" | "Coding" | "Writing" | "Data" | "Research" | "Mixed"
  >("");
  const [teamSize, setTeamSize] = useState("");
  const [seats, setSeats] = useState("");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  function toggleTool(tool: ToolName) {
    const alreadySelected = selectedTools.includes(tool);

    if (alreadySelected) {
      setSelectedTools(selectedTools.filter((item) => item !== tool));

      const updatedPlans = { ...selectedPlans };
      delete updatedPlans[tool];
      setSelectedPlans(updatedPlans);

      return;
    }

    setSelectedTools([...selectedTools, tool]);
  }

  function choosePlan(tool: ToolName, plan: string) {
    setSelectedPlans({
      ...selectedPlans,
      [tool]: plan,
    });
  }

 async function startAudit() {
  if (!canFinish) {
    return;
  }

  const inputData = {
    selectedTools,
    selectedPlans,
    monthlySpend: Number(monthlySpend),
    currency: currency as Currency,
    primaryUseCase: primaryUseCase as PrimaryUseCase,
    teamSize: Number(teamSize),
    seats: Number(seats),
  };

  const result = runAudit(inputData);

  const { error } = await supabase.from("audits").insert({
    input_json: inputData,
    result_json: result,
    currency: result.currency,
    total_monthly_savings: result.totalMonthlySavings,
    total_annual_savings: result.totalAnnualSavings,
  });

  if (error) {
    console.error("Failed to save audit:", error);
    alert("Audit was calculated, but saving failed. Please try again.");
    return;
  }

  localStorage.setItem("credora-audit-result", JSON.stringify(result));

  router.push("/dashboard");
}
  const canGoToDetails =
    selectedTools.length > 0 &&
    selectedTools.every((tool) => Boolean(selectedPlans[tool]));

  const canFinish =
    monthlySpend.trim() !== "" &&
    currency.trim() !== "" &&
    primaryUseCase.trim() !== "" &&
    teamSize.trim() !== "" &&
    seats.trim() !== "";

  return (
    <main className="min-h-screen w-screen overflow-hidden bg-white">
      <section className="grid min-h-screen w-screen grid-cols-2 bg-white">
        <div className="flex min-h-screen flex-col bg-white px-10 py-8">
          <h1 className="text-2xl font-bold text-[#594FB8]">CREDORA</h1>

          <div className="flex flex-1 items-center justify-center">
            <h2 className="text-[56px] font-black leading-[1.05] text-black">
              Cut <span className="text-[#594FB8]">Your</span>
              <br />
              AI <span className="text-[#594FB8]">Spend</span>
            </h2>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#594FB8] px-8">
          <div className="w-[570px] overflow-hidden">
            <div
  className="flex w-[1140px] transition-transform duration-700 ease-in-out"
  style={{ transform: `translateX(-${step * 570}px)` }}
>
              <div className="flex h-[530px] w-[570px] shrink-0 items-center justify-center px-4">
                <div className="flex h-full w-full max-w-[520px] flex-col rounded-[28px] bg-white px-7 py-5 text-black">
                  <div className="text-center">
                    <h3 className="text-lg font-black tracking-wide">
                      Which AI Tool You Use ?
                    </h3>
                    <p className="text-xs font-medium">
                      You can choose multiple at a time
                    </p>
                  </div>

                  <div className="mt-7">
                    <p className="mb-3 text-sm font-bold">AI type:</p>

                    <div className="flex flex-wrap gap-2">
                      {tools.map((tool) => {
                        const isSelected = selectedTools.includes(tool);

                        return (
                          <button
                            key={tool}
                            type="button"
                            onClick={() => toggleTool(tool)}
                            className={`rounded-full px-4 py-1.5 text-xs font-bold transition hover:scale-105 ${
                              isSelected
                                ? "bg-black text-white"
                                : "bg-[#594FB8] text-white"
                            }`}
                          >
                            {tool}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-7 max-h-[230px] overflow-y-auto pr-1">
                    <p className="mb-3 text-sm font-bold">Plan:</p>

                    {selectedTools.length === 0 ? (
                      <p className="text-sm font-semibold text-gray-400">
                        Choose at least one AI tool first
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {selectedTools.map((tool) => (
                          <div key={tool}>
                            <p className="mb-2 text-xs font-black">{tool}</p>

                            <div className="flex flex-wrap gap-2">
                              {plansByTool[tool].map((plan) => {
                                const isSelected =
                                  selectedPlans[tool] === plan;

                                return (
                                  <button
                                    key={plan}
                                    type="button"
                                    onClick={() => choosePlan(tool, plan)}
                                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition hover:scale-105 ${
                                      isSelected
                                        ? "bg-black text-white"
                                        : "bg-[#594FB8] text-white"
                                    }`}
                                  >
                                    {plan}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex justify-center">
                    <button
                      type="button"
                      disabled={!canGoToDetails}
                      onClick={() => setStep(1)}
                      className="w-[180px] rounded-full bg-[#594FB8] py-2 text-xl font-black text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      NEXT
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex h-[660px] w-[570px] shrink-0 items-center justify-center px-4">
                <div className="flex h-full w-full max-w-[520px] flex-col rounded-[28px] bg-white px-12 py-8 text-black">
                  <div className="text-center">
                    <h3 className="text-2xl font-black tracking-wide">
                      Make your first AI Audit
                    </h3>
                  </div>

                  <div className="mt-12 space-y-8">
                    <div>
                      <label className="mb-3 block text-lg font-bold">
                        Monthly Spend:
                      </label>

                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={monthlySpend}
                          onChange={(event) =>
                            setMonthlySpend(
                              onlyPositiveDigits(event.target.value)
                            )
                          }
                          placeholder="Enter Amount"
                          className="h-10 w-[190px] rounded-full bg-[#594FB8] px-5 text-sm font-bold text-white outline-none placeholder:text-white"
                        />

                        <div className="flex gap-2">
                          {currencies.map((item) => {
                            const isSelected = currency === item;

                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setCurrency(item)}
                                className={`h-10 rounded-full px-4 text-xs font-bold transition hover:scale-105 ${
                                  isSelected
                                    ? "bg-black text-white"
                                    : "bg-[#594FB8] text-white"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-lg font-bold">
                        Primary use case:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {useCases.map((useCase) => {
                          const isSelected = primaryUseCase === useCase;

                          return (
                            <button
                              key={useCase}
                              type="button"
                              onClick={() => setPrimaryUseCase(useCase)}
                              className={`rounded-full px-4 py-1.5 text-xs font-bold transition hover:scale-105 ${
                                isSelected
                                  ? "bg-black text-white"
                                  : "bg-[#594FB8] text-white"
                              }`}
                            >
                              {useCase}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-lg font-bold">
                        Team Size:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={teamSize}
                        onChange={(event) =>
                          setTeamSize(onlyPositiveDigits(event.target.value))
                        }
                        placeholder="Enter Amount"
                        className="h-10 w-[190px] rounded-full bg-[#594FB8] px-5 text-sm font-bold text-white outline-none placeholder:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-lg font-bold">
                        Seats:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={seats}
                        onChange={(event) =>
                          setSeats(onlyPositiveDigits(event.target.value))
                        }
                        placeholder="Enter Amount"
                        className="h-10 w-[190px] rounded-full bg-[#594FB8] px-5 text-sm font-bold text-white outline-none placeholder:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex justify-center">
                    <button
                      type="button"
                      disabled={!canFinish}
                      onClick={startAudit}
                      className="w-[220px] rounded-full bg-[#594FB8] py-2 text-2xl font-black text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      START AUDIT
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex h-[660px] w-[570px] shrink-0 items-center justify-center px-4">
                <div className="flex h-full w-full max-w-[520px] flex-col rounded-[28px] bg-white px-10 py-8 text-black">
                  <div className="text-center">
                    <h3 className="text-2xl font-black tracking-wide">
                      Audit Engine Result
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      This data will power the dashboard UI next.
                    </p>
                  </div>

                  <div className="mt-8 rounded-[24px] bg-[#594FB8] p-6 text-center text-white">
                    <p className="text-sm font-bold">Total Monthly Savings</p>
                    <p className="mt-3 text-5xl font-black">
                      {auditResult?.currencySymbol}
                      {auditResult?.totalMonthlySavings ?? 0}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-[20px] bg-gray-100 p-5">
                      <p className="text-xs font-bold text-gray-500">
                        Annual Savings
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {auditResult?.currencySymbol}
                        {auditResult?.totalAnnualSavings ?? 0}
                      </p>
                    </div>

                    <div className="rounded-[20px] bg-gray-100 p-5">
                      <p className="text-xs font-bold text-gray-500">
                        Savings Score
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {auditResult?.savingsScore ?? 0}/100
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[20px] bg-gray-100 p-5">
                    <p className="text-xs font-bold text-gray-500">
                      Overspend Status
                    </p>
                    <p className="mt-2 text-xl font-black">
                      {auditResult?.overspendStatus ?? "Not audited yet"}
                    </p>
                  </div>

                  <div className="mt-5 max-h-[170px] overflow-y-auto rounded-[20px] bg-gray-100 p-5">
                    <p className="text-xs font-bold text-gray-500">
                      Recommendations
                    </p>

                    <div className="mt-3 space-y-3">
                      {auditResult?.recommendations.map((item) => (
                        <div key={item.tool}>
                          <p className="text-sm font-black">
                            {item.tool}: {item.action}
                          </p>
                          <p className="text-xs font-semibold text-gray-600">
                            Save {auditResult.currencySymbol}{item.monthlySavings}/mo
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mt-auto text-center text-xs font-semibold text-gray-500">
                    Dashboard design comes next.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}