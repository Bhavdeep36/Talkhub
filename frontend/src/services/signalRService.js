import * as signalR from '@microsoft/signalr';
import { config } from '../config';

let instance = null;

class SignalRService {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.connection = null;
    this.messageCallbacks = new Set();
    this.conversationCallbacks = new Set();
    this.typingCallbacks = new Set();
    this.connectionCallbacks = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isInitialized = false;
    this.connectionPromise = null;

    instance = this;
  }

  async initialize() {
    if (this.isInitialized) return;

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(config.WEBSOCKET_ENDPOINT, {
        accessTokenFactory: () => token,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null;
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();
    this.isInitialized = true;
  }

  setupEventHandlers() {
    if (!this.connection) return;

    this.connection.onclose(error => {
      console.log('SignalR connection closed:', error);
      this.notifyConnectionCallbacks({ status: 'disconnected', error });
    });

    this.connection.onreconnecting(error => {
      console.log('SignalR reconnecting:', error);
      this.notifyConnectionCallbacks({ status: 'reconnecting', error });
    });

    this.connection.onreconnected(connectionId => {
      console.log('SignalR reconnected:', connectionId);
      this.notifyConnectionCallbacks({ status: 'connected', connectionId });
    });

    this.connection.on('ReceiveMessage', message => {
      this.notifyMessageCallbacks(message);
    });

    this.connection.on('ConversationUpdate', conversation => {
      this.notifyConversationCallbacks(conversation);
    });

    this.connection.on('UserTyping', data => {
      this.notifyTypingCallbacks(data);
    });
  }

  async start() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      this.connectionPromise = this.connection.start();
      await this.connectionPromise;
      
      console.log('SignalR connected successfully');
      this.notifyConnectionCallbacks({ 
        status: 'connected', 
        connectionId: this.connection.connectionId 
      });
      
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      this.notifyConnectionCallbacks({ status: 'error', error });
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.start();
      }
      
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  async stop() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.stop();
        console.log('SignalR connection stopped');
        this.notifyConnectionCallbacks({ status: 'disconnected' });
      } catch (error) {
        console.error('Error stopping SignalR connection:', error);
      }
    }
  }

  onReceiveMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  notifyMessageCallbacks(message) {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  onConversationUpdate(callback) {
    this.conversationCallbacks.add(callback);
    return () => this.conversationCallbacks.delete(callback);
  }

  notifyConversationCallbacks(conversation) {
    this.conversationCallbacks.forEach(callback => {
      try {
        callback(conversation);
      } catch (error) {
        console.error('Error in conversation callback:', error);
      }
    });
  }

  onUserTyping(callback) {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  notifyTypingCallbacks(data) {
    this.typingCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in typing callback:', error);
      }
    });
  }

  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  notifyConnectionCallbacks(status) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  async sendMessage(receiverId, content) {
    if (!this.isInitialized || this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection.invoke('SendMessage', receiverId, content);
      return { queued: true };
    } catch (error) {
      console.error('Error sending message through SignalR:', error);
      throw error;
    }
  }

  async sendTypingIndicator(receiverId) {
    if (!this.isInitialized || this.connection?.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('TypingNotification', receiverId, true);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  getConnectionState() {
    return this.connection?.state || 'disconnected';
  }

  isConnected() {
    return this.isInitialized && this.connection?.state === signalR.HubConnectionState.Connected;
  }

  async deleteMessage(messageId) {
    if (!this.isInitialized || this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection.invoke('DeleteMessage', messageId);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

const signalRService = new SignalRService();
Object.freeze(signalRService);
export default signalRService; 