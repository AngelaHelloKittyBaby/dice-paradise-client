import { create } from 'zustand';
import {
  createOnlineRoom,
  dismissOnlineRoom,
  getCurrentOnlineRoom,
  getWaitingRoomList,
  joinOnlineRoom,
  kickOnlineRoom,
  leaveOnlineRoom,
  recoverJoinedRoomSession,
  setOnlineRoomReady,
} from '@/modules/room/roomApi';
import type { Room, RoomListItem, RoomMember, RoomSettings } from '@/types/room';
import { usePlayerStore } from './playerStore';

interface RoomState {
  currentRoom: Room | null;
  roomList: RoomListItem[];
  isHost: boolean;
  currentPlayerId: string;
}

interface RoomActions {
  setCurrentRoom: (room: Room | null, currentPlayerId?: string) => void;
  createRoom: (name: string, settings: RoomSettings, playerName?: string) => Promise<Room>;
  joinRoom: (roomCode: string, playerName?: string) => Promise<Room>;
  fetchRoomList: () => Promise<RoomListItem[]>;
  restoreCurrentRoom: () => Promise<Room | null>;
  leaveRoom: () => Promise<void>;
  kickPlayer: (targetPlayerId: string) => Promise<Room>;
  toggleReady: () => Promise<Room | null>;
  startGame: () => boolean;
  updateRoomMembers: (members: RoomMember[]) => void;
}

type RoomStore = RoomState & RoomActions;

let restoreCurrentRoomRequest: Promise<Room | null> | null = null;

function applyCurrentRoomSession(set: (state: Partial<RoomState>) => void, room: Room, currentPlayerId: string) {
  set({
    currentRoom: room,
    isHost: Boolean(room.hostId && room.hostId === currentPlayerId),
    currentPlayerId,
  });
}

function getRoomListItem(room: Room): RoomListItem {
  return {
    id: room.id,
    name: room.name,
    hostName: room.members.find(member => member.isHost)?.name ?? '房主',
    playerCount: room.members.length,
    maxPlayers: room.settings.maxPlayers,
    isPrivate: room.settings.isPrivate,
    status: room.status,
  };
}

