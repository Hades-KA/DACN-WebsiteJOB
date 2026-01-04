// client/src/components/employer/EmployerChatFloating.jsx
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { chatService, fileService } from '../../services/api';
import { useEmployerChat } from '../../contexts/EmployerChatContext';
import { Paperclip, Send, Loader2 } from 'lucide-react';

const API_ROOT = String(import.meta.env.VITE_API_URL || 'http://localhost:5001')
  .replace(/\/$/, '')
  .replace(/\/api$/i, ''); // => http://localhost:5001

const toFileUrl = (u) => {
  if (!u) return '#';
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_ROOT}${u.startsWith('/') ? '' : '/'}${u}`;
};

const CloseIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 6l12 12M18 6l-12 12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

function fmtTime(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function EmployerChatFloating() {
  const { isOpen, application, close } = useEmployerChat();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!isOpen) {
      setConversation(null);
      setMessages([]);
      setOnline(false);
      setInput('');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!application || !token) return;

    const candidateId = application.candidate?.id || application.candidateId;
    const jobId = application.job?.id || application.jobId;

    if (!candidateId) {
      console.error('Không xác định được ứng viên để chat');
      close();
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const res = await chatService.openConversation({ candidateId, jobId });
        const convo = res.data?.data || res.data;
        if (!isMounted) return;
        setConversation(convo);

        const s = io(API_ROOT, {
          transports: ['websocket'],
          auth: { token },
        });
        socketRef.current = s;

        s.on('connect', () => {
          s.emit('conversation:join', { conversationId: convo.id });
        });

        s.on('user:status', ({ userId, online }) => {
          if (userId === convo.candidateId) setOnline(online);
        });

        s.on('message:new', ({ conversationId, message }) => {
          if (conversationId === convo.id) {
            setMessages((prev) => [...prev, message]);
          }
        });

        const msgRes = await chatService.getMessages(convo.id, { limit: 100 });
        if (!isMounted) return;
        const list = msgRes.data?.data || msgRes.data || [];
        setMessages(list);

        await chatService.markAsRead(convo.id);
        s.emit('message:read', { conversationId: convo.id });
      } catch (err) {
        console.error(err);
        close();
      }
    })();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isOpen, application, token, close]);

  useEffect(() => {
    if (bottomRef.current && isOpen) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !application) return null;

  const candidateName =
    application.candidate?.name || application.candidate?.email || 'Ứng viên';
  const headerTitle = candidateName;

  const handleSend = () => {
    if (!input.trim() || !conversation) return;
    setSending(true);
    socketRef.current?.emit(
      'message:send',
      { conversationId: conversation.id, content: input.trim() },
      (resp) => {
        if (!resp?.success)
          console.error(resp?.message || 'Gửi tin nhắn lỗi');
        setSending(false);
      }
    );
    setInput('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
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
        {
          conversationId: conversation.id,
          content: '',
          attachments: [attachment],
        },
        (resp) => {
          if (!resp?.success)
            console.error(resp?.message || 'Gửi file lỗi');
        }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70]">
      <div className="w-[360px] h-[480px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 bg-slate-800 text-white flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {headerTitle}
            </div>
            <div className="text-[11px] text-slate-200 flex items-center gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  online ? 'bg-emerald-400' : 'bg-slate-400'
                }`}
              />
              {online ? 'Đang online' : 'Ngoại tuyến'}
            </div>
          </div>
          <button
            onClick={close}
            className="p-1 text-slate-200 hover:text-white hover:bg-slate-700 rounded-full"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-slate-50/80 px-3 py-2 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <div className="mt-4 text-xs text-slate-500 text-center">
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
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-900 rounded-bl-sm border border-slate-200'
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
                          href={toFileUrl(a.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-1 block underline ${
                            mine ? 'text-blue-100' : 'text-blue-600'
                          }`}
                        >
                          {a.fileName || 'Tệp đính kèm'}
                        </a>
                      ))}
                    <div
                      className={`mt-1 text-[10px] ${
                        mine ? 'text-blue-100' : 'text-slate-400'
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

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-2 py-2 flex items-center gap-2">
          <label className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 cursor-pointer text-slate-600">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
            <input type="file" className="hidden" onChange={handleUpload} />
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
            className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !conversation}
            className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}