import { track } from '@vercel/analytics/react';

export const trackAnalyzeClick = () => track('analyze_click');

export const trackAnalyzeComplete = (resultCount: number) =>
  track('analyze_complete', { result_count: resultCount });

export const trackShare = (method: 'native_file' | 'native_url' | 'download') =>
  track('share', { method });
