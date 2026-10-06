import { create } from "zustand";
import { Client, IFrame, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getAccessToken } from "../lib/api";

export interface NotificationItem {
  type: string;
  title: string;
  message: string;
  relatedId: number | null;
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  items: NotificationItem[];
  connected: boolean;
  unread: number;
  connect: (userId: number) => void;
  disconnect: () => void;
  markRead: (idx: number) => void;
  markAllRead: () => void;
  clear: () => void;
}

let stompClient: Client | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  connected: false,
  unread: 0,

  connect: (userId: number) => {
    if (stompClient?.active) return;

    const token = getAccessToken();
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL?.replace("/api", "") || "https://jumpstart-production.up.railway.app"}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: () => {},
      onConnect: () => {
        set({ connected: true });
        client.subscribe(`/topic/notifications/${userId}`, (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            set((s) => ({
              items: [{ ...data, read: false }, ...s.items],
              unread: s.unread + 1,
            }));
          } catch { /* ignore malformed */ }
        });
      },
      onDisconnect: () => set({ connected: false }),
      onStompError: () => set({ connected: false }),
    });

    stompClient = client;
    client.activate();
  },

  disconnect: () => {
    stompClient?.deactivate();
    stompClient = null;
    set({ connected: false });
  },

  markRead: (idx: number) => {
    set((s) => {
      const items = [...s.items];
      if (!items[idx]?.read) {
        items[idx] = { ...items[idx], read: true };
      }
      return { items, unread: Math.max(0, s.unread - 1) };
    });
  },

  markAllRead: () => {
    set((s) => ({
      items: s.items.map((i) => ({ ...i, read: true })),
      unread: 0,
    }));
  },

  clear: () => set({ items: [], unread: 0 }),
}));
