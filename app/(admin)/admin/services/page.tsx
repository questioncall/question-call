"use client";

import { useState, useEffect } from "react";
import {
  Video,
  Cloud,
  Mail,
  Cpu,
  Database,
  CreditCard,
  Activity,
  Zap,
  AlertTriangle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UsageMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  percentage: number;
}

interface ServiceDetail {
  id: string;
  name: string;
  icon: string;
  status: "healthy" | "warning" | "error";
  summary: string;
  details: Record<string, unknown>;
  usage: UsageMetric[];
  lastUpdated: string;
}

const iconMap: Record<string, React.ElementType> = {
  Video,
  Cloud,
  Mail,
  Cpu,
  Database,
  CreditCard,
  Activity,
};

function getStatusColor(status: string): string {
  if (status === "healthy") return "text-green-500";
  if (status === "warning") return "text-orange-500";
  return "text-red-500";
}

function getProgressColor(percentage: number): string {
  if (percentage < 50) return "bg-green-500";
  if (percentage < 80) return "bg-orange-500";
  return "bg-red-500";
}

function ProgressBar({ value, max, percentage }: { value: number; max: number; percentage: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{value.toLocaleString()} / {max.toLocaleString()}</span>
        <span className={`font-medium ${percentage >= 80 ? "text-red-500" : percentage >= 50 ? "text-orange-500" : "text-green-500"}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor(percentage)} transition-all`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function ServicesContent() {
  const [data, setData] = useState<{ services: ServiceDetail[]; lastUpdated: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error loading services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading services...</div>;
  }

  if (!data?.services.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-4 opacity-50" />
          No services configured yet.
        </CardContent>
      </Card>
    );
  }

  const healthyCount = data.services.filter((s) => s.status === "healthy").length;
  const warningCount = data.services.filter((s) => s.status === "warning").length;
  const errorCount = data.services.filter((s) => s.status === "error").length;

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Services</h1>
        <p className="text-muted-foreground">
          Monitor platform services, credits, and usage. Click a service for details.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.services.map((service) => {
          const Icon = iconMap[service.icon] || Activity;
          const hasUsage = service.usage.length > 0;
          const topMetric = service.usage[0];

          return (
            <Card
              key={service.id}
              className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all min-h-[160px]"
              onClick={() => setSelectedService(service)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    {service.status === "healthy" && <Zap className="h-4 w-4 text-green-500" />}
                    {service.status === "warning" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    {service.status === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                <CardTitle className="text-lg">{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasUsage && topMetric ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{topMetric.label}</div>
                    <ProgressBar value={topMetric.value} max={topMetric.max} percentage={topMetric.percentage} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{service.summary}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>{healthyCount} Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>{warningCount} Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>{errorCount} Error</span>
        </div>
      </div>

      {selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-background border-b pb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = iconMap[selectedService.icon] || Activity;
                  return <Icon className="h-8 w-8" />;
                })()}
                <div>
                  <CardTitle className="text-xl">{selectedService.name}</CardTitle>
                  <p className={`text-sm font-medium ${getStatusColor(selectedService.status)}`}>
                    {selectedService.status.charAt(0).toUpperCase() + selectedService.status.slice(1)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedService(null)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Summary</h4>
                <p className="text-lg">{selectedService.summary}</p>
              </div>

              {selectedService.usage.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Usage Metrics</h4>
                  <div className="space-y-4">
                    {selectedService.usage.map((metric, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{metric.label}</span>
                          <span className="text-muted-foreground">
                            {metric.value.toLocaleString()} / {metric.max.toLocaleString()} {metric.unit}
                          </span>
                        </div>
                        <ProgressBar value={metric.value} max={metric.max} percentage={metric.percentage} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(selectedService.details).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Configuration</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedService.details).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground capitalize">{key}</div>
                        <div className="font-mono text-sm">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t">
                Last updated: {new Date(selectedService.lastUpdated).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default function ServicesAdminPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <ServicesContent />
    </div>
  );
}