import { Room, Client } from "colyseus";
import { GameState, Player } from "../schema/GameState";

export class BattleRoom extends Room {
    maxClients = 20;
    state = new GameState();

    onCreate(options: any) {

        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.z = data.z;
                player.rot = data.rot;
                player.anim = data.anim;
            }
        });

        this.onMessage("shoot", (client, data) => {
            this.broadcast("onShoot", {
                playerId: client.sessionId,
                targetId: data.targetId,
                x: data.x, y: data.y, z: data.z,
                dir: data.dir
            }, { except: client });
        });

        this.onMessage("hit", (client, data) => {
            const target = this.state.players.get(data.targetId);
            if (target && target.hp > 0) {
                target.hp -= 10;
                if (target.hp <= 0) {
                    target.hp = 0;
                    const attacker = this.state.players.get(client.sessionId);
                    if (attacker) attacker.kills++;
                }
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        const player = new Player();
        player.id = client.sessionId;
        this.state.players.set(client.sessionId, player);
    }

    onLeave(client: Client, code?: number) {
        console.log(client.sessionId, "left with code", code);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log("Room disposed");
    }
}
