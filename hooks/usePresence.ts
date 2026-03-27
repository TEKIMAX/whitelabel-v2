import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const HEARTBEAT_INTERVAL = 5000; // Send heartbeat every 5s (Presence usually expires after 10s)

export function usePresence(room: string, user: string, initialData: any = {}) {
    const [data, setData] = useState(initialData);

    // 1. Fetch current presence list
    const presentUsers = useQuery(api.presence.list, { room }) || [];

    // 2. Mutation to send heartbeat
    const track = useMutation(api.presence.track);

    // 3. Heartbeat Loop & Data Broadcasting
    // We use a ref to always send the *latest* data without re-triggering the effect loop excessively
    const dataRef = useRef(data);
    useEffect(() => { dataRef.current = data; }, [data]);

    useEffect(() => {
        const sendHeartbeat = () => {
            track({
                room,
                user,
                data: dataRef.current
            });
        };

        // Send immediately on mount
        sendHeartbeat();

        const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, [room, user, track]);

    // 4. Update local data (and trigger a heartbeat soon?)
    // For high-frequency updates (cursors), we might rely on the interval, 
    // or send immediately for critical state changes.
    // For cursors, we usually just update the ref/state and let the next heartbeat pick it up, 
    // OR we throttle the mutation. 
    // For simplicity v1: Update state, let interval handle it. 
    // *Optimization*: For cursors, 5s is too slow. We need faster updates.

    const updatePresence = useCallback((newData: any) => {
        setData((prev: any) => ({ ...prev, ...newData }));
        // Ensure the ref is updated immediately for any quick reads or fast-track sends
        dataRef.current = { ...dataRef.current, ...newData };
    }, []);

    // Fast track function for cursor movements (throttled)
    const broadcastImmediately = useCallback((newData: any) => {
        track({
            room,
            user,
            data: { ...dataRef.current, ...newData }
        });
    }, [room, user, track]);

    return {
        presentUsers,
        updatePresence,
        broadcastImmediately,
        isMe: (u: string) => u === user
    };
}
