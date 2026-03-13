import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Annonce } from '../types';
import { ArrowRight, Search, Tag, Users, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const [featuredAnnonces, setFeaturedAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnonces = async () => {
      try {
        const q = query(collection(db, 'annonces'), orderBy('createdAt', 'desc'), limit(4));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annonce));
        setFeaturedAnnonces(data);
      } catch (error) {
        console.error("Error fetching annonces:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnonces();
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden rounded-3xl bg-stone-900 text-white">
        <img 
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1920" 
          alt="Marketplace" 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="relative z-10 text-center max-w-3xl px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            Vendez, Achetez, <span className="text-emerald-400">Discutez</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-stone-300 mb-8"
          >
            La plateforme communautaire pour trouver des services, des biens et rejoindre des groupes de passionnés.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to="/annonces" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-2 shadow-lg">
              Voir les annonces <ArrowRight size={20} />
            </Link>
            <Link to="/groups" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-bold text-lg transition-all">
              Rejoindre un groupe
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          { icon: <Tag className="text-emerald-600" size={32} />, title: "Annonces Gratuites", desc: "Publiez vos offres de services ou vos objets à vendre en quelques secondes." },
          { icon: <MessageCircle className="text-emerald-600" size={32} />, title: "Messagerie Directe", desc: "Discutez en temps réel avec les vendeurs et les acheteurs en toute sécurité." },
          { icon: <Users className="text-emerald-600" size={32} />, title: "Groupes Thématiques", desc: "Créez ou rejoignez des espaces de discussion pour partager vos passions." }
        ].map((feature, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-stone-600 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Featured Annonces */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Dernières Annonces</h2>
          <Link to="/annonces" className="text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
            Tout voir <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-stone-200 animate-pulse h-80 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredAnnonces.map(annonce => (
              <Link key={annonce.id} to={`/annonces/${annonce.id}`} className="group bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <img 
                    src={annonce.photos[0] || "https://picsum.photos/seed/market/400/300"} 
                    alt={annonce.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                      {annonce.category.split(' - ')[0]}
                    </span>
                    <span className="text-lg font-bold text-stone-900">{annonce.price}€</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">{annonce.title}</h3>
                  <p className="text-stone-500 text-sm flex items-center gap-1">
                    <Search size={14} /> {annonce.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
