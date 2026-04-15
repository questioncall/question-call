"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Trash2, RotateCcw, AlertCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface KeySlot {
  _id: string;
  maskedKey: string;
  label?: string;
  status: string;
  isExhausted: boolean;
  exhaustedAt?: string;
  lastUsedAt?: string;
  resetAt?: string;
}

interface AIKeysData {
  providerOrder: string[];
  [provider: string]: any;
}

export default function AIKeysAdminPage() {
  const [data, setData] = useState<AIKeysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/ai-keys");
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading keys";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5 minutes (300000ms) to reduce log flooding
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !data) return;
    
    const newOrder = Array.from(data.providerOrder);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    // Optimistic UI update
    setData({ ...data, providerOrder: newOrder });

    try {
      const res = await fetch("/api/admin/ai-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerOrder: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to save order");
      toast.success("Provider priority updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving priority";
      toast.error(message);
      fetchData(); // Revert on error
    }
  };

  const handleAddKey = async (provider: string) => {
    if (!newKey) {
      toast.error("API Key is required");
      return;
    }

    try {
      setAddingTo(provider);
      const res = await fetch(`/api/admin/ai-keys/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey, label: newLabel }),
      });
      if (!res.ok) throw new Error("Failed to add key");
      
      toast.success("Key added successfully");
      setNewKey("");
      setNewLabel("");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error adding key";
      toast.error(message);
    } finally {
      setAddingTo(null);
    }
  };

  const handleDeleteKey = async (provider: string, index: number) => {
    if (!confirm("Are you sure you want to delete this key?")) return;
    try {
      const res = await fetch(`/api/admin/ai-keys/${provider}/${index}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete key");
      toast.success("Key deleted");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error deleting key";
      toast.error(message);
    }
  };

  const handleResetKey = async (provider: string, index: number) => {
    try {
      const res = await fetch(`/api/admin/ai-keys/${provider}/${index}/reset`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to reset key");
      toast.success("Key successfully un-exhausted");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error resetting key";
      toast.error(message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading AI Providers...</div>;
  }

  if (!data || !data.providerOrder) {
    return <div className="p-8 text-center text-red-500">Failed to load payload.</div>;
  }

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE") return <Badge className="bg-green-500">ACTIVE 🟢</Badge>;
    if (status === "RESETTING") return <Badge className="bg-orange-500">RESETTING ⏳</Badge>;
    if (status === "EXHAUSTED") return <Badge variant="destructive">EXHAUSTED 🔴</Badge>;
    return <Badge>{status}</Badge>;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Provider Routing</h1>
        <p className="text-muted-foreground">
          Manage API keys for failover LLM capabilities. Drag to reorder priority. High priority providers are used first.
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="providers">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
              {data.providerOrder.map((providerName, index) => {
                const keys = data[providerName] as KeySlot[];
                return (
                  <Draggable key={providerName} draggableId={providerName} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-card shadow-sm border"
                      >
                        <CardHeader className="py-4 bg-muted/30 border-b flex flex-row items-center space-x-4">
                          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                            <GripVertical size={20} />
                          </div>
                          <div>
                            <CardTitle className="capitalize select-none flex items-center space-x-3">
                              <span className="bg-primary/10 text-primary w-6 h-6 flex items-center justify-center rounded-full text-xs mr-2">
                                {index + 1}
                              </span>
                              {providerName}
                              <span className="text-sm font-normal text-muted-foreground ml-3">
                                ({keys.length} keys active)
                              </span>
                            </CardTitle>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-6">
                          {keys.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground bg-muted/10 rounded border border-dashed mb-4">
                              <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                              No keys configured for {providerName}
                            </div>
                          ) : (
                            <div className="space-y-3 mb-6">
                              {keys.map((k, idx) => (
                                <div key={k._id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center space-x-3">
                                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{k.maskedKey}</span>
                                      {k.label && <span className="text-xs text-muted-foreground font-medium">🏷️ {k.label}</span>}
                                      {getStatusBadge(k.status)}
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-1 flex gap-4">
                                      <span>Used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</span>
                                      {k.isExhausted && k.resetAt && (
                                        <span className="text-orange-600 dark:text-orange-400">
                                          Resets: {new Date(k.resetAt).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 mt-3 md:mt-0">
                                    {k.isExhausted && (
                                      <Button variant="outline" size="sm" onClick={() => handleResetKey(providerName, idx)}>
                                        <RotateCcw className="w-4 h-4 mr-1" />
                                        Reset
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(providerName, idx)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 items-center bg-muted/20 p-3 rounded-lg border border-dashed">
                            <Input 
                              placeholder="sk-..." 
                              value={addingTo === providerName ? newKey : ""}
                              onChange={e => {
                                setAddingTo(providerName);
                                setNewKey(e.target.value);
                              }}
                              className="font-mono text-sm max-w-sm"
                            />
                            <Input 
                              placeholder="Label (e.g. Acme Org)" 
                              value={addingTo === providerName ? newLabel : ""}
                              onChange={e => {
                                setAddingTo(providerName);
                                setNewLabel(e.target.value);
                              }}
                              className="text-sm max-w-[200px]"
                            />
                            <Button variant="secondary" size="sm" onClick={() => handleAddKey(providerName)}>
                              <Plus className="w-4 h-4 mr-1" /> Add Key
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
