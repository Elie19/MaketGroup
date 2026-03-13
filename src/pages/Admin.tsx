import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Annonce, UserProfile, Group } from '../types';
import { Trash2, Shield, User, Package, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Admin() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'annonces' | 'users' | 'groups'>('annonces');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [annSnap, userSnap, groupSnap] = await Promise.all([
          getDocs(query(collection(db, 'annonces'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc')))
        ]);

        setAnnonces(annSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Annonce)));
        setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as UserProfile)));
        setGroups(groupSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Group)));
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteAnnonce = async (id: string) => {
    if (!window.confirm("Supprimer cette annonce définitivement ?")) return;
    await deleteDoc(doc(db, 'annonces', id));
    setAnnonces(annonces.filter(a => a.id !== id));
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm("Supprimer ce groupe définitivement ?")) return;
    await deleteDoc(doc(db, 'groups', id));
    setGroups(groups.filter(g => g.id !== id));
  };

  const toggleAdmin = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Changer le rôle de ${user.displayName} en ${newRole} ?`)) return;
    await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole as any } : u));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-emerald-600 p-3 rounded-2xl text-white">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Panneau d'Administration</h1>
          <p className="text-stone-500">Modération et gestion de la plateforme MarketGroup.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Package size={24} /></div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Annonces</p>
            <p className="text-2xl font-bold">{annonces.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><User size={24} /></div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Utilisateurs</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><Users size={24} /></div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Groupes</p>
            <p className="text-2xl font-bold">{groups.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl w-fit">
        {(['annonces', 'users', 'groups'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-stone-400 animate-pulse">Chargement des données...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'annonces' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-widest">
                    <th className="p-6 font-bold">Annonce</th>
                    <th className="p-6 font-bold">Vendeur</th>
                    <th className="p-6 font-bold">Prix</th>
                    <th className="p-6 font-bold">Date</th>
                    <th className="p-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {annonces.map(a => (
                    <tr key={a.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <img src={a.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-bold text-stone-900">{a.title}</p>
                            <p className="text-xs text-stone-400">{a.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-stone-600 text-sm">{a.userName}</td>
                      <td className="p-6 font-bold text-emerald-600">{a.price}€</td>
                      <td className="p-6 text-stone-400 text-xs">{format(a.createdAt.toDate(), 'dd/MM/yy')}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => handleDeleteAnnonce(a.id)} className="p-2 text-stone-300 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'users' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-widest">
                    <th className="p-6 font-bold">Utilisateur</th>
                    <th className="p-6 font-bold">Email</th>
                    <th className="p-6 font-bold">Rôle</th>
                    <th className="p-6 font-bold">Inscription</th>
                    <th className="p-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {users.map(u => (
                    <tr key={u.uid} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400"><User size={16} /></div>
                          )}
                          <p className="font-bold text-stone-900">{u.displayName}</p>
                        </div>
                      </td>
                      <td className="p-6 text-stone-600 text-sm">{u.email}</td>
                      <td className="p-6">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6 text-stone-400 text-xs">{format(u.createdAt.toDate(), 'dd/MM/yy')}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => toggleAdmin(u)} className="p-2 text-stone-300 hover:text-emerald-600 transition-colors" title="Toggle Admin">
                          <CheckCircle size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'groups' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-widest">
                    <th className="p-6 font-bold">Groupe</th>
                    <th className="p-6 font-bold">Type</th>
                    <th className="p-6 font-bold">Création</th>
                    <th className="p-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {groups.map(g => (
                    <tr key={g.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <img src={g.image} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-bold text-stone-900">{g.name}</p>
                            <p className="text-xs text-stone-400 line-clamp-1">{g.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${g.type === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {g.type}
                        </span>
                      </td>
                      <td className="p-6 text-stone-400 text-xs">{format(g.createdAt.toDate(), 'dd/MM/yy')}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => handleDeleteGroup(g.id)} className="p-2 text-stone-300 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
