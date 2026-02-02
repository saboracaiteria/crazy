import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
    @type("number") rot: number = 0;
    @type("number") hp: number = 100;
    @type("number") kills: number = 0;
    @type("string") anim: string = "Idle";
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("number") level: number = 1;
}
