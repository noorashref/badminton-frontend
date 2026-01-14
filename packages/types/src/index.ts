export type Role = "ADMIN" | "ORGANIZER" | "PLAYER" | "VIEWER";

export type PlayerProfile = {
  id: string;
  displayName: string;
  rating: number; // 0-100 MVP scale
};

export type CourtWindow = {
  id: string;
  courtName: string;
  startTime: string; // ISO
  endTime: string; // ISO
};

export type Attendance = {
  playerId: string;
  arriveAt: string; // ISO
  leaveAt: string; // ISO
};

export type RoundAssignment = {
  courtId: string;
  teamA: [string, string];
  teamB: [string, string];
  resting: string[];
};

export type RoundPlan = {
  roundIndex: number;
  startTime: string; // ISO
  endTime: string; // ISO
  assignments: RoundAssignment[];
};

export type SessionSchedule = {
  sessionId: string;
  rounds: RoundPlan[];
};
