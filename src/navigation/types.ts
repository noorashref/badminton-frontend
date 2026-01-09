export type HomeStackParamList = {
  Home: { refreshKey?: number } | undefined;
  League: undefined;
  Fixtures: { seasonId: string };
  MatchDetail: { matchId: string };
  SessionSummary: { sessionId: string };
  SessionsList: undefined;
  PlayersLeaderboard: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  PlayersManage: undefined;
};

export type RootTabParamList = {
  HomeTab: undefined;
  SessionTab: undefined;
  SettingsTab: undefined;
};

export type SessionStackParamList = {
  SessionGroups: undefined;
  GroupSessions: { groupId: string };
  SessionCreate: { groupId?: string } | undefined;
  SessionBoard: { sessionId: string };
  SessionSummary: { sessionId: string };
};
