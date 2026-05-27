const SENSITIVE_ACCOUNT_KEYS = new Set([
  'account',
  'account_id',
  'server',
  'broker',
  'company',
  'name',
  'account_name',
  'account name',
  'currency',
  'currency_base',
  'currency_profit',
  'currency_margin'
]);

const SENSITIVE_FINANCIAL_KEYS = new Set([
  'balance',
  'equity',
  'margin',
  'margin_free',
  'free_margin',
  'margin_level',
  'profit',
  'total_profit',
  'positions_profit',
  'pnl',
  'swap',
  'swap_long',
  'swap_short',
  'commission',
  'commission_blocked',
  'credit',
  'margin_initial',
  'margin_maintenance',
  'margin_hedged'
]);

const SENSITIVE_PATH_KEYS = new Set([
  'path', 'data_path', 'commondata_path',
  'log_path', 'logpath', 'file_path', 'filepath',
  'local_path', 'localpath', 'output_path', 'outputpath',
  'source_path', 'sourcepath', 'directory', 'dir',
  'folder', 'root', 'cwd', 'terminal_path', 'mt5_path',
  'log_dir', 'log_directory', 'previous_file', 'new_file',
  'current_file', 'active_file', 'active_log_file',
  'source_file_path', 'base_dir'
]);

const SENSITIVE_USER_KEYS = new Set([
  'magic',
  'comment'
]);

const PATH_SUBSTRINGS = [
  'C:\\', 'C:/', '\\Users\\', '/Users/',
  'Documents\\', 'Documents/', 'AppData\\', 'AppData/',
  'SynkMushroom\\logs', 'SynkMushroom/logs',
  '/home/', '/mnt/', '/var/', '/tmp/'
];

const containsPathSubstring = (str) => {
  if (typeof str !== 'string') return false;
  // Use simple substring search
  for (const sub of PATH_SUBSTRINGS) {
    if (str.includes(sub)) return true;
  }
  return false;
};

const SENSITIVE_LOCAL_KEYS = new Set([
  'path',
  'data_path',
  'commondata_path',
  'account_name',
  'account name'
]);

const DISPLAY_BROKER_KEYS = new Set([
  'display_broker',
  'display_broker_before',
  'display_broker_after'
]);

const maskDisplayBrokerAccountNumber = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/(\b(?:Acc|Account|Login)\s*:\s*)[^|,;\s]+/gi, '$1[MASKED_ACCOUNT]');
};

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
    
    // In local view, we DO NOT mask financials (balance, equity, etc).
    // We only mask paths and account names to be safe, though local view can technically show paths.
    if (SENSITIVE_LOCAL_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_LOCAL_PATH]';
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
    } else if (DISPLAY_BROKER_KEYS.has(lowerKey)) {
      maskedObj[key] = maskDisplayBrokerAccountNumber(value);
    } else if (lowerKey === 'login' || SENSITIVE_ACCOUNT_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_ACCOUNT]';
    } else if (SENSITIVE_FINANCIAL_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_FINANCIAL]';
    } else if (SENSITIVE_PATH_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_LOCAL_PATH]';
    } else if (SENSITIVE_USER_KEYS.has(lowerKey)) {
      maskedObj[key] = '[MASKED_COMMENT]';
    } else if (typeof value === 'string' && containsPathSubstring(value)) {
      maskedObj[key] = '[MASKED_LOCAL_PATH]';
    } else {
      maskedObj[key] = maskForSubmission(value);
    }
  }

  return maskedObj;
};
