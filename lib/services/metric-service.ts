export interface LoanMetric {
    txHash: string;
    profit: number;
    timestamp: number;
    status: "success" | "failed";
  }
  
  const METRICS_KEY = "flashLoanMetrics";
  let listeners: Array<() => void> = [];
  
  export function recordLoanMetric(metric: LoanMetric) {
    const metrics = getLoanMetrics();
    metrics.push(metric);
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    listeners.forEach(fn => fn());
  }
  
  export function getLoanMetrics(): LoanMetric[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(METRICS_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  export function getAggregatedMetrics() {
    const metrics = getLoanMetrics();
    const totalProfit = metrics.filter(m => m.status === "success").reduce((sum, m) => sum + m.profit, 0);
    const successfulLoans = metrics.filter(m => m.status === "success").length;
    const failedLoans = metrics.filter(m => m.status === "failed").length;
    return { totalProfit, successfulLoans, failedLoans, recent: metrics.slice(-5).reverse() };
  }

  export function subscribeToMetrics(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(l => l !== fn);
    };
  }