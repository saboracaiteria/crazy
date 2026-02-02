import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { BattleRoom } from "./rooms/BattleRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const gameServer = new Server();

// Registrar salas
gameServer.define("battle_room", BattleRoom);

// Monitoramento
app.use("/colyseus", monitor());

gameServer.listen(port).then(() => {
    console.log(`🚀 Colyseus Server rodando na porta ${port}`);
}).catch(err => {
    console.error("Erro ao iniciar server:", err);
});
