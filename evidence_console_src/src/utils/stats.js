export const calculateStats = (numbers) => {
  if (!numbers || numbers.length === 0) {
    return { median: 'n/a', p95: 'n/a', max: 'n/a', count: 0 };
  }
  
  const sorted = [...numbers].filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  const count = sorted.length;
  
  if (count === 0) {
    return { median: 'n/a', p95: 'n/a', max: 'n/a', count: 0 };
  }

  const max = sorted[count - 1];
  
  let median;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  const p95Index = Math.max(0, Math.ceil(count * 0.95) - 1);
  const p95 = sorted[p95Index];

  return {
    median: Number(median.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    max: Number(max.toFixed(2)),
    count
  };
};
