import { track } from '@vercel/analytics/react';
import { trackAnalyzeClick, trackAnalyzeComplete, trackShare } from '@/lib/analytics';

vi.mock('@vercel/analytics/react', () => ({
  track: vi.fn(),
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackAnalyzeClick', () => {
    it('should track analyze_click event', () => {
      trackAnalyzeClick();
      expect(vi.mocked(track)).toHaveBeenCalledWith('analyze_click');
    });
  });

  describe('trackAnalyzeComplete', () => {
    it('should track analyze_complete event with count', () => {
      trackAnalyzeComplete(3);
      expect(vi.mocked(track)).toHaveBeenCalledWith('analyze_complete', { result_count: 3 });
    });

    it('should track analyze_complete event with count 1', () => {
      trackAnalyzeComplete(1);
      expect(vi.mocked(track)).toHaveBeenCalledWith('analyze_complete', { result_count: 1 });
    });
  });

  describe('trackShare', () => {
    it('should track share event with method', () => {
      trackShare('native_file');
      expect(vi.mocked(track)).toHaveBeenCalledWith('share', { method: 'native_file' });
    });

    it('should track share event with native_url method', () => {
      trackShare('native_url');
      expect(vi.mocked(track)).toHaveBeenCalledWith('share', { method: 'native_url' });
    });

    it('should track share event with download method', () => {
      trackShare('download');
      expect(vi.mocked(track)).toHaveBeenCalledWith('share', { method: 'download' });
    });
  });
});
