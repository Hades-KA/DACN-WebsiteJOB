// client/src/pages/employer/Chat.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { chatService, fileService } from '../../services/api';
import { toast } from 'react-toastify';
import { Paperclip, Send, Loader2, Circle } from 'lucide-react';

const API_ROOT = String(import.meta.env.VITE_API_URL || 'http://localhost:5001')
  .replace(/\/$/, '')
  .replace(/\/api$/i, '');

function fmtTime(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function EmployerChat() {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const token = localStorage.getItem('token');

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, activeId]);

  // Kết nối socket
  useEffect(() => {
    if (!token) return;
    const socket = io(API_ROOT, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Chat] socket connected');
    });

    socket.on('user:status', ({ userId, online }) => {
      setOnlineMap((prev) => ({ ...prev, [userId]: online }));
    });

    socket.on('message:new', ({ conversationId, message }) => {
      setMessages((prev) =>
        conversationId === activeId ? [...prev, message] : prev
      );
    });

    socket.on('conversation:updated', (payload) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === payload.conversationId ? { ...c, ...payload } : c))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token, activeId]);

  // Load conversations
  const loadConversations = async () => {
    setLoadingConvos(true);
    try {
      const res = await chatService.getConversations({ limit: 100 });
      const list = res.data?.data || res.data || [];
      setConversations(list);

      const candidateId = searchParams.get('candidateId');
      const jobId = searchParams.get('jobId');
      if (candidateId) {
        const existing = list.find(
          (c) =>
            c.candidateId === candidateId &&
            (!jobId || c.jobId === jobId)
        );
        if (existing) {
          setActiveId(existing.id);
        } else {
          await openByParams(candidateId, jobId);
        }
      } else if (list.length && !activeId) {
        setActiveId(list[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Không tải được danh sách chat');
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openByParams = async (candidateId, jobId) => {
    try {
      const res = await chatService.openConversation({ candidateId, jobId });
      const convo = res.data?.data || res.data;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === convo.id);
        if (exists) return prev;
        return [convo, ...prev];
      });
      setActiveId(convo.id);
    } catch (e) {
      console.error(e);
      toast.error('Không mở được cuộc trò chuyện');
    }
  };

  // Load messages khi đổi activeId
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeId) return;
      setLoadingMessages(true);
      try {
        const res = await chatService.getMessages(activeId, { limit: 100 });
        const list = res.data?.data || res.data || [];
        setMessages(list);

        socketRef.current?.emit('conversation:join', { conversationId: activeId });

        await chatService.markAsRead(activeId);
        socketRef.current?.emit('message:read', { conversationId: activeId });
      } catch (e) {
        console.error(e);
        toast.error('Không tải được tin nhắn');
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeId]);

  const handleSend = async () => {
    if (!input.trim() || !activeId) return;
    setSending(true);
    try {
      socketRef.current?.emit(
        'message:send',
        { conversationId: activeId, content: input.trim() },
        (resp) => {
          if (!resp?.success) toast.error(resp?.message || 'Gửi tin nhắn lỗi');
        }
      );
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fileService.uploadFile(form);
      const data = res.data?.data || res.data;
      const attachment = {
        url: data.url || data.path || data.filePath,
        fileName: data.originalName || data.fileName || file.name,
        fileType: data.mimetype || data.fileType || file.type,
        fileSize: data.size || data.fileSize || file.size,
      };

      socketRef.current?.emit(
        'message:send',
        { conversationId: activeId, content: '', attachments: [attachment] },
        (resp) => {
          if (!resp?.success) toast.error(resp?.message || 'Gửi file lỗi');
        }
      );
    } catch (e2) {
      console.error(e2);
      toast.error('Upload file thất bại');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const renderConvoTitle = (c) => {
    const candidateName = c.candidate?.name || c.candidate?.email || 'Ứng viên';
    const jobTitle = c.job?.title || '';
    return jobTitle ? `${candidateName} • ${jobTitle}` : candidateName;
  };

  const renderAvatar = (c) => {
    const candidate = c.candidate || {};
    const name = candidate.name || candidate.email || 'U';
    const initials = String(name).slice(0, 2).toUpperCase();
    const online = onlineMap[candidate.id];

    return (
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            online ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100vh-120px)] flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="font-semibold text-slate-900">Tin nhắn</div>
          <div className="text-xs text-slate-500">
            Chat trực tiếp với ứng viên
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="p-4 text-sm text-slate-500">Đang tải...</div>
          ) : !conversations.length ? (
            <div className="p-4 text-sm text-slate-500">
              Chưa có cuộc trò chuyện nào
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 ${
                    c.id === activeId ? 'bg-slate-100' : ''
                  }`}
                >
                  {renderAvatar(c)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {renderConvoTitle(c)}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {c.lastMessage || 'Bắt đầu trò chuyện'}
                    </div>
                  </div>
                  {(c.unreadForEmployer || 0) > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-[11px] text-white font-semibold">
                      {c.unreadForEmployer}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">
                  {renderConvoTitle(selectedConversation)}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Circle
                    className={`w-2 h-2 ${
                      onlineMap[selectedConversation.candidate?.id]
                        ? 'text-emerald-500'
                        : 'text-slate-300'
                    }`}
                    fill={
                      onlineMap[selectedConversation.candidate?.id]
                        ? '#10B981'
                        : '#CBD5F5'
                    }
                  />
                  {onlineMap[selectedConversation.candidate?.id]
                    ? 'Đang online'
                    : 'Ngoại tuyến'}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingMessages ? (
                <div className="text-sm text-slate-500">Đang tải tin nhắn...</div>
              ) : !messages.length ? (
                <div className="text-sm text-slate-400 mt-4">
                  Hãy bắt đầu cuộc trò chuyện với ứng viên.
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderType === 'employer';
                  return (
                    <div
                      key={m.id}
                      className={`flex mb-1 ${
                        mine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                        }`}
                      >
                        {m.content && (
                          <div className="whitespace-pre-wrap break-words">
                            {m.content}
                          </div>
                        )}
                        {Array.isArray(m.attachments) &&
                          m.attachments.map((a, idx) => (
                            <a
                              key={idx}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`mt-1 block text-xs underline ${
                                mine ? 'text-blue-100' : 'text-blue-600'
                              }`}
                            >
                              {a.fileName || 'Tệp đính kèm'}
                            </a>
                          ))}
                        <div
                          className={`mt-1 text-[10px] ${
                            mine ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-200 px-3 py-2 flex items-center gap-2">
              <label className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 cursor-pointer text-slate-600">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            Chọn một cuộc trò chuyện bên trái để bắt đầu.
          </div>
        )}
      </div>
    </div>
  );
}