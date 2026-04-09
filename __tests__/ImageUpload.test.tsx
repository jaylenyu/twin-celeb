import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUpload from '@/components/ImageUpload';

vi.mock('react-dropzone', () => {
  const React = require('react');
  return {
    useDropzone: vi.fn(() => ({
      getRootProps: vi.fn(() => ({ onClick: undefined })),
      getInputProps: vi.fn(() => ({ type: 'file', accept: 'image/jpeg,image/png,image/webp' })),
      isDragActive: false,
    })),
    FileRejection: class FileRejection extends Error {
      constructor() {
        super('File type not accepted');
        this.name = 'FileRejection';
      }
    },
  };
});

const mockOnImageSelect = vi.fn();
const mockOnAnalyze = vi.fn();

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(screen.getByText('JPG, PNG, WEBP')).toBeInTheDocument();
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
