'use client';

import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface FilePreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  downloadUrl: string;
}

export function FilePreviewDrawer({ open, onClose, fileName, downloadUrl }: FilePreviewDrawerProps) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const canPreview = ['pdf'].includes(ext);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'var(--overlay)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-50 h-full flex flex-col"
        style={{
          width: '480px',
          maxWidth: '90vw',
          background: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
          animation: 'slide-in-right 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <span
            className="text-[14px] font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {fileName}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors duration-150"
              style={{
                background: 'var(--surface-button)',
                color: 'var(--text-secondary)',
              }}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              Download
            </a>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {canPreview ? (
            <iframe
              src={downloadUrl}
              className="w-full h-full border-0"
              title={`Preview: ${fileName}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
              <p
                className="text-[14px] text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                Preview not available for .{ext} files
              </p>
              <a
                href={downloadUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
