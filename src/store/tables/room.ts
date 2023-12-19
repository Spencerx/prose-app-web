/*
 * This file is part of prose-app-web
 *
 * Copyright 2023, Prose Foundation
 */

/**************************************************************************
 * IMPORTS
 * ************************************************************************* */

// NPM
import {
  Room as CoreRoom,
  RoomID,
  SidebarItem,
  SidebarSection
} from "@prose-im/prose-sdk-js";
import mitt from "mitt";
import { defineStore } from "pinia";

// PROJECT: BROKER
import Broker from "@/broker";

/**************************************************************************
 * INTERFACES
 * ************************************************************************* */

interface Room {
  items: {
    favorites: SidebarItem[];
    directMessages: SidebarItem[];
    channels: SidebarItem[];
    byRoomId: Map<RoomID, SidebarItem>;
  };

  byId: Map<RoomID, CoreRoom>;
}

/**************************************************************************
 * INSTANCES
 * ************************************************************************* */

const EventBus = mitt();

/**************************************************************************
 * CONSTANTS
 * ************************************************************************* */

const LOCAL_STATES = {
  loaded: false
};

/**************************************************************************
 * METHODS
 * ************************************************************************* */

const compareRooms = function (left: SidebarItem, right: SidebarItem): number {
  return left.name.localeCompare(right.name);
};

/**************************************************************************
 * TABLE
 * ************************************************************************* */

const $room = defineStore("room", {
  persist: false,

  state: (): Room => {
    return {
      items: {
        favorites: [],
        directMessages: [],
        channels: [],
        byRoomId: new Map()
      },

      byId: new Map()
    };
  },

  getters: {
    getItemFavorites: function () {
      return (): Array<SidebarItem> => {
        return this.items.favorites;
      };
    },

    getItemDirectMessages: function () {
      return (): Array<SidebarItem> => {
        return this.items.directMessages;
      };
    },

    getItemChannels: function () {
      return (): Array<SidebarItem> => {
        return this.items.channels;
      };
    },

    getRoomItem: function () {
      return (roomID: RoomID): SidebarItem | void => {
        return this.items.byRoomId.get(roomID);
      };
    },

    getRoom: function () {
      return (roomID: RoomID): CoreRoom | void => {
        return this.byId.get(roomID);
      };
    }
  },

  actions: {
    events(): ReturnType<typeof mitt> {
      // Return event bus
      return EventBus;
    },

    async load(reload = false): Promise<void> {
      // Load room list? (or reload)
      if (LOCAL_STATES.loaded !== true || reload === true) {
        LOCAL_STATES.loaded = true;

        // Initialize entries
        const favorites: Array<SidebarItem> = [],
          directMessages: Array<SidebarItem> = [],
          channels: Array<SidebarItem> = [],
          itemsByRoomId = new Map<RoomID, SidebarItem>(),
          roomsById = new Map<RoomID, CoreRoom>();

        // Load rooms
        const sidebarItems = await Broker.$room.sidebarItems();

        sidebarItems.forEach(item => {
          // Append item in its section
          switch (item.section) {
            case SidebarSection.Favorites: {
              favorites.push(item);

              break;
            }

            case SidebarSection.DirectMessage: {
              directMessages.push(item);

              break;
            }

            case SidebarSection.Channel: {
              channels.push(item);

              break;
            }
          }

          // Reference item by its identifier
          itemsByRoomId.set(item.room.id, item);
          roomsById.set(item.room.id, item.room);
        });

        // Append all rooms
        this.$patch(state => {
          // Store items
          state.items.favorites = favorites.sort(compareRooms);
          state.items.directMessages = directMessages.sort(compareRooms);
          state.items.channels = channels.sort(compareRooms);
          state.items.byRoomId = itemsByRoomId;

          // Store rooms map
          state.byId = roomsById;
        });
      }
    },

    updateRoom(roomID: RoomID, roomData: CoreRoom): CoreRoom | void {
      // Assert room
      const room = this.getRoom(roomID);

      if (room) {
        Object.assign(room, roomData);
      }

      return room;
    },

    markRoomsChanged(): void {
      EventBus.emit("rooms:changed");
    }
  }
});

/**************************************************************************
 * EXPORTS
 * ************************************************************************* */

export default $room;
