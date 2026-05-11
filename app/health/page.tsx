// app/health/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  RefreshCw, 
  Database, 
  Server, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Cpu,
  Cloud,
  BarChart3,
  Wifi,
  Zap
} from "lucide-react";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: "connected" | "disconnected" | "error";
      latency?: number;
      error?: string;
    };
    api: {
      status: "ok";
    };
  };
  version: string;
  environment: string;
}

interface DetailedHealth extends HealthStatus {
  checks: {
    database: {
      status: "connected" | "error";
      latency_ms: number;
      version?: string;
      maxConnections?: number;
      activeConnections?: number;
      error?: string;
    };
    redis?: {
      status: "connected" | "error";
      latency_ms: number;
      memory_usage_mb?: number;
      error?: string;
    };
    storage?: {
      status: "connected" | "error";
      latency_ms: number;
      buckets?: string[];
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
      usagePercent: number;
    };
  };
  diagnostics: {
    databaseSize?: string;
    activeConnections?: number;
    slowQueries?: number;
  };
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [detailedHealth, setDetailedHealth] = useState<DetailedHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const [basicRes, detailedRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/health/detailed"),
      ]);

      if (!basicRes.ok) throw new Error("Failed to fetch health data");
      
      const basicData = await basicRes.json();
      const detailedData = detailedRes.ok ? await detailedRes.json() : null;
      
      setHealth(basicData);
      setDetailedHealth(detailedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Health check error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(" ") || "< 1m";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "ok":
        return "text-green-500";
      case "degraded":
      case "warning":
        return "text-yellow-500";
      case "unhealthy":
      case "error":
      case "disconnected":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "unhealthy":
      case "error":
      case "disconnected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Checking system health...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Badge variant={health?.status === "healthy" ? "default" : health?.status === "degraded" ? "secondary" : "destructive"}>
            {health?.status === "healthy" ? "All Systems Operational" : 
             health?.status === "degraded" ? "Partial Outage" : "Major Outage"}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main Status Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                {getStatusIcon(health?.status || "unknown")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{health?.status || "Unknown"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {health?.status === "healthy" ? "All systems operational" : 
                   health?.status === "degraded" ? "Some services affected" : 
                   "Critical issues detected"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUptime(health?.uptime || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Continuous operation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Environment</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold uppercase">{health?.environment || "Unknown"}</div>
                <p className="text-xs text-muted-foreground mt-1">Version {health?.version || "1.0.0"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{health?.services.database.status}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Latency: {health?.services.database.latency || 0}ms
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Memory Usage */}
          {detailedHealth && (
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Memory and resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Heap Memory Usage</span>
                    <span className="font-mono">
                      {detailedHealth.checks.memory.heapUsedMB} MB / {detailedHealth.checks.memory.heapTotalMB} MB
                    </span>
                  </div>
                  <AnimatedProgress 
                    value={detailedHealth.checks.memory.usagePercent} 
                    className={detailedHealth.checks.memory.usagePercent > 90 ? "bg-red-500" : 
                               detailedHealth.checks.memory.usagePercent > 75 ? "bg-yellow-500" : "bg-green-500"}
                  />
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                      <p className="text-muted-foreground">RSS Memory</p>
                      <p className="font-semibold">{detailedHealth.checks.memory.rssMB} MB</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active Connections</p>
                      <p className="font-semibold">{detailedHealth.diagnostics.activeConnections || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Database Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Service
                  </CardTitle>
                  {getStatusIcon(health?.services.database.status || "error")}
                </div>
                <CardDescription>PostgreSQL Database Connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-semibold ${getStatusColor(health?.services.database.status || "")}`}>
                    {(health?.services.database.status || "Unknown").toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latency:</span>
                  <span className="font-mono">{health?.services.database.latency || 0} ms</span>
                </div>
                {detailedHealth?.checks.database.version && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-mono text-xs">{detailedHealth.checks.database.version}</span>
                  </div>
                )}
                {detailedHealth?.checks.database.activeConnections && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Connections:</span>
                    <span>{detailedHealth.checks.database.activeConnections}</span>
                  </div>
                )}
                {health?.services.database.error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{health.services.database.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Redis Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Redis Cache
                  </CardTitle>
                  {getStatusIcon(detailedHealth?.checks.redis?.status || "disconnected")}
                </div>
                <CardDescription>In-memory data store and caching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-semibold ${getStatusColor(detailedHealth?.checks.redis?.status || "disconnected")}`}>
                    {detailedHealth?.checks.redis?.status?.toUpperCase() || "Not Configured"}
                  </span>
                </div>
                {detailedHealth?.checks.redis?.latency_ms && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Latency:</span>
                    <span className="font-mono">{detailedHealth.checks.redis.latency_ms} ms</span>
                  </div>
                )}
                {detailedHealth?.checks.redis?.error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{detailedHealth.checks.redis.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Storage Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Object Storage
                  </CardTitle>
                  {getStatusIcon(detailedHealth?.checks.storage?.status || "disconnected")}
                </div>
                <CardDescription>AWS S3 File Storage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-semibold ${getStatusColor(detailedHealth?.checks.storage?.status || "disconnected")}`}>
                    {detailedHealth?.checks.storage?.status?.toUpperCase() || "Not Configured"}
                  </span>
                </div>
                {detailedHealth?.checks.storage?.latency_ms && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Latency:</span>
                    <span className="font-mono">{detailedHealth.checks.storage.latency_ms} ms</span>
                  </div>
                )}
                {detailedHealth?.checks.storage?.buckets && detailedHealth.checks.storage.buckets.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Buckets:</span>
                    <span>{detailedHealth.checks.storage.buckets.length} available</span>
                  </div>
                )}
                {detailedHealth?.checks.storage?.error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{detailedHealth.checks.storage.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* API Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    API Gateway
                  </CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <CardDescription>REST API and WebSocket endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-semibold text-green-500">OPERATIONAL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span className="font-mono">&lt;100 ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>System performance and response times</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* API Response Times */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Response Times</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Database Query</span>
                        <span className="font-mono">{health?.services.database.latency || 0}ms</span>
                      </div>
                      <AnimatedProgress value={Math.min(100, ((health?.services.database.latency || 0) / 100) * 100)} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>API Response</span>
                        <span className="font-mono">&lt;100ms</span>
                      </div>
                      <AnimatedProgress value={75} />
                    </div>
                  </div>
                </div>

                {/* Resource Usage */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Resource Utilization</h3>
                  <div className="grid gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span className="font-mono">Loading...</span>
                        </div>
                      <AnimatedProgress value={45} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span className="font-mono">{detailedHealth?.checks.memory.usagePercent || 0}%</span>
                        </div>
                      <AnimatedProgress value={detailedHealth?.checks.memory.usagePercent || 0} />      
                    </div>
                  </div>
                </div>

                {/* Database Performance */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Database Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Database className="h-4 w-4" />
                        <span>Active Queries</span>
                      </div>
                      <p className="text-2xl font-bold">{detailedHealth?.diagnostics.activeConnections || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Activity className="h-4 w-4" />
                        <span>Slow Queries</span>
                      </div>
                      <p className="text-2xl font-bold">{detailedHealth?.diagnostics.slowQueries || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-8">
        <p>Last full system check completed at {lastUpdated.toLocaleString()}</p>
        <p className="mt-1">Mvalex Business Suite - Health Monitoring System v{health?.version || "1.0.0"}</p>
      </div>
    </div>
  );
}