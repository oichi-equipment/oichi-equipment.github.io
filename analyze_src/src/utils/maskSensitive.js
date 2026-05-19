export const maskSensitive = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitive(item));
  }

  const maskedObj = {};
  const sensitiveKeys = new Set([
    'login',
    'account_name',
    'account name',
    'path',
    'data_path',
    'commondata_path',
    'balance',
    'equity',
    'margin',
    'margin_free',
    'credit',
    'profit'
  ]);

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // If login_masked exists, we keep it as is, but we still mask 'login'
    if (lowerKey === 'login_masked') {
      maskedObj[key] = value;
    } else if (sensitiveKeys.has(lowerKey)) {
      maskedObj[key] = '[MASKED]';
    } else {
      maskedObj[key] = maskSensitive(value);
    }
  }

  return maskedObj;
};
