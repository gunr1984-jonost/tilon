import { EventEmitter } from "events";

// Singleton shared between the SSE stream route and the internal notify route
const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export default emitter;
