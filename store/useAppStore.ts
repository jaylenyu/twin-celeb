import { create } from 'zustand';
import { Celebrity } from '@/types';

interface AppState {
  selectedFile: File | null;
  previewUrl: string | null;
  previewDataUrl: string | null;
  results: Celebrity[];
  isLoading: boolean;
  error: string | null;
  stats: { analyze_count: number; share_count: number } | null;
  setSelectedFile: (file: File | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setPreviewDataUrl: (url: string | null) => void;
  setResults: (results: Celebrity[]) => void;
  addResult: (result: Celebrity) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStats: (stats: { analyze_count: number; share_count: number } | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedFile: null,
  previewUrl: null,
  previewDataUrl: null,
  results: [],
  isLoading: false,
  error: null,
  stats: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setPreviewDataUrl: (url) => set({ previewDataUrl: url }),
  setResults: (results) => set({ results }),
  addResult: (result) => set((state) => ({ results: [...state.results, result] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setStats: (stats) => set({ stats }),
  reset: () => set({
    selectedFile: null,
    previewUrl: null,
    previewDataUrl: null,
    results: [],
    isLoading: false,
    error: null,
    stats: null,
  }),
}));
