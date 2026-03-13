/**
 * Tailscale Service
 * VPN and secure network connectivity management
 * Provides zero-config mesh networking for internal services
 */

// Device status types
export type DeviceStatus = 'online' | 'offline' | 'idle';

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Device information
export interface TailscaleDevice {
  id: string;
  name: string;
  hostname: string;
  addresses: string[];
  os: string;
  user: string;
  lastSeen: Date;
  status: DeviceStatus;
  isOnline: boolean;
  created: Date;
  expires?: Date;
  keyExpiry?: Date;
  tags?: string[];
  authorized: boolean;
  blocksIncomingConnections: boolean;
  enabledRoutes?: string[];
  advertisedRoutes?: string[];
}

// Network ACL rule
export interface ACLRule {
  id: string;
  action: 'accept' | 'deny';
  users: string[];
  ports: string[];
  destinations: string[];
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
}

// ACL configuration
export interface ACLConfig {
  acls: ACLRule[];
  groups: Record<string, string[]>;
  tagOwners: Record<string, string[]>;
  hosts: Record<string, string>;
  autoApprovers?: {
    routes?: Record<string, string[]>;
    exitNode?: string[];
  };
  ssh?: {
    action: 'accept' | 'check';
    users: string[];
    destinations: string[];
    checkPeriod?: string;
  }[];
}

// DNS configuration
export interface DNSConfig {
  magicDNS: boolean;
  nameservers: string[];
  searchDomains: string[];
  extraRecords: {
    name: string;
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
    value: string;
  }[];
}

// Exit node configuration
export interface ExitNode {
  id: string;
  name: string;
  country?: string;
  city?: string;
  isActive: boolean;
  allowedIPs?: string[];
}

// Network statistics
export interface NetworkStats {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  lastHandshake?: Date;
  latency?: number;
}

// Subnet router
export interface SubnetRouter {
  deviceId: string;
  deviceName: string;
  routes: string[];
  approved: boolean;
  enabled: boolean;
}

// Auth key for device registration
export interface AuthKey {
  id: string;
  key: string;
  created: Date;
  expires: Date;
  reusable: boolean;
  ephemeral: boolean;
  preauthorized: boolean;
  tags?: string[];
  description?: string;
}

// Tailnet information
export interface TailnetInfo {
  name: string;
  magicDNSSuffix: string;
  magicDNSEnabled: boolean;
  created: Date;
  deviceCount: number;
  userCount: number;
}

// Service advertisement
export interface ServiceAdvertisement {
  id: string;
  name: string;
  proto: 'tcp' | 'udp';
  port: number;
  deviceId: string;
  deviceName: string;
  description?: string;
}

/**
 * Tailscale Service Class
 * Manages VPN connectivity and network configuration
 */
class TailscaleService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/tailscale';
  }

  // ========== Status & Connection ==========

  /**
   * Get current connection status
   */
  async getStatus(): Promise<{
    status: ConnectionStatus;
    self: TailscaleDevice | null;
    tailnet: TailnetInfo | null;
    exitNode: ExitNode | null;
    stats: NetworkStats;
  }> {
    const response = await fetch(`${this.baseUrl}/status`);
    return response.json();
  }

  /**
   * Connect to Tailscale network
   */
  async connect(options?: {
    authKey?: string;
    hostname?: string;
    acceptRoutes?: boolean;
    advertiseRoutes?: string[];
    exitNode?: string;
    shields?: boolean;
  }): Promise<{ success: boolean; device?: TailscaleDevice }> {
    const response = await fetch(`${this.baseUrl}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  /**
   * Disconnect from Tailscale network
   */
  async disconnect(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/disconnect`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Get login URL for authentication
   */
  async getLoginUrl(): Promise<{ url: string }> {
    const response = await fetch(`${this.baseUrl}/login-url`);
    return response.json();
  }

  // ========== Device Management ==========

  /**
   * List all devices in the tailnet
   */
  async listDevices(options?: {
    includeOffline?: boolean;
    tags?: string[];
  }): Promise<TailscaleDevice[]> {
    const params = new URLSearchParams();
    if (options?.includeOffline) params.append('includeOffline', 'true');
    if (options?.tags) options.tags.forEach(t => params.append('tag', t));
    const response = await fetch(`${this.baseUrl}/devices?${params}`);
    return response.json();
  }

  /**
   * Get a specific device
   */
  async getDevice(id: string): Promise<TailscaleDevice> {
    const response = await fetch(`${this.baseUrl}/devices/${id}`);
    return response.json();
  }

  /**
   * Authorize a device
   */
  async authorizeDevice(id: string): Promise<TailscaleDevice> {
    const response = await fetch(`${this.baseUrl}/devices/${id}/authorize`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Remove a device from the tailnet
   */
  async removeDevice(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/devices/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update device tags
   */
  async updateDeviceTags(id: string, tags: string[]): Promise<TailscaleDevice> {
    const response = await fetch(`${this.baseUrl}/devices/${id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return response.json();
  }

  /**
   * Set device routes
   */
  async setDeviceRoutes(id: string, routes: string[]): Promise<TailscaleDevice> {
    const response = await fetch(`${this.baseUrl}/devices/${id}/routes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    });
    return response.json();
  }

  // ========== Exit Nodes ==========

  /**
   * List available exit nodes
   */
  async listExitNodes(): Promise<ExitNode[]> {
    const response = await fetch(`${this.baseUrl}/exit-nodes`);
    return response.json();
  }

  /**
   * Set exit node
   */
  async setExitNode(nodeId: string | null): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/exit-node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId }),
    });
    return response.json();
  }

  /**
   * Allow this device to be an exit node
   */
  async advertiseExitNode(advertise: boolean): Promise<TailscaleDevice> {
    const response = await fetch(`${this.baseUrl}/advertise-exit-node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advertise }),
    });
    return response.json();
  }

  // ========== Subnet Routers ==========

  /**
   * List subnet routers
   */
  async listSubnetRouters(): Promise<SubnetRouter[]> {
    const response = await fetch(`${this.baseUrl}/subnet-routers`);
    return response.json();
  }

  /**
   * Approve subnet routes
   */
  async approveSubnetRoutes(deviceId: string, routes: string[]): Promise<SubnetRouter> {
    const response = await fetch(`${this.baseUrl}/subnet-routers/${deviceId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    });
    return response.json();
  }

  // ========== DNS ==========

  /**
   * Get DNS configuration
   */
  async getDNSConfig(): Promise<DNSConfig> {
    const response = await fetch(`${this.baseUrl}/dns`);
    return response.json();
  }

  /**
   * Update DNS configuration
   */
  async updateDNSConfig(config: Partial<DNSConfig>): Promise<DNSConfig> {
    const response = await fetch(`${this.baseUrl}/dns`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  }

  /**
   * Add a DNS record
   */
  async addDNSRecord(record: { name: string; type: string; value: string }): Promise<DNSConfig> {
    const response = await fetch(`${this.baseUrl}/dns/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return response.json();
  }

  /**
   * Remove a DNS record
   */
  async removeDNSRecord(name: string): Promise<DNSConfig> {
    const response = await fetch(`${this.baseUrl}/dns/records/${name}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  // ========== ACLs ==========

  /**
   * Get ACL configuration
   */
  async getACLConfig(): Promise<ACLConfig> {
    const response = await fetch(`${this.baseUrl}/acl`);
    return response.json();
  }

  /**
   * Update ACL configuration
   */
  async updateACLConfig(config: ACLConfig): Promise<ACLConfig> {
    const response = await fetch(`${this.baseUrl}/acl`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  }

  /**
   * Validate ACL configuration
   */
  async validateACL(config: ACLConfig): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await fetch(`${this.baseUrl}/acl/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  }

  // ========== Auth Keys ==========

  /**
   * List auth keys
   */
  async listAuthKeys(): Promise<AuthKey[]> {
    const response = await fetch(`${this.baseUrl}/auth-keys`);
    return response.json();
  }

  /**
   * Create an auth key
   */
  async createAuthKey(options: {
    reusable?: boolean;
    ephemeral?: boolean;
    preauthorized?: boolean;
    expirySeconds?: number;
    tags?: string[];
    description?: string;
  }): Promise<AuthKey> {
    const response = await fetch(`${this.baseUrl}/auth-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  /**
   * Revoke an auth key
   */
  async revokeAuthKey(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/auth-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Service Discovery ==========

  /**
   * List advertised services
   */
  async listServices(): Promise<ServiceAdvertisement[]> {
    const response = await fetch(`${this.baseUrl}/services`);
    return response.json();
  }

  /**
   * Advertise a service
   */
  async advertiseService(service: {
    name: string;
    proto: 'tcp' | 'udp';
    port: number;
    description?: string;
  }): Promise<ServiceAdvertisement> {
    const response = await fetch(`${this.baseUrl}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    return response.json();
  }

  /**
   * Remove a service advertisement
   */
  async removeService(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/services/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Statistics ==========

  /**
   * Get network statistics
   */
  async getStats(): Promise<{
    deviceStats: Record<string, NetworkStats>;
    totalBytesReceived: number;
    totalBytesSent: number;
    connections: number;
  }> {
    const response = await fetch(`${this.baseUrl}/stats`);
    return response.json();
  }

  /**
   * Get connection quality to a device
   */
  async ping(deviceId: string): Promise<{
    success: boolean;
    latencyMs: number;
    loss: number;
  }> {
    const response = await fetch(`${this.baseUrl}/ping/${deviceId}`, {
      method: 'POST',
    });
    return response.json();
  }
}

// Export singleton instance
export const tailscaleService = new TailscaleService();
