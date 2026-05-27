"use client";

import { useEffect, useState } from "react";
import type { AuditResult } from "@/lib/auditEngine";

function formatMoney(result: AuditResult, value: number) {
  return `${result.currencySymbol}${value.toLocaleString("en-US")}`;
}

export default function DashboardPage() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    const savedResult = localStorage.getItem("credora-audit-result");

    if (savedResult) {
      setAuditResult(JSON.parse(savedResult));
    }
  }, []);

  if (!auditResult) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <p className="text-2xl font-bold">No audit result found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-8 py-6 text-black">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#594FB8]">Credora Audit</h1>

        <button className="rounded-md bg-[#594FB8] px-5 py-2 font-bold text-white">
          Download Report
        </button>
      </header>

      <section className="mb-6 rounded-xl border border-gray-200 bg-[#594FB8] p-8 text-white">
        <p className="text-sm font-bold uppercase">Estimated Savings</p>

        <div className="mt-4 flex flex-wrap items-end gap-8">
          <h2 className="text-6xl font-black">
            {formatMoney(auditResult, auditResult.totalMonthlySavings)}
            <span className="text-2xl">/mo</span>
          </h2>

          <p className="text-2xl font-bold">
            {formatMoney(auditResult, auditResult.totalAnnualSavings)}/year
          </p>
        </div>

        <p className="mt-4 text-lg font-semibold">
          Status: {auditResult.overspendStatus}
        </p>

        <p className="mt-2 text-lg font-semibold">
          Savings score: {auditResult.savingsScore}/100
        </p>
      </section>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold">Current Spend</h3>
          <p className="mt-3 text-4xl font-black">
            {formatMoney(auditResult, auditResult.currentMonthlySpend)}
            <span className="text-lg">/mo</span>
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold">Optimized Spend</h3>
          <p className="mt-3 text-4xl font-black text-[#594FB8]">
            {formatMoney(auditResult, auditResult.optimizedMonthlySpend)}
            <span className="text-lg">/mo</span>
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-6">
        <h3 className="text-2xl font-bold">Recommendations</h3>

        <div className="mt-5 space-y-4">
          {auditResult.recommendations.map((item) => (
            <div
              key={item.tool}
              className="rounded-lg border border-gray-200 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold">
                    {item.tool}: {item.action}
                  </h4>

                  <p className="mt-2 text-sm text-gray-600">{item.reason}</p>
                </div>

                <p className="text-xl font-black text-[#594FB8]">
                  Save {formatMoney(auditResult, item.monthlySavings)}/mo
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}