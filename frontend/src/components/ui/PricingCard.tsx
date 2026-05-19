import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Check, Zap } from "lucide-react";
import { Button } from "./Button";

export interface PricingFeature {
  name: string;
  included: boolean;
}

export interface PricingCardProps {
  name: string;
  description?: string;
  price: string | number;
  annualPrice?: string | number;
  period?: string;
  annualPeriod?: string;
  features: PricingFeature[];
  cta: string;
  onCtaClick?: () => void;
  highlighted?: boolean;
  recommended?: boolean;
  className?: string;
}

export function PricingCard({
  name,
  description,
  price,
  annualPrice,
  period = "/month",
  annualPeriod = "/year",
  features,
  cta,
  onCtaClick,
  highlighted = false,
  recommended = false,
  className,
}: PricingCardProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  const displayPrice = isAnnual && annualPrice !== undefined
    ? annualPrice
    : price;
  const displayPeriod = isAnnual ? annualPeriod : period;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white dark:bg-navy-800 transition-shadow",
        highlighted || recommended
          ? "border-brand shadow-glow dark:border-brand-400"
          : "border-navy-100 dark:border-navy-700 dark:border-navy-600",
        highlighted && "scale-[1.02]",
        className
      )}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow-sm">
            <Zap className="h-3 w-3" />
            Recommended
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-navy-700 dark:text-white">
            {name}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-navy-400 dark:text-navy-400">
              {description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight text-navy-700 dark:text-white">
              {typeof displayPrice === "number" && displayPrice === 0
                ? "Free"
                : `$${displayPrice}`}
            </span>
            {typeof displayPrice !== "number" || displayPrice !== 0 ? (
              <span className="text-sm text-navy-400 dark:text-navy-400">
                {displayPeriod}
              </span>
            ) : null}
          </div>

          {/* Period toggle */}
          {annualPrice !== undefined && (
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              className="mt-3 text-xs font-medium text-brand hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              {isAnnual
                ? "Switch to monthly"
                : `Save with annual billing →`}
            </button>
          )}
        </div>

        {/* Features */}
        <ul className="mb-8 flex-1 space-y-3">
          {features.map((feature) => (
            <li key={feature.name} className="flex items-start gap-2.5">
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  feature.included
                    ? "text-green-500 dark:text-green-400"
                    : "text-navy-300 dark:text-navy-500"
                )}
              />
              <span
                className={cn(
                  "text-sm",
                  feature.included
                    ? "text-navy-600 dark:text-navy-200"
                    : "text-navy-400 line-through dark:text-navy-400"
                )}
              >
                {feature.name}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant={highlighted || recommended ? "primary" : "secondary"}
          fullWidth
          onClick={onCtaClick}
          size="lg"
        >
          {cta}
        </Button>
      </div>
    </div>
  );
}
