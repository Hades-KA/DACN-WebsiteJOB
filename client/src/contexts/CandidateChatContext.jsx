// client/src/contexts/CandidateChatContext.jsx
import React, { createContext, useContext, useState } from 'react';

const CandidateChatContext = createContext(null);

/**
 * Context quản lý popup chat cho ỨNG VIÊN:
 * - isOpen: popup đang mở hay đóng
 * - unreadCount: tổng số tin nhắn chưa đọc
 * - setUnreadCount: cho phép component con cập nhật badge
 * - toggle / open / close: điều khiển popup
 */
export const CandidateChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <CandidateChatContext.Provider
      value={{ isOpen, open, close, toggle, unreadCount, setUnreadCount }}
    >
      {children}
    </CandidateChatContext.Provider>
  );
};

export const useCandidateChat = () => {
  const ctx = useContext(CandidateChatContext);
  if (!ctx) {
    throw new Error('useCandidateChat must be used within CandidateChatProvider');
  }
  return ctx;
};