/**
 * Socket Manager - Singleton accessor for the Socket.io server instance.
 * Avoids circular imports by decoupling the io instance from index.ts.
 * @module socket/socketManager
 */

import { Server } from 'socket.io'

let _io: Server | null = null

/**
 * Store the io instance once it is created in index.ts.
 * Call this exactly once at startup.
 */
export function setIO(ioInstance: Server): void {
  _io = ioInstance
}

/**
 * Retrieve the io instance for emitting events from services.
 * Returns null if called before setIO (e.g. during unit tests).
 */
export function getIO(): Server | null {
  return _io
}
