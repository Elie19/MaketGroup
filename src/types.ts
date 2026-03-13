export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  location?: string;
  role: UserRole;
  createdAt: any; // Timestamp
}

export interface Annonce {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  photos: string[];
  location: string;
  userId: string;
  userName: string;
  createdAt: any; // Timestamp
  status: 'active' | 'sold' | 'deleted';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any; // Timestamp
  annonceId?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  image?: string;
  type: 'public' | 'private';
  createdAt: any; // Timestamp
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any; // Timestamp
}
