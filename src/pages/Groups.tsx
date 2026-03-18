import React, { useState, useEffect } from 'react';
import { groupService } from '../services/groupService';
import { useAuthStore } from '../store/useAuthStore';
import { ChatGroup } from '../types';
import { motion } from 'motion/react';
import { Users, Plus, Search, MessageSquare, ArrowRight } from 'lucide-react';

export const Groups = () => {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubscribe = groupService.subscribeToGroups(setGroups);
    setLoading(false);
    return () => unsubscribe();
  }, [user]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    await groupService.createGroup({
      name: newGroupName,
      description: newGroupDesc,
      category: 'Général',
      adminId: user.id
    });
    setNewGroupName('');
    setNewGroupDesc('');
    setShowCreate(false);
  };

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await groupService.joinGroup(groupId, user.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Groupes Communautaires</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Rejoignez des discussions et rencontrez des personnes partageant les mêmes intérêts.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black transition-transform hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          Créer un Groupe
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <motion.div
            key={group.id}
            layoutId={group.id}
            className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white transition-all hover:border-emerald-500/30 dark:border-white/5 dark:bg-zinc-900"
          >
            <div className="h-32 bg-gradient-to-br from-emerald-500/20 to-zinc-200 dark:to-zinc-800" />
            <div className="relative p-6">
              <div className="absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-zinc-50 shadow-xl dark:border-zinc-900 dark:bg-zinc-800">
                <Users className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{group.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                  {group.description}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Users className="h-4 w-4" />
                    {group.members.length} membres
                  </div>
                  {group.members.includes(user?.id || '') ? (
                    <button className="flex items-center gap-2 text-sm font-bold text-emerald-500">
                      Voir le Chat
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(group.id)}
                      disabled={loading}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      {loading ? 'Adhésion...' : 'Rejoindre'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-zinc-900"
          >
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Créer un Groupe</h2>
            <form onSubmit={handleCreateGroup} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nom du Groupe</label>
                <input
                  required
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</label>
                <textarea
                  rows={3}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-zinc-200 py-4 font-bold text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-500 py-4 font-bold text-black"
                >
                  Créer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
