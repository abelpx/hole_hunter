/**
 * Modal 组件
 * 模态框组件，支持确认/取消操作
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

// Modal Props
export interface ModalProps {
  visible: boolean;
  title?: string;
  width?: number;
  onClose?: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  showFooter?: boolean;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  width = 520,
  onClose,
  onConfirm,
  confirmText = '确定',
  cancelText = '取消',
  showFooter = true,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmCalledRef = useRef(false);

  // ESC 关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible && !confirmCalledRef.current) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [visible, onClose]);

  // 焦点管理
  useEffect(() => {
    if (visible && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      firstElement?.focus();
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (confirmCalledRef.current) return;
    confirmCalledRef.current = true;

    try {
      await onConfirm?.();
    } finally {
      confirmCalledRef.current = false;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !confirmCalledRef.current) {
      onClose?.();
    }
  };

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{ width }}
              className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                  <button
                    onClick={() => !confirmCalledRef.current && onClose?.()}
                    className="text-slate-400 hover:text-slate-300 transition-colors p-1 hover:bg-slate-700 rounded"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className={clsx('px-6 py-4', title ? 'max-h-[60vh] overflow-y-auto' : '')}>
                {children}
              </div>

              {/* Footer */}
              {showFooter && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800/50">
                  <button
                    onClick={() => !confirmCalledRef.current && onClose?.()}
                    disabled={confirmCalledRef.current}
                    className={clsx(
                      'px-4 py-2 rounded-md font-medium transition-colors',
                      'border border-slate-600 text-slate-300',
                      'hover:bg-slate-700 hover:border-slate-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {cancelText}
                  </button>
                  {onConfirm && (
                    <button
                      onClick={handleConfirm}
                      disabled={confirmCalledRef.current}
                      className={clsx(
                        'px-4 py-2 rounded-md font-medium transition-colors',
                        'bg-sky-500 text-white border border-sky-500',
                        'hover:bg-sky-600 hover:border-sky-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {confirmText}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
