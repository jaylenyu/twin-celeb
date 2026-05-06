import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ImageUpload from '@/components/ImageUpload';

let capturedOnDrop: ((accepted: File[], rejected: unknown[]) => void) | null = null;

vi.mock('react-dropzone', () => {
  return {
    useDropzone: vi.fn((opts: { onDrop?: typeof capturedOnDrop }) => {
      capturedOnDrop = opts.onDrop ?? null;
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({ type: 'file', accept: 'image/jpeg,image/png,image/webp' }),
        isDragActive: false,
      };
    }),
    FileRejection: class FileRejection extends Error {
      constructor() {
        super('File type not accepted');
        this.name = 'FileRejection';
      }
    },
  };
});

vi.mock('@/lib/imageCompression', () => ({
  compressImage: vi.fn(async (f: File) => f),
}));

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const mockOnImageSelect = vi.fn();
const mockOnAnalyze = vi.fn();

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDrop = null;
    setMatchMedia(false);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  describe('rendering', () => {
    it('should render desktop UI with upload instruction when no preview', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl={null}
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText('드래그하거나 클릭해서 업로드')).toBeInTheDocument();
    });

    it('should render desktop UI with change instruction when preview exists', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText('클릭하거나 드래그해서 변경')).toBeInTheDocument();
    });

    it('should render "닮은 연예인 찾기" button when preview exists', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText('닮은 연예인 찾기')).toBeInTheDocument();
    });

    it('should render "분석 중..." when loading', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={true}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText('분석 중...')).toBeInTheDocument();
    });

    it('should disable analyze button when loading', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={true}
          onAnalyze={mockOnAnalyze}
        />
      );
      const button = screen.getByText('분석 중...').closest('button');
      expect(button).toBeDisabled();
    });

    it('should render "JPG, PNG, WEBP" instruction text', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl={null}
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText(/JPG.*PNG.*WEBP/)).toBeInTheDocument();
    });

    it('should render preview image when previewUrl is provided', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      const img = screen.getByAltText('업로드된 사진');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'blob:http://example.com/preview');
    });
  });

  describe('analyze button', () => {
    it('should call onAnalyze when clicked', async () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      const button = screen.getByText('닮은 연예인 찾기');
      fireEvent.click(button);
      expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
    });

    it('should not call onAnalyze when disabled', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={true}
          onAnalyze={mockOnAnalyze}
        />
      );
      const button = screen.getByText('분석 중...');
      fireEvent.click(button);
      expect(mockOnAnalyze).not.toHaveBeenCalled();
    });
  });

  describe('file selection (desktop)', () => {
    it('calls onImageSelect after a valid drop', async () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl={null}
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />,
      );
      const file = new File([new Uint8Array(8)], 'pic.jpg', { type: 'image/jpeg' });
      await act(async () => {
        capturedOnDrop?.([file], []);
      });
      await waitFor(() => expect(mockOnImageSelect).toHaveBeenCalledTimes(1));
      const [calledFile, calledUrl] = mockOnImageSelect.mock.calls[0];
      expect(calledFile).toBe(file);
      expect(calledUrl).toBe('blob:mock');
    });

    it('shows error on rejected MIME', async () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl={null}
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />,
      );
      await act(async () => {
        capturedOnDrop?.([], [{ file: new File([], 'a.gif'), errors: [] }]);
      });
      expect(screen.getByText('JPG, PNG, WEBP 형식만 지원합니다.')).toBeInTheDocument();
      expect(mockOnImageSelect).not.toHaveBeenCalled();
    });
  });

  describe('mobile UI', () => {
    beforeEach(() => setMatchMedia(true));

    it('renders the mobile select button when no preview', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl={null}
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />,
      );
      expect(screen.getByText('사진 선택')).toBeInTheDocument();
      expect(screen.getByText('사진을 선택해 주세요')).toBeInTheDocument();
    });

    it('uploads via the hidden input change event', async () => {
      const { container } = render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl={null}
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />,
      );
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([new Uint8Array(8)], 'pic.jpg', { type: 'image/jpeg' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });
      await waitFor(() => expect(mockOnImageSelect).toHaveBeenCalledTimes(1));
    });
  });

  describe('analyze button text based on state', () => {
    it('should show "분석 중..." when isLoading is true', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={true}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText('분석 중...')).toBeInTheDocument();
    });

    it('should show "닮은 연예인 찾기" when not loading', () => {
      render(
        <ImageUpload
          onImageSelect={mockOnImageSelect}
          previewUrl="blob:http://example.com/preview"
          isLoading={false}
          onAnalyze={mockOnAnalyze}
        />
      );
      expect(screen.getByText('닮은 연예인 찾기')).toBeInTheDocument();
    });
  });
});
