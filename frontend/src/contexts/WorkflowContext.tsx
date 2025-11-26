import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { WorkflowState, WorkflowStage } from '../types';

const defaultWorkflowState: WorkflowState = {
  stage: 'config',
  isGenerating: false,
  error: null,
  tokenUsage: null,
  estimatedCost: null,
  finalVideo: null,
};

interface WorkflowContextType {
  stage: WorkflowStage;
  isGenerating: boolean;
  error: string | null;
  tokenUsage: { prompt: number; completion: number } | null;
  estimatedCost: number | null;
  finalVideo: Blob | null;
  setStage: (stage: WorkflowStage) => void;
  setIsGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setTokenUsage: (usage: { prompt: number; completion: number }) => void;
  setEstimatedCost: (cost: number) => void;
  setFinalVideo: (video: Blob) => void;
  reset: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  const [state, setState] = useState<WorkflowState>(defaultWorkflowState);

  const setStage = (stage: WorkflowStage) => {
    setState((prev) => ({
      ...prev,
      stage,
    }));
  };

  const setIsGenerating = (generating: boolean) => {
    setState((prev) => ({
      ...prev,
      isGenerating: generating,
    }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  };

  const setTokenUsage = (usage: { prompt: number; completion: number }) => {
    setState((prev) => ({
      ...prev,
      tokenUsage: usage,
    }));
  };

  const setEstimatedCost = (cost: number) => {
    setState((prev) => ({
      ...prev,
      estimatedCost: cost,
    }));
  };

  const setFinalVideo = (video: Blob) => {
    setState((prev) => ({
      ...prev,
      finalVideo: video,
    }));
  };

  const reset = () => {
    setState(defaultWorkflowState);
  };

  const value = useMemo(
    () => ({
      stage: state.stage,
      isGenerating: state.isGenerating,
      error: state.error,
      tokenUsage: state.tokenUsage,
      estimatedCost: state.estimatedCost,
      finalVideo: state.finalVideo,
      setStage,
      setIsGenerating,
      setError,
      setTokenUsage,
      setEstimatedCost,
      setFinalVideo,
      reset,
    }),
    [state]
  );

  return (
    <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
