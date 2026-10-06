// The door. A lobby picked from the menu (JOIN, or + START A NEW LOBBY) names its room: that name is honoured,
// even when the room does not exist yet (the first arrival creates it). A plain link fills the fullest open room.
import { mostFullWithSpace, nextRoomName } from "builtin/room-routing";

export async function pickRoom(ctx) {
  const asked = ctx.requestedRoomId;
  if (asked && !ctx.rejectedRooms.includes(asked)) return asked;
  return mostFullWithSpace(ctx) ?? nextRoomName(ctx.rooms, ctx.rejectedRooms);
}
