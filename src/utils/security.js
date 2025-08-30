class SecurityManager {
  static validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message format');
    }

    const { text } = message;
    
    // Basic validation
    if (!text || typeof text !== 'string') {
      throw new Error('Message text is required and must be a string');
    }

    // Length validation
    if (text.length > 500) {
      throw new Error('Message too long');
    }

    // Basic content filtering
    if (this.containsHarmfulContent(text)) {
      throw new Error('Message contains inappropriate content');
    }

    return {
      ...message,
      text: this.sanitizeText(text)
    };
  }

  static sanitizeText(text) {
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove basic HTML characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .substring(0, 500); // Enforce length limit
  }

  static containsHarmfulContent(text) {
    const harmfulPatterns = [
      /script\s*:/i,
      /javascript\s*:/i,
      /<script/i,
      /eval\s*\(/i,
      /document\s*\./i
    ];

    return harmfulPatterns.some(pattern => pattern.test(text));
  }

  static validateCompanyId(companyId) {
    if (!companyId || typeof companyId !== 'string') {
      return 'vanguard';
    }

    // Only allow alphanumeric characters and hyphens
    const sanitized = companyId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    return sanitized.substring(0, 50);
  }
}

module.exports = SecurityManager;
