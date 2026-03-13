import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Message, UserProfile } from '../types';
import { Send, User, Search, ArrowLeft, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // This is a simplified conversation fetcher
    // In a real app, you'd have a 'conversations' collection
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const q2 = query(
      collection(db, 'messages'),
      where('senderId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      processConversations(msgs);
    });

    const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      processConversations(msgs);
    });

    const processConversations = async (msgs: Message[]) => {
      const convMap = new Map();
      for (const m of msgs) {
        const otherId = m.senderId === user.uid ? m.receiverId : m.senderId;
        if (!convMap.has(otherId)) {
          const otherSnap = await getDoc(doc(db, 'users', otherId));
          const otherProfile = otherSnap.exists() ? otherSnap.data() as UserProfile : null;
          convMap.set(otherId, {
            otherId,
            otherProfile,
            lastMessage: m.content,
            timestamp: m.timestamp
          });
        }
      }
      setConversations(Array.from(convMap.values()));
      setLoading(false);
    };

    return () => {
      unsubscribe();
      unsubscribe2();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedConv || !user) return;

    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [user.uid, selectedConv.otherId]),
      where('receiverId', 'in', [user.uid, selectedConv.otherId]),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      // Filter manually because 'in' query might return messages between other people if IDs overlap (unlikely but safe)
      const filtered = msgs.filter(m => 
        (m.senderId === user.uid && m.receiverId === selectedConv.otherId) ||
        (m.senderId === selectedConv.otherId && m.receiverId === user.uid)
      );
      setMessages(filtered);
    });

    return () => unsubscribe();
  }, [selectedConv, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConv || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: selectedConv.otherId,
        content: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden flex">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-stone-100 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-stone-100">
          <h2 className="text-2xl font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2 bg-stone-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-50 animate-pulse rounded-xl"></div>)}
            </div>
          ) : conversations.length > 0 ? (
            conversations.map(conv => (
              <button 
                key={conv.otherId}
                onClick={() => setSelectedConv(conv)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors border-b border-stone-50 text-left ${selectedConv?.otherId === conv.otherId ? 'bg-emerald-50/50' : ''}`}
              >
                {conv.otherProfile?.photoURL ? (
                  <img src={conv.otherProfile.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                    <User size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-bold text-stone-900 truncate">{conv.otherProfile?.displayName || 'Utilisateur'}</p>
                    <p className="text-[10px] text-stone-400">{conv.timestamp ? format(conv.timestamp.toDate(), 'HH:mm') : ''}</p>
                  </div>
                  <p className="text-sm text-stone-500 truncate">{conv.lastMessage}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-stone-400">
              <p>Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-stone-100 flex items-center gap-4 bg-white">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-2 text-stone-400 hover:text-emerald-600">
                <ArrowLeft size={20} />
              </button>
              {selectedConv.otherProfile?.photoURL ? (
                <img src={selectedConv.otherProfile.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <User size={20} />
                </div>
              )}
              <div>
                <p className="font-bold text-stone-900">{selectedConv.otherProfile?.displayName || 'Utilisateur'}</p>
                <p className="text-xs text-emerald-600 font-medium">En ligne</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-200' : 'text-stone-400'}`}>
                        {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-stone-100 flex gap-4">
              <input 
                type="text" 
                placeholder="Écrivez votre message..." 
                className="flex-1 bg-stone-50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none border-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit" 
                className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-all shadow-md"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-300 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-4">
              <MessageCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-400">Sélectionnez une conversation</h3>
            <p className="max-w-xs">Choisissez un utilisateur pour commencer à discuter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
