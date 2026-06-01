const { google } = require('googleapis');

class GmailService {
  constructor() {
    this.gmail = null;
  }

  setAuth(auth) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Error getting Gmail profile:', error);
      throw error;
    }
  }

  async fetchEmails(query = 'is:unread', maxResults = 5) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults,
      });

      if (!response.data.messages) return [];

      const messages = await Promise.all(
        response.data.messages.map(msg => this.getMessage(msg.id))
      );

      return messages;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  async getMessage(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const from = headers.find(h => h.name === 'From')?.value || '(unknown)';
      
      // Extract body
      let body = '';
      if (message.payload.parts) {
        const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      } else if (message.payload.body.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      }

      return {
        id: messageId,
        subject,
        from,
        body,
        snippet: message.snippet,
      };
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  async starEmail(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['STARRED'],
        },
      });
      return true;
    } catch (error) {
      console.error('Error starring email:', error);
      throw error;
    }
  }

  async createLabel(labelName) {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
      return response.data.id;
    } catch (error) {
      if (error.message.includes('Label already exists')) {
        // Label exists, fetch it
        const labels = await this.gmail.users.labels.list({ userId: 'me' });
        const label = labels.data.labels.find(l => l.name === labelName);
        return label ? label.id : null;
      }
      console.error('Error creating label:', error);
      throw error;
    }
  }

  async applyLabel(messageId, labelId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      });
      return true;
    } catch (error) {
      console.error('Error applying label:', error);
      throw error;
    }
  }

  async archiveEmail(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });
      return true;
    } catch (error) {
      console.error('Error archiving email:', error);
      throw error;
    }
  }
}

module.exports = GmailService;
