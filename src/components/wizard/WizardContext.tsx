"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { wizardStorageSchema } from "@/lib/schemas/wizard";
import { defaultWizardData, WIZARD_TOTAL_STEPS, type WizardData } from "./types";

type WizardState = {
  data: WizardData;
  currentStep: number;
  direction: number;
};

type WizardAction =
  | { type: "UPDATE_DATA"; payload: Partial<WizardData> }
  | { type: "GO_NEXT" }
  | { type: "GO_BACK" }
  | { type: "RESTORE"; state: WizardState };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "UPDATE_DATA":
      return { ...state, data: { ...state.data, ...action.payload } };
    case "GO_NEXT":
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, WIZARD_TOTAL_STEPS),
        direction: 1,
      };
    case "GO_BACK":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1),
        direction: -1,
      };
    case "RESTORE":
      return action.state;
    default:
      return state;
  }
}

type WizardContextType = {
  data: WizardData;
  currentStep: number;
  direction: number;
  updateData: (partial: Partial<WizardData>) => void;
  goNext: () => void;
  goBack: () => void;
};

const WizardContext = createContext<WizardContextType | null>(null);

const STORAGE_KEY = "klyro_wizard_v1";

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    data: defaultWizardData,
    currentStep: 1,
    direction: 1,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const raw = JSON.parse(saved);
        // I4: validate shape before restoring to guard against corrupted/stale state
        const validated = wizardStorageSchema.safeParse(raw);
        if (validated.success) {
          dispatch({ type: "RESTORE", state: validated.data as WizardState });
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore parse errors — default state is used
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const updateData = useCallback(
    (partial: Partial<WizardData>) =>
      dispatch({ type: "UPDATE_DATA", payload: partial }),
    []
  );
  const goNext = useCallback(() => dispatch({ type: "GO_NEXT" }), []);
  const goBack = useCallback(() => dispatch({ type: "GO_BACK" }), []);

  return (
    <WizardContext.Provider
      value={{
        data: state.data,
        currentStep: state.currentStep,
        direction: state.direction,
        updateData,
        goNext,
        goBack,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
