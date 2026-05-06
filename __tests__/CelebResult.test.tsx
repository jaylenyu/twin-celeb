import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CelebResult from '@/components/CelebResult';
import { Celebrity } from '@/types';

vi.mock('@/lib/analytics', () => ({
  trackShare: vi.fn(),
}));

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

global.fetch = vi.fn();

const mockCelebrities: Celebrity[] = [
  {
    name: '김철수',
    nameEn: 'Cheolsu Kim',
    similarity: 85,
    nationality: 'Korean',
    occupation: '배우',
    reasons: ['차분한 분위기', '선한 눈빛'],
  },
  {
    name: 'John Doe',
    nameEn: 'John Doe',
    similarity: 75,
    nationality: 'Hollywood',
    occupation: '배우',
    reasons: ['자연스러운 웃음', '밝은 인상'],
  },
];

describe('CelebResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ share_count: 10 }),
    });
  });

  describe('rendering', () => {
    it('should render header title', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('My Celebrity Match')).toBeInTheDocument();
    });

    it('should render all celebrity names', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render similarity percentages', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should render nationality labels', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText(/한국/)).toBeInTheDocument();
      expect(screen.getByText(/할리우드/)).toBeInTheDocument();
    });

    it('should render occupation and nameEn', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('Cheolsu Kim · 배우')).toBeInTheDocument();
      expect(screen.getByText('John Doe · 배우')).toBeInTheDocument();
    });

    it('should render reasons as tags', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('차분한 분위기')).toBeInTheDocument();
      expect(screen.getByText('선한 눈빛')).toBeInTheDocument();
      expect(screen.getByText('자연스러운 웃음')).toBeInTheDocument();
      expect(screen.getByText('밝은 인상')).toBeInTheDocument();
    });

    it('should render user photo when previewDataUrl is provided', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      const img = screen.getByAltText('내 사진');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,test');
    });

    it('should not render photo when previewDataUrl is null', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl={null}
          isLoading={false}
        />
      );
      expect(screen.queryByAltText('내 사진')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should render loading dots when isLoading is true', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={true}
        />
      );
      const dots = screen.getAllByText('');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should not render share button when isLoading is true', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={true}
        />
      );
      expect(screen.queryByText('친구에게 공유하기')).not.toBeInTheDocument();
    });
  });

  describe('share functionality', () => {
    it('should render share button when not loading', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('친구에게 공유하기')).toBeInTheDocument();
    });

    it('should render site URL', () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('https://twin-celeb.com')).toBeInTheDocument();
    });

    it('should render share count when available', async () => {
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('10명')).toBeInTheDocument();
      });
      expect(screen.getByText(/지금까지/)).toBeInTheDocument();
      expect(screen.getByText(/이 결과를 공유했어요/)).toBeInTheDocument();
    });
  });

  describe('empty celebrities', () => {
    it('should render without crashing when celebrities array is empty', () => {
      render(
        <CelebResult
          celebrities={[]}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      expect(screen.getByText('My Celebrity Match')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message on share failure', async () => {
      global.navigator.share = vi.fn().mockRejectedValue(new Error('Share failed'));
      
      render(
        <CelebResult
          celebrities={mockCelebrities}
          previewDataUrl="data:image/png;base64,test"
          isLoading={false}
        />
      );
      
      const shareButton = screen.getByText('친구에게 공유하기');
      
      await waitFor(() => {
        expect(screen.queryByText(/공유에 실패했습니다/)).not.toBeInTheDocument();
      });
    });
  });
});
