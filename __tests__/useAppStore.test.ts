import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { Celebrity } from '@/types';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedFile: null,
      previewUrl: null,
      previewDataUrl: null,
      results: [],
      isLoading: false,
      error: null,
      stats: null,
    });
  });

  describe('initial state', () => {
    it('should have null selectedFile', () => {
      expect(useAppStore.getState().selectedFile).toBeNull();
    });

    it('should have null previewUrl', () => {
      expect(useAppStore.getState().previewUrl).toBeNull();
    });

    it('should have empty results', () => {
      expect(useAppStore.getState().results).toEqual([]);
    });

    it('should have isLoading as false', () => {
      expect(useAppStore.getState().isLoading).toBe(false);
    });

    it('should have null error', () => {
      expect(useAppStore.getState().error).toBeNull();
    });
  });

  describe('setSelectedFile', () => {
    it('should set selectedFile', () => {
      const mockFile = new File([], 'test.jpg', { type: 'image/jpeg' });
      useAppStore.getState().setSelectedFile(mockFile);
      expect(useAppStore.getState().selectedFile).toBe(mockFile);
    });

    it('should set selectedFile to null', () => {
      const mockFile = new File([], 'test.jpg', { type: 'image/jpeg' });
      useAppStore.getState().setSelectedFile(mockFile);
      useAppStore.getState().setSelectedFile(null);
      expect(useAppStore.getState().selectedFile).toBeNull();
    });
  });

  describe('setPreviewUrl', () => {
    it('should set previewUrl', () => {
      useAppStore.getState().setPreviewUrl('blob:http://example.com/123');
      expect(useAppStore.getState().previewUrl).toBe('blob:http://example.com/123');
    });
  });

  describe('setPreviewDataUrl', () => {
    it('should set previewDataUrl', () => {
      useAppStore.getState().setPreviewDataUrl('data:image/png;base64,...');
      expect(useAppStore.getState().previewDataUrl).toBe('data:image/png;base64,...');
    });
  });

  describe('setResults', () => {
    it('should set results', () => {
      const mockResults: Celebrity[] = [
        { name: '테스트', nameEn: 'Test', similarity: 85, nationality: 'Korean', occupation: '배우', reasons: ['reason1', 'reason2'] },
      ];
      useAppStore.getState().setResults(mockResults);
      expect(useAppStore.getState().results).toEqual(mockResults);
    });
  });

  describe('addResult', () => {
    it('should add a single result', () => {
      const mockCeleb: Celebrity = {
        name: '테스트',
        nameEn: 'Test',
        similarity: 85,
        nationality: 'Korean',
        occupation: '배우',
        reasons: ['reason1', 'reason2'],
      };
      useAppStore.getState().addResult(mockCeleb);
      expect(useAppStore.getState().results).toHaveLength(1);
      expect(useAppStore.getState().results[0]).toEqual(mockCeleb);
    });

    it('should add multiple results sequentially', () => {
      const celeb1: Celebrity = {
        name: '테스트1',
        nameEn: 'Test1',
        similarity: 85,
        nationality: 'Korean',
        occupation: '배우',
        reasons: ['reason1', 'reason2'],
      };
      const celeb2: Celebrity = {
        name: '테스트2',
        nameEn: 'Test2',
        similarity: 75,
        nationality: 'American',
        occupation: '배우',
        reasons: ['reason1', 'reason2'],
      };
      useAppStore.getState().addResult(celeb1);
      useAppStore.getState().addResult(celeb2);
      expect(useAppStore.getState().results).toHaveLength(2);
      expect(useAppStore.getState().results[0]).toEqual(celeb1);
      expect(useAppStore.getState().results[1]).toEqual(celeb2);
    });
  });

  describe('setIsLoading', () => {
    it('should set isLoading to true', () => {
      useAppStore.getState().setIsLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);
    });

    it('should set isLoading to false', () => {
      useAppStore.getState().setIsLoading(true);
      useAppStore.getState().setIsLoading(false);
      expect(useAppStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useAppStore.getState().setError('테스트 오류');
      expect(useAppStore.getState().error).toBe('테스트 오류');
    });

    it('should clear error', () => {
      useAppStore.getState().setError('오류 발생');
      useAppStore.getState().setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });
  });

  describe('setStats', () => {
    it('should set stats', () => {
      const stats = { analyze_count: 100, share_count: 50 };
      useAppStore.getState().setStats(stats);
      expect(useAppStore.getState().stats).toEqual(stats);
    });

    it('should clear stats', () => {
      useAppStore.getState().setStats({ analyze_count: 100, share_count: 50 });
      useAppStore.getState().setStats(null);
      expect(useAppStore.getState().stats).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useAppStore.setState({
        selectedFile: new File([], 'test.jpg'),
        previewUrl: 'blob:http://example.com/123',
        previewDataUrl: 'data:image/png;base64,...',
        results: [{ name: '테스트', nameEn: 'Test', similarity: 85, nationality: 'Korean', occupation: '배우', reasons: ['reason1', 'reason2'] }],
        isLoading: true,
        error: 'some error',
        stats: { analyze_count: 100, share_count: 50 },
      });

      useAppStore.getState().reset();

      const state = useAppStore.getState();
      expect(state.selectedFile).toBeNull();
      expect(state.previewUrl).toBeNull();
      expect(state.previewDataUrl).toBeNull();
      expect(state.results).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.stats).toBeNull();
    });
  });
});
