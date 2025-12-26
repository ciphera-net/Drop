"use client";

import { useState, useEffect } from "react";
import { Session } from "@/types";
import { getSessions, revokeSession, revokeAllOtherSessions } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { UAParser } from "ua-parser-js";
import { Desktop, DeviceMobile } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

export function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      toast.success("Session revoked");
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
       console.error(error);
       toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
     if (!confirm("Are you sure you want to log out of all other devices?")) return;
     setRevokingId("all");
     try {
       await revokeAllOtherSessions();
       toast.success("All other sessions revoked");
       setSessions(sessions.filter(s => s.is_current));
     } catch (error) {
        console.error(error);
        toast.error("Failed to revoke sessions");
     } finally {
        setRevokingId(null);
     }
  };

  const getDeviceIcon = (result: UAParser.IResult) => {
      const type = result.device.type;
      if (type === 'mobile' || type === 'tablet') return <DeviceMobile size={24} weight="duotone" />;
      return <Desktop size={24} weight="duotone" />;
  };

  if (loading) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage your active sessions and devices.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      {[1, 2].map((i) => (
                          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                      ))}
                  </div>
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                Manage your active sessions and devices.
                </CardDescription>
            </div>
            {sessions.length > 1 && (
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRevokeAllOthers}
                    disabled={!!revokingId}
                >
                    {revokingId === "all" ? "Revoking..." : "Revoke All Others"}
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => {
            const parser = new UAParser(session.user_agent || "");
            const result = parser.getResult();
            const browserName = result.browser.name || "Unknown Browser";
            const osName = result.os.name || "Unknown OS";
            
            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    {getDeviceIcon(result)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                        {browserName} on {osName}
                        {session.is_current && (
                            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
                                Current
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                       {session.ip} • Last active {formatDistanceToNow(new Date(session.updated_at || session.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                {!session.is_current && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(session.id)}
                        disabled={!!revokingId}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        {revokingId === session.id ? "Revoking..." : "Revoke"}
                    </Button>
                )}
              </div>
            );
          })}
          
          {sessions.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                  No sessions found.
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

