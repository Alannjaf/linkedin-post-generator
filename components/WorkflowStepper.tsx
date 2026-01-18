'use client';

import { useEffect, useRef } from 'react';

interface WorkflowStepperProps {
  currentStep: 'generate' | 'edit' | 'enhance' | 'export';
  onStepClick?: (step: 'generate' | 'edit' | 'enhance' | 'export') => void;
}

const STEPS = [
  { id: 'generate' as const, label: 'Generate', icon: '✨', gradient: 'from-purple-500 to-violet-500' },
  { id: 'edit' as const, label: 'Edit', icon: '✏️', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'enhance' as const, label: 'Enhance', icon: '🚀', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'export' as const, label: 'Export', icon: '📤', gradient: 'from-orange-500 to-amber-500' },
];

export default function WorkflowStepper({ currentStep, onStepClick }: WorkflowStepperProps) {
  const stepRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleStepClick = (step: 'generate' | 'edit' | 'enhance' | 'export') => {
    if (onStepClick) {
      onStepClick(step);
    } else {
      const elementId = step === 'generate' ? 'generate-section' :
        step === 'edit' ? 'edit-section' :
          step === 'enhance' ? 'enhance-section' : 'export-section';
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);

  return (
    <div className="w-full">
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center justify-between relative">
          {/* Progress Line Background */}
          <div className="absolute top-6 left-[10%] right-[10%] h-1 bg-[var(--border-default)] rounded-full -z-10">
            {/* Animated Progress Fill */}
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
              }}
            />
            {/* Glow effect on progress */}
            <div
              className="absolute top-0 h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-full blur-sm opacity-50 transition-all duration-700 ease-out"
              style={{
                width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Steps */}
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;
            const isClickable = onStepClick !== undefined || index <= currentStepIndex;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                <button
                  ref={(el) => {
                    stepRefs.current[step.id] = el;
                  }}
                  type="button"
                  onClick={() => isClickable && handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    font-semibold text-lg transition-all duration-300
                    ${isActive
                      ? `bg-gradient-to-br ${step.gradient} text-white shadow-lg scale-110`
                      : isCompleted
                        ? 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'}
                    disabled:cursor-not-allowed
                  `}
                  style={{
                    boxShadow: isActive ? `0 8px 25px -5px ${step.gradient.includes('purple') ? 'rgba(139, 92, 246, 0.4)' : step.gradient.includes('blue') ? 'rgba(59, 130, 246, 0.4)' : step.gradient.includes('emerald') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(249, 115, 22, 0.4)'}` : undefined
                  }}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted && !isActive ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </button>
                <span
                  className={`
                    mt-3 text-sm font-medium text-center transition-colors duration-300
                    ${isActive ? 'text-[var(--text-primary)]' : isCompleted ? 'text-emerald-400' : 'text-[var(--text-muted)]'}
                    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                  onClick={() => isClickable && handleStepClick(step.id)}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