function ensureLoggedInPlayer() {
  const player = usePlayerStore.getState().player;

  if (!player?.id) {
    throw new Error('请先登录后再操作房间');
  }

  return player;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  // State
  currentRoom: null,
  roomList: [],
  isHost: false,
  currentPlayerId: '',

  // Actions
  setCurrentRoom: (room, currentPlayerId) => {
    if (!room) {
      set({
        currentRoom: null,
        currentPlayerId: '',
        isHost: false,
      });
      return;
    }

    const nextPlayerId = currentPlayerId ?? get().currentPlayerId;

    set({
      currentRoom: room,
      currentPlayerId: nextPlayerId,
      isHost: Boolean(room.hostId && room.hostId === nextPlayerId),
    });
  },

  createRoom: async (name, settings, playerName = '投骰大师') => {
    let newRoom: Room;
    let currentPlayerId = '';

    try {
      ensureLoggedInPlayer();
      newRoom = await createOnlineRoom({
        room_name: name,
        max_players: settings.maxPlayers,
        game_mode: 'online',
      });
      currentPlayerId = newRoom.hostId || newRoom.members.find(member => member.isHost)?.playerId || newRoom.members[0]?.playerId || '';
    } catch (error) {
      const recoveredSession = await recoverJoinedRoomSession(error, playerName);
      if (!recoveredSession) throw error;

      newRoom = recoveredSession.room;
      currentPlayerId = recoveredSession.playerId;
    }

    applyCurrentRoomSession(set, newRoom, currentPlayerId);
    set({
      roomList: [getRoomListItem(newRoom), ...get().roomList.filter(room => room.id !== newRoom.id)],
    });

    return newRoom;
  },

  joinRoom: async (roomCode, playerName = '乐乐玩家') => {
    let joinedRoom: Room;
    let currentPlayerId = '';

    try {
      ensureLoggedInPlayer();
      const joinResult = await joinOnlineRoom({
        room_code: roomCode,
      });
      joinedRoom = joinResult.room;
      currentPlayerId = joinResult.playerId;
    } catch (error) {
      const recoveredSession = await recoverJoinedRoomSession(error, playerName);
      if (!recoveredSession) throw error;

      joinedRoom = recoveredSession.room;
      currentPlayerId = recoveredSession.playerId;
    }

    applyCurrentRoomSession(set, joinedRoom, currentPlayerId);
    set({
      roomList: [getRoomListItem(joinedRoom), ...get().roomList.filter(room => room.id !== joinedRoom.id)],
    });

    return joinedRoom;
  },

  fetchRoomList: async () => {
    const roomList = await getWaitingRoomList();

    set({ roomList });

    return roomList;
  },

  restoreCurrentRoom: () => {
    if (restoreCurrentRoomRequest) return restoreCurrentRoomRequest;

    restoreCurrentRoomRequest = (async () => {
      const player = usePlayerStore.getState().player;

      if (!player) {
        set({
          currentRoom: null,
          isHost: false,
          currentPlayerId: '',
        });
        return null;
      }

      const session = await getCurrentOnlineRoom(player.id, player.name);

      if (!session) {
        set({
          currentRoom: null,
          isHost: false,
          currentPlayerId: '',
        });
        return null;
      }

      applyCurrentRoomSession(set, session.room, session.playerId);
      set({
        roomList: [getRoomListItem(session.room), ...get().roomList.filter(room => room.id !== session.room.id)],
      });

      return session.room;
    })().finally(() => {
      restoreCurrentRoomRequest = null;
    });

    return restoreCurrentRoomRequest;
  },

  leaveRoom: async () => {
    const { currentRoom, currentPlayerId } = get();

    if (!currentRoom || !currentPlayerId) return;

    const shouldDismissRoom = Boolean(currentRoom.hostId && currentRoom.hostId === currentPlayerId);

    if (shouldDismissRoom) {
      try {
        await dismissOnlineRoom(currentRoom.id);
      } catch {
        await leaveOnlineRoom({
          room_code: currentRoom.id,
          player_id: currentPlayerId,
        });
      }
    } else {
      await leaveOnlineRoom({
        room_code: currentRoom.id,
        player_id: currentPlayerId,
      });
    }

    set({
      currentRoom: null,
      isHost: false,
      currentPlayerId: '',
      roomList: shouldDismissRoom ? get().roomList.filter(room => room.id !== currentRoom.id) : get().roomList,
    });
  },

  kickPlayer: async (targetPlayerId) => {
    const { currentRoom, currentPlayerId, isHost } = get();

    if (!currentRoom || !currentPlayerId || !isHost) {
      throw new Error('Only the room host can kick players');
    }

    const updatedRoom = await kickOnlineRoom(currentRoom.id, {
      target_player_id: targetPlayerId,
    });

    applyCurrentRoomSession(set, updatedRoom, currentPlayerId);
    set({
      roomList: [getRoomListItem(updatedRoom), ...get().roomList.filter(room => room.id !== updatedRoom.id)],
    });

    return updatedRoom;
  },

  toggleReady: async () => {
    const { currentRoom, currentPlayerId, isHost } = get();
    if (!currentRoom || !currentPlayerId || isHost) return null;

    const myMember = currentRoom.members.find((m) => m.playerId === currentPlayerId);
    if (!myMember) return null;

    const updatedRoom = await setOnlineRoomReady(currentRoom.id, {
      is_ready: !myMember.isReady,
    });

    applyCurrentRoomSession(set, updatedRoom, currentPlayerId);
    set({
      roomList: [getRoomListItem(updatedRoom), ...get().roomList.filter(room => room.id !== updatedRoom.id)],
    });

    return updatedRoom;
  },

  startGame: () => {
    const { currentRoom, isHost } = get();
    if (!currentRoom || !isHost) return false;

    const allReady = currentRoom.members.every((m) => m.isHost || m.isReady);
    if (!allReady || currentRoom.members.length < 2) return false;

    set({
      currentRoom: { ...currentRoom, status: 'playing' },
    });

    return true;
  },

  updateRoomMembers: (members) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    set({
      currentRoom: { ...currentRoom, members },
    });
  },
}));
