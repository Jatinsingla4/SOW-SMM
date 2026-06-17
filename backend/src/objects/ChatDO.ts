export class ChatDO {
    state: DurableObjectState;
    sessions: WebSocket[] = [];

    constructor(state: DurableObjectState) {
        this.state = state;
    }

    async fetch(request: Request) {
        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        this.sessions.push(server);

        server.accept();
        server.addEventListener('message', (msg: any) => {
            // Broadcast logic for real-time AMC updates
            const data = msg.data.toString();
            this.sessions.forEach(s => {
                if (s.readyState === WebSocket.OPEN) {
                    s.send(JSON.stringify({ type: 'UPDATE', data }));
                }
            });
        });

        server.addEventListener('close', () => {
            this.sessions = this.sessions.filter(s => s !== server);
        });

        return new Response(null, { status: 101, webSocket: client });
    }
}
