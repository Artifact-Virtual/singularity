import { describe, it, expect } from 'vitest';
import { generateResetToken, getResetTokenExpiry } from '../../src/utils/token';

describe('Token Utils', () => {
  describe('generateResetToken', () => {
    it('should generate a reset token', () => {
      const token = generateResetToken();
      
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
      expect(typeof token).toBe('string');
    });

    it('should generate unique tokens', () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('getResetTokenExpiry', () => {
    it('should return a date 1 hour in the future', () => {
      const now = new Date();
      const expiry = getResetTokenExpiry();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
      expect(Math.abs(expiry.getTime() - oneHourFromNow.getTime())).toBeLessThan(1000);
    });
  });
});
