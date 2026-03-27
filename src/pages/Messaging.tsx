import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { chatService } from '../services/chatService';
import { Message, ChatSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Search, MoreVertical, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const Messaging = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuthStore();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(searchParams.get('chat'));
  const [newMessage, setNewMessage] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = chatService.subscribeToUserChats(user.id, setChats);
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeChatId) return;
    setHasMore(true);
    const unsubscribe = chatService.subscribeToMessages(activeChatId, (msgs) => {
      setMessages(msgs);
      if (msgs.length < 50) setHasMore(false);
    });
    return () => unsubscribe();
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleLoadMore = async () => {
    if (!activeChatId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const olderMessages = await chatService.getMessages(activeChatId, 50, messages.length);
      if (olderMessages.length < 50) setHasMore(false);
      setMessages(prev => [...olderMessages, ...prev]);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    const chatTitle = searchParams.get('title');

    await chatService.sendMessage(activeChatId, {
      text: newMessage,
      senderId: user.id,
      senderName: profile?.displayName || 'Anonymous',
      senderPhoto: profile?.photoURL || undefined,
      chatId: activeChatId
    }, chatTitle ? { title: chatTitle } : undefined);
    setNewMessage('');
  };

  const getChatName = (chat: ChatSession) => {
    if (chat.title) return chat.title;
    if (chat.isGroup) return 'Chat de Groupe';
    const otherId = chat.participants.find(p => p !== user?.id);
    return otherId ? `Utilisateur ${otherId.slice(0, 5)}` : 'Chat';
  };

  const getActiveChatName = () => {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat) return getChatName(activeChat);
    
    const titleParam = searchParams.get('title');
    if (titleParam) return titleParam;

    if (activeChatId?.includes('_')) {
      const otherId = activeChatId.split('_').find(p => p !== user?.id);
      return otherId ? `Utilisateur ${otherId.slice(0, 5)}` : 'Chat';
    }
    return 'Chat de Groupe';
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-white/5 dark:bg-zinc-900">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-200 dark:border-white/5">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher des messages..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-10 pr-4 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
            />
          </div>
        </div>
        <div className="overflow-y-auto">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                setSearchParams({ chat: chat.id });
              }}
              className={cn(
                "flex w-full items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5",
                activeChatId === chat.id && "bg-zinc-50 dark:bg-white/5"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <User className="h-6 w-6 text-zinc-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-white">{getChatName(chat)}</span>
                  <span className="text-[10px] text-zinc-500">
                    {chat.updatedAt && format(new Date(chat.updatedAt), 'HH:mm')}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                  {chat.lastMessage?.text || 'Aucun message pour le moment'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col bg-zinc-50/50 dark:bg-black/20">
        {activeChatId ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <User className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white">{getActiveChatName()}</div>
                  <div className="text-[10px] text-emerald-500">En ligne</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-zinc-400">
                <button className="hover:text-zinc-900 dark:hover:text-white"><MoreVertical className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {hasMore && (
                <div className="flex justify-center pb-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="text-xs font-medium text-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                  >
                    {loadingMore ? 'Chargement...' : 'Charger les messages plus anciens'}
                  </button>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    msg.senderId === user?.id ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                      msg.senderId === user?.id
                        ? "bg-emerald-500 text-black rounded-tr-none"
                        : "bg-zinc-200 text-zinc-900 rounded-tl-none dark:bg-zinc-800 dark:text-white"
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez un message..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm text-zinc-900 focus:outline-none dark:text-white"
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-black transition-transform hover:scale-105 active:scale-95"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-900">
              <MessageCircle className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">Vos Messages</h3>
            <p className="mt-2 text-zinc-500">Sélectionnez une conversation pour commencer à discuter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
