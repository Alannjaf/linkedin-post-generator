'use client';

import { useEffect, useRef } from 'react';

interface WorkflowStepperProps {
  currentStep: 'generate' | 'edit' | 'enhance' | 'export';
  onStepClick?: (step: 'generate' | 'edit' | 'enhance' | 'export') => void;
}

const STEPS = [
  { id: 'generate' as const, label: 'Generate', icon: '✨' },
  { id: 'edit' as const, label: 'Edit', icon: '✏️' },
  { id: 'enhance' as const, label: 'Enhance', icon: '🚀' },
  { id: 'export' as const, label: 'Export', icon: '📤' },
];

export default function WorkflowStepper({ currentStep, onStepClick }: WorkflowStepperProps) {
  const stepRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleStepClick = (step: 'generate' | 'edit' | 'enhance' | 'export') => {
    if (onStepClick) {
      onStepClick(step);
    } else {
      // Default scroll behavior
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
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
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
            <div key={step.id} className="flex flex-col items-center flex-1 relative">
              <button
                ref={(el) => {
                  stepRefs.current[step.id] = el;
                }}
                type="button"
                onClick={() => isClickable && handleStepClick(step.id)}
                disabled={!isClickable}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  font-semibold text-sm transition-all duration-200
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-110 ring-4 ring-blue-100'
                      : isCompleted
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-white text-gray-400 border-2 border-gray-300'
                  }
                  ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                aria-label={`Step ${index + 1}: ${step.label}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted && !isActive ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-lg">{step.icon}</span>
                )}
              </button>
              <label
                className={`
                  mt-2 text-xs font-medium text-center max-w-[80px]
                  ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                `}
                onClick={() => isClickable && handleStepClick(step.id)}
              >
                {step.label}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
