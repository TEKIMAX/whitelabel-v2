import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
    "purge old deleted projects",
    { hourUTC: 0, minuteUTC: 0 },
    internal.cleanup.purgeOldDeletedProjects
);

crons.interval(
    "sync workos events",
    { minutes: 1 },
    internal.workos_events.fetchAndProcessEvents
);

crons.hourly(
    "cleanup expired file grants",
    { minuteUTC: 30 },
    internal.filesControl.cleanupExpiredGrants
);

crons.daily(
    "sync storage usage to billing",
    { hourUTC: 3, minuteUTC: 0 },
    internal.storageReporter.dailyUsageSync
);

export default crons;
