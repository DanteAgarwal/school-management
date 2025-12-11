class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.listeners = [];
    this.reconnectDelay = 1000;
    this.maxDelay = 30000;
  }

  connect(token) {
    if (this.ws) this.disconnect();
    const url = `${this.url}?token=${token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => { this.reconnectDelay = 1000; console.log('WS open'); };
    this.ws.onmessage = e => {
      try { const data = JSON.parse(e.data); this.listeners.forEach(cb => cb(data)); }
      catch { }
    };
    this.ws.onclose = () => {
      console.log("WS closed, reconnecting in", this.reconnectDelay);
      setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
        this.connect(token);
      }, this.reconnectDelay);
    };
    this.ws.onerror = () => this.ws.close();
  }

  subscribe(cb) { this.listeners.push(cb); return () => { this.listeners = this.listeners.filter(x => x !== cb) } }
  send(obj) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj)); }
  disconnect() { try { this.ws.close(); } catch { } this.ws = null; }
}
export default WebSocketManager; 