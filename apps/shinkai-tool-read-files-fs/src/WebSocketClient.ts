import { WebSocket } from 'ws';

export class WebSocketClient<T = any> {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.on('open', () => {
        console.log('WebSocket connection opened');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }

  send(message: Object): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(message), (err) => {
        if (err) {
          console.error('Error sending message:', err);
          reject(err);
        } else {
          console.log('Message sent:', message);
          resolve();
        }
      });
    });
  }

  onMessage(callback: (message: T) => void): void {
    this.ws.on('message', (data) => {
      try {
        const message: T = JSON.parse(data.toString());
        console.log('Received:', message);
        callback(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }

  close(): void {
    this.ws.close();
  }

  createRequestMessage(action: string, payload: any): any {
    return {
      channel: 'actions',
      action: {
        [action.toLowerCase()]: payload,
      },
    };
  }

  handleMessages(): Promise<{ message: T }> {
    return new Promise((resolve, reject) => {
      this.onMessage((message) => {
        resolve({ message });
        this.close();
      });
    });
  }
}
