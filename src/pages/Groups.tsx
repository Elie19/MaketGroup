import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Group, GroupMessage } from '../types';
import { Users, Plus, MessageSquare, Send, User, X, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Groups() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // New group form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    const q = query(
      collection(db, 'group_messages'),
      where('groupId', '==', selectedGroup.id),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage)));
    });
    return () => unsubscribe();
  }, [selectedGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    try {
      await addDoc(collection(db, 'groups'), {
        name,
        description,
        type,
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        image: `https://picsum.photos/seed/${name}/400/400`
      });
      setName('');
      setDescription('');
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'group_messages'), {
        groupId: selectedGroup.id,
        senderId: user.uid,
        senderName: profile?.displayName || 'Utilisateur',
        content: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden flex">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-stone-100 flex flex-col ${selectedGroup ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Groupes</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-50 animate-pulse rounded-xl"></div>)}
            </div>
          ) : groups.length > 0 ? (
            groups.map(group => (
              <button 
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors border-b border-stone-50 text-left ${selectedGroup?.id === group.id ? 'bg-emerald-50/50' : ''}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
                  <img src={group.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 truncate">{group.name}</p>
                  <p className="text-xs text-stone-500 truncate">{group.description}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-stone-400">
              <p>Aucun groupe disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedGroup ? 'hidden md:flex' : 'flex'}`}>
        {selectedGroup ? (
          <>
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedGroup(null)} className="md:hidden p-2 text-stone-400 hover:text-emerald-600">
                  <Plus size={20} className="rotate-45" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden">
                  <img src={selectedGroup.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{selectedGroup.name}</p>
                  <p className="text-xs text-stone-500">{selectedGroup.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                  {selectedGroup.type}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/50">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      {!isMe && <span className="text-[10px] font-bold text-emerald-600">{msg.senderName}</span>}
                      <span className="text-[10px] text-stone-400">
                        {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : ''}
                      </span>
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-stone-800 rounded-tl-none border border-stone-100'}`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-stone-100 flex gap-4">
              <input 
                type="text" 
                placeholder="Écrivez dans le groupe..." 
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
              <Users size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-400">Rejoignez la discussion</h3>
            <p className="max-w-xs">Sélectionnez un groupe pour voir les messages et participer.</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="text-xl font-bold">Créer un groupe</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Nom du groupe</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    placeholder="Ex: Passion Jardinage"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Description</label>
                <textarea 
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-h-[100px]"
                  placeholder="De quoi parle ce groupe ?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Type de groupe</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setType('public')}
                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${type === 'public' ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-stone-200 text-stone-500'}`}
                  >
                    Public
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('private')}
                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${type === 'private' ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-stone-200 text-stone-500'}`}
                  >
                    Privé
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                Créer le groupe
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
