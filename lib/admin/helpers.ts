// Helper function to get date range
interface TicketMetrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  highPriority: number;
  urgentPriority: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionRate: number;
}

interface TicketVolumeData {
  day: string;
  created: number;
  resolved: number;
}

interface ResponseTimeData {
  hour: string;
  avg: number;
  label: string;
}

interface PriorityDistribution {
  name: string;
  value: number;
  color: string;
}

export function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  
  let startDate: Date;
  
  switch (range) {
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
      
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
  }
  
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

export function calculateMetrics(tickets: any[]): TicketMetrics {
  const total = tickets.length;
  
  const open = tickets.filter(t => t.status === "OPEN").length;
  const inProgress = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const resolved = tickets.filter(t => t.status === "RESOLVED").length;
  const closed = tickets.filter(t => t.status === "CLOSED").length;
  
  const highPriority = tickets.filter(t => t.priority === "HIGH").length;
  const urgentPriority = tickets.filter(t => t.priority === "URGENT").length;
  
  // Calculate average response time (minutes to first admin response)
  let totalResponseTime = 0;
  let ticketsWithResponse = 0;
  
  tickets.forEach(ticket => {
    const firstAdminResponse = ticket.responses?.find((r: any) => r.isAdmin === true);
    if (firstAdminResponse) {
      const responseTime = (new Date(firstAdminResponse.createdAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60);
      totalResponseTime += responseTime;
      ticketsWithResponse++;
    }
  });
  
  const avgResponseTime = ticketsWithResponse > 0 ? Math.round(totalResponseTime / ticketsWithResponse) : 0;
  
  // Calculate average resolution time (hours)
  let totalResolutionTime = 0;
  let ticketsResolved = 0;
  
  tickets.forEach(ticket => {
    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      const resolvedAt = ticket.resolvedAt || ticket.updatedAt;
      const resolutionTime = (new Date(resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
      totalResolutionTime += resolutionTime;
      ticketsResolved++;
    }
  });
  
  const avgResolutionTime = ticketsResolved > 0 ? Math.round(totalResolutionTime / ticketsResolved) : 0;
  
  // Calculate satisfaction rate (mock for now - would come from feedback surveys)
  const satisfactionRate = 92; // Placeholder - implement actual feedback collection
  
  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    highPriority,
    urgentPriority,
    avgResponseTime,
    avgResolutionTime,
    satisfactionRate,
  };
}

export function calculateTicketVolume(tickets: any[], startDate: Date, endDate: Date): TicketVolumeData[] {
  const volumeMap = new Map<string, { created: number; resolved: number }>();
  
  // Initialize all days in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayKey = currentDate.toISOString().split("T")[0];
    const dayName = currentDate.toLocaleDateString("en-US", { weekday: "short" });
    volumeMap.set(dayKey, { created: 0, resolved: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Count created tickets
  tickets.forEach(ticket => {
    const createdDay = new Date(ticket.createdAt).toISOString().split("T")[0];
    if (volumeMap.has(createdDay)) {
      const data = volumeMap.get(createdDay)!;
      data.created++;
      volumeMap.set(createdDay, data);
    }
  });
  
  // Count resolved tickets
  tickets.forEach(ticket => {
    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      const resolvedAt = ticket.resolvedAt || ticket.updatedAt;
      const resolvedDay = new Date(resolvedAt).toISOString().split("T")[0];
      if (volumeMap.has(resolvedDay)) {
        const data = volumeMap.get(resolvedDay)!;
        data.resolved++;
        volumeMap.set(resolvedDay, data);
      }
    }
  });
  
  // Convert to array and add day names
  const result: TicketVolumeData[] = [];
  volumeMap.forEach((value, key) => {
    const date = new Date(key);
    result.push({
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      created: value.created,
      resolved: value.resolved,
    });
  });
  
  return result;
}

export function calculateResponseTimes(tickets: any[]): ResponseTimeData[] {
  const responseTimesByHour = new Map<number, { total: number; count: number }>();
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    responseTimesByHour.set(i, { total: 0, count: 0 });
  }
  
  tickets.forEach(ticket => {
    const firstAdminResponse = ticket.responses?.find((r: any) => r.isAdmin === true);
    if (firstAdminResponse) {
      const responseHour = new Date(firstAdminResponse.createdAt).getHours();
      const responseTime = (new Date(firstAdminResponse.createdAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60);
      
      const data = responseTimesByHour.get(responseHour)!;
      data.total += responseTime;
      data.count++;
      responseTimesByHour.set(responseHour, data);
    }
  });
  
  const result: ResponseTimeData[] = [];
  responseTimesByHour.forEach((value, hour) => {
    const avg = value.count > 0 ? Math.round(value.total / value.count) : 0;
    result.push({
      hour: hour.toString().padStart(2, "0"),
      avg,
      label: `${hour.toString().padStart(2, "0")}:00`,
    });
  });
  
  return result;
}

export function calculatePriorityDistribution(tickets: any[]): PriorityDistribution[] {
  const priorityCounts = new Map<string, number>();
  
  tickets.forEach(ticket => {
    const priority = ticket.priority;
    priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
  });
  
  const priorityColors: Record<string, string> = {
    URGENT: "#ef4444",
    HIGH: "#f59e0b",
    MEDIUM: "#3b82f6",
    LOW: "#10b981",
  };
  
  const result: PriorityDistribution[] = [];
  priorityCounts.forEach((value, key) => {
    result.push({
      name: key.charAt(0) + key.slice(1).toLowerCase(),
      value,
      color: priorityColors[key] || "#8b5cf6",
    });
  });
  
  return result;
}

export function generateInsights(metrics: TicketMetrics, tickets: any[]): any {
  const insights = [];
  
  // Response time insights
  if (metrics.avgResponseTime > 60) {
    insights.push({
      type: "warning",
      title: "Slow Response Time",
      message: `Average response time is ${metrics.avgResponseTime} minutes. Consider adding more support staff.`,
      metric: metrics.avgResponseTime,
    });
  } else if (metrics.avgResponseTime < 15) {
    insights.push({
      type: "success",
      title: "Great Response Time",
      message: `Average response time of ${metrics.avgResponseTime} minutes is excellent!`,
      metric: metrics.avgResponseTime,
    });
  }
  
  // Priority insights
  if (metrics.highPriority + metrics.urgentPriority > 5) {
    insights.push({
      type: "alert",
      title: "High Priority Tickets",
      message: `${metrics.highPriority + metrics.urgentPriority} high/urgent priority tickets need attention.`,
      metric: metrics.highPriority + metrics.urgentPriority,
    });
  }
  
  // Resolution insights
  if (metrics.avgResolutionTime > 48) {
    insights.push({
      type: "warning",
      title: "Long Resolution Time",
      message: `Average resolution time is ${metrics.avgResolutionTime} hours. Review processes to improve.`,
      metric: metrics.avgResolutionTime,
    });
  }
  
  // Volume insights
  const resolvedRate = metrics.total > 0 ? (metrics.resolved / metrics.total) * 100 : 0;
  if (resolvedRate < 70) {
    insights.push({
      type: "warning",
      title: "Low Resolution Rate",
      message: `Only ${Math.round(resolvedRate)}% of tickets resolved. Focus on closing open tickets.`,
      metric: Math.round(resolvedRate),
    });
  }
  
  return insights;
}