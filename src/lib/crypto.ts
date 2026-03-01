// API Key 加密工具 - 使用 Web Crypto API
// 采用 AES-GCM 256 位加密

const ENCRYPTION_VERSION = 'v1';
const ITERATIONS = 100000;
const KEY_LENGTH = 256;

/**
 * 从密码派生加密密钥
 * @param password 密码（这里使用设备指纹作为密码）
 * @param salt 盐值
 * @returns CryptoKey 密钥
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 生成设备指纹作为加密密码
 * @returns 设备指纹字符串
 */
async function getDeviceFingerprint(): Promise<string> {
  // 使用简单的设备特征组合
  const features = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  // 使用 SHA-256 哈希作为指纹
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(features));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 加密 API Key
 * @param apiKey 原始 API Key
 * @returns 加密后的字符串（包含盐和 IV）
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  try {
    const fingerprint = await getDeviceFingerprint();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveKey(fingerprint, salt);
    const encoded = new TextEncoder().encode(apiKey);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encoded
    );

    // 将盐、IV 和加密数据组合在一起
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // 转换为 Base64
    const base64 = btoa(String.fromCharCode(...combined));
    
    // 添加版本前缀
    return `${ENCRYPTION_VERSION}:${base64}`;
  } catch (error) {
    console.error('加密失败:', error);
    // 降级方案：Base64 编码（不安全，但至少不是明文）
    return `fallback:${btoa(apiKey)}`;
  }
}

/**
 * 解密 API Key
 * @param encryptedKey 加密的 API Key
 * @returns 解密后的原始 API Key
 */
export async function decryptApiKey(encryptedKey: string): Promise<string> {
  try {
    if (!encryptedKey) return '';

    const [version, base64Data] = encryptedKey.split(':');

    // 处理降级方案
    if (version === 'fallback') {
      return atob(base64Data);
    }

    if (version !== ENCRYPTION_VERSION) {
      throw new Error(`不支持的加密版本：${version}`);
    }

    // 解码 Base64
    const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // 提取盐、IV 和加密数据
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // 派生密钥
    const fingerprint = await getDeviceFingerprint();
    const key = await deriveKey(fingerprint, salt);

    // 解密
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('API Key 解密失败，请重新配置');
  }
}

/**
 * 检查 API Key 是否已加密
 * @param apiKey API Key 字符串
 * @returns 是否已加密
 */
export function isApiKeyEncrypted(apiKey: string): boolean {
  if (!apiKey) return false;
  return apiKey.startsWith(`${ENCRYPTION_VERSION}:`) || apiKey.startsWith('fallback:');
}

/**
 * 脱敏 API Key 用于显示
 * @param apiKey API Key
 * @returns 脱敏后的字符串
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  
  if (isApiKeyEncrypted(apiKey)) {
    return '••••••••••••••••';
  }
  
  // 明文脱敏
  if (apiKey.length <= 8) {
    return '•'.repeat(apiKey.length);
  }
  
  return `${apiKey.slice(0, 4)}${'•'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}
