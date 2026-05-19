const SENSITIVE_FINANCIAL_KEYS = new Set([
  'path',
  'data_path',
  'commondata_path',
  'account_name',
  'account name',
  'balance',
  'equity',
  'margin',
  'margin_free',
  'profit',
  'credit'
]);

export const maskForLocalView = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskForLocalView(item));
  }

  const maskedObj = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // We allow login/login_masked in local view
    if (SENSITIVE_FINANCIAL_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_FINANCIAL_OR_PATH]';
    } else {
      maskedObj[key] = maskForLocalView(value);
    }
  }

  return maskedObj;
};

export const maskForSubmission = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskForSubmission(item));
  }

  const maskedObj = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // login_masked is safe, but raw login must be masked for submission
    if (lowerKey === 'login_masked') {
      maskedObj[key] = value;
    } else if (lowerKey === 'login') {
      maskedObj[key] = '[MASKED_LOGIN]';
    } else if (SENSITIVE_FINANCIAL_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_FINANCIAL_OR_PATH]';
    } else {
      maskedObj[key] = maskForSubmission(value);
    }
  }

  return maskedObj;
};
