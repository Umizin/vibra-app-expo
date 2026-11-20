export type BusinessErrorCode =
  | 'EMAIL_ALREADY_IN_USE'
  | 'USER_NOT_FOUND'
  | 'PLAYLIST_NOT_FOUND'
  | 'TRACK_NOT_FOUND'
  | 'TRACK_ALREADY_IN_PLAYLIST'
  | 'PLAYLIST_POSITION_IN_USE'
  | 'FAVORITE_ALREADY_EXISTS'
  | 'FAVORITE_NOT_FOUND'
  | 'CATALOG_GENRE_UNSUPPORTED'
  | 'INVALID_EMAIL'
  | 'INVALID_DISPLAY_NAME'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_UPDATE';

export class BusinessError extends Error {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}
