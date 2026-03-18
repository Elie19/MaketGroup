export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  location?: string;
  role: UserRole;
  createdAt: string;
}

export interface AdListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  images: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  status: 'active' | 'sold' | 'deleted';
  favoritesCount: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  chatId: string;
  createdAt: string;
  attachments?: string[];
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  adminId: string;
  members: string[];
  createdAt: string;
  photoURL?: string;
}

export interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
  title?: string;
  isGroup?: boolean;
}
