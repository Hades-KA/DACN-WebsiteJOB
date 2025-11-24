// client/src/contexts/EmployerChatContext.jsx
import React, { createContext, useContext, useState } from 'react';

const EmployerChatContext = createContext(null);

/**
 * Provider quản lý state popup chat:
 * - isOpen: đang mở hay đóng
 * - application: ứng viên + job đang chat
 */
export const EmployerChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [application, setApplication] = useState(null);

  const openWithApplication = (app) => {
    setApplication(app);
    setIsOpen(true);
  };

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  return (
    <EmployerChatContext.Provider
      value={{ isOpen, application, openWithApplication, toggle, close }}
    >
      {children}
    </EmployerChatContext.Provider>
  );
};

export const useEmployerChat = () => {
  const ctx = useContext(EmployerChatContext);
  if (!ctx) {
    throw new Error('useEmployerChat must be used within EmployerChatProvider');
  }
  return ctx;
};