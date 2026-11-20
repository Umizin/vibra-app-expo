export type JamendoResource =
  | 'tracks'
  | 'tracks/file'
  | 'artists'
  | 'artists/tracks'
  | 'artists/albums'
  | 'albums'
  | 'albums/tracks';

export type JamendoExternalId = string;

export type JamendoHeaders = {
  status?: string | null;
  code?: string | number | null;
  error_message?: string | null;
  warnings?: string | null;
  results_count?: number | null;
  results_fullcount?: number | null;
  [key: string]: unknown;
};

export type JamendoResult = Record<string, unknown>;

export type JamendoEnvelope = {
  headers: JamendoHeaders;
  results: JamendoResult[];
};

export type JamendoQueryValue = string | number | boolean | readonly (string | number)[] | undefined;
export type JamendoQuery = Readonly<Record<string, JamendoQueryValue>>;
