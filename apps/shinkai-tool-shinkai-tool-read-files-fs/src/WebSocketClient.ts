import { WebSocket } from 'ws';

export interface MessageKind<T, D> {
  type: T;
  data: D;
}

export interface CloseFrame {
  code: number;
  reason: string;
}

export type Message =
  | MessageKind<'Text', string>
  | MessageKind<'Binary', number[]>
  | MessageKind<'Ping', number[]>
  | MessageKind<'Pong', number[]>
  | MessageKind<'Close', CloseFrame | null>;

export class WebSocketClient {
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

  send(message: Message): Promise<void> {
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

  onMessage(callback: (message: Object) => void): void {
    this.ws.on('message', (data) => {
      try {
        const message: Object = JSON.parse(data.toString());
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
    // MessageKind<'Text', string>
    return {
      channel: 'actions', // Ensure 'channel' is at the top level
      action: {
        [action.toLowerCase()]: payload,
      },
    };
    // return {
    //   type: 'Text',
    //   data: JSON.stringify({
    //     channel: 'actions',
    //     action,
    //     payload
    //   })
    // };
  }

  handleMessages(): Promise<{ message: Object }> {
    return new Promise((resolve, reject) => {
      this.onMessage((message) => {
        resolve({ message });
        this.close();
      });
    });
  }
}
