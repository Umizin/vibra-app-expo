import { BusinessError } from '../errors/business-error.js';
import { JamendoResponseError } from '../integrations/jamendo/jamendo.errors.js';
import {
  jamendoAlbumEnvelopeSchema,
  jamendoArtistEnvelopeSchema,
  jamendoTrackEnvelopeSchema,
  type JamendoAlbum,
  type JamendoArtist,
  type JamendoTrack,
} from '../integrations/jamendo/jamendo.schemas.js';
import { jamendoClient } from '../integrations/jamendo/jamendo.client.js';
import type { JamendoClient } from '../integrations/jamendo/jamendo.client.js';
import type { CatalogAlbumsQuery, CatalogArtistsQuery, CatalogTracksQuery } from '../schemas/catalog.schema.js';

export type TrackDto = {
  id: string;
  titulo: string;
  artistaId: string;
  artista: string;
  albumId?: string;
  album?: string;
  duracaoEmSegundos: number;
  capaUrl?: string;
  audioUrl?: string;
  genero?: string;
  tags: string[];
  license?: string;
  jamendoUrl?: string;
};

export type TrackPagination = {
  offset: number;
  limit: number;
  count: number;
  hasMore: boolean;
};

export type TrackSearchResult = {
  data: TrackDto[];
  pagination: TrackPagination;
};

export type TrackBatchResult = {
  data: TrackDto[];
  requestedIds: string[];
  missingIds: string[];
};

export type ArtistDto = {
  id: string;
  name: string;
  imageUrl?: string;
  website?: string;
  shareUrl?: string;
};

export type AlbumDto = {
  id: string;
  name: string;
  artistId?: string;
  artistName: string;
  imageUrl?: string;
  releasedate?: string;
  shareUrl?: string;
};

export type ArtistSearchResult = { data: ArtistDto[]; pagination: TrackPagination };
export type AlbumSearchResult = { data: AlbumDto[]; pagination: TrackPagination };

function mapArtist(artist: JamendoArtist): ArtistDto {
  return {
    id: artist.id,
    name: artist.name,
    ...(artist.image ? { imageUrl: artist.image } : {}),
    ...(artist.website ? { website: artist.website } : {}),
    ...((artist.shareurl || artist.shorturl)
      ? { shareUrl: artist.shareurl ?? artist.shorturl }
      : {}),
  };
}

function mapAlbum(album: JamendoAlbum): AlbumDto {
  return {
    id: album.id,
    name: album.name,
    ...(album.artist_id ? { artistId: album.artist_id } : {}),
    artistName: album.artist_name,
    ...(album.image ? { imageUrl: album.image } : {}),
    ...(album.releasedate ? { releasedate: album.releasedate } : {}),
    ...((album.shareurl || album.shorturl)
      ? { shareUrl: album.shareurl ?? album.shorturl }
      : {}),
  };
}

function paginate<T>(items: T[], offset: number, limit: number) {
  const hasMore = items.length > limit;
  const data = items.slice(0, limit);
  return {
    data,
    pagination: { offset, limit, count: data.length, hasMore },
  };
}

// Jamendo documents these featured tags; other Vibra genres are not guessed.
const GENRE_TAG_MAP: Partial<Record<NonNullable<CatalogTracksQuery['genre']>, string>> = {
  Rock: 'rock',
  Pop: 'pop',
  Eletrônica: 'electronic',
};

function mapTrack(track: JamendoTrack): TrackDto {
  const musicTags = track.musicinfo?.tags;
  const genreTags = musicTags?.genres ?? [];
  const tags = [
    ...genreTags,
    ...(musicTags?.instruments ?? []),
    ...(musicTags?.vartags ?? []),
  ];

  return {
    id: track.id,
    titulo: track.name,
    artistaId: track.artist_id,
    artista: track.artist_name,
    ...(track.album_id ? { albumId: track.album_id } : {}),
    ...(track.album_name ? { album: track.album_name } : {}),
    duracaoEmSegundos: track.duration,
    ...(track.image ? { capaUrl: track.image } : {}),
    ...(track.audio ? { audioUrl: track.audio } : {}),
    ...(genreTags[0] ? { genero: genreTags[0] } : {}),
    tags,
    ...(track.license_ccurl ? { license: track.license_ccurl } : {}),
    ...(track.shareurl || track.shorturl
      ? { jamendoUrl: track.shareurl ?? track.shorturl }
      : {}),
  };
}

export class CatalogService {
  constructor(private readonly client: Pick<JamendoClient, 'get'> = jamendoClient) {}

  async searchTracks(query: CatalogTracksQuery): Promise<TrackSearchResult> {
    let tag: string | undefined;
    if (query.genre) {
      tag = GENRE_TAG_MAP[query.genre];
      if (!tag) {
        throw new BusinessError(
          'CATALOG_GENRE_UNSUPPORTED',
          'Este gênero ainda não possui um filtro confiável no catálogo.',
        );
      }
    }

    const envelope = await this.client.get('tracks', {
      search: query.q || undefined,
      artist_id: query.artistId,
      album_id: query.albumId,
      tags: tag ? [tag] : undefined,
      offset: query.offset,
      // Uma faixa extra permite determinar hasMore sem pedir fullcount.
      limit: query.limit + 1,
      include: ['licenses', 'musicinfo'],
    });

    const parsed = jamendoTrackEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);

    return paginate(parsed.data.results.map(mapTrack), query.offset, query.limit);
  }

  async getTrackById(trackId: string): Promise<TrackDto> {
    const envelope = await this.client.get('tracks', {
      id: trackId,
      include: ['licenses', 'musicinfo'],
      limit: 1,
    });

    const parsed = jamendoTrackEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);

    const track = parsed.data.results[0];
    if (!track) throw new BusinessError('TRACK_NOT_FOUND', 'Faixa não encontrada.');
    return mapTrack(track);
  }

  async getTracksByIds(ids: string[]): Promise<TrackBatchResult> {
    const envelope = await this.client.get('tracks', {
      id: ids,
      include: ['licenses', 'musicinfo'],
      limit: ids.length,
    });

    const parsed = jamendoTrackEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);

    const tracksById = new Map(parsed.data.results.map((track) => [track.id, mapTrack(track)]));
    const data = ids.flatMap((id) => {
      const track = tracksById.get(id);
      return track ? [track] : [];
    });
    const foundIds = new Set(data.map((track) => track.id));

    return {
      data,
      requestedIds: [...ids],
      missingIds: ids.filter((id) => !foundIds.has(id)),
    };
  }

  async searchArtists(query: CatalogArtistsQuery): Promise<ArtistSearchResult> {
    const envelope = await this.client.get('artists', {
      namesearch: query.q,
      offset: query.offset,
      limit: query.limit + 1,
    });
    const parsed = jamendoArtistEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);
    return paginate(parsed.data.results.map(mapArtist), query.offset, query.limit);
  }

  async getArtistById(artistId: string): Promise<ArtistDto> {
    const envelope = await this.client.get('artists', { id: artistId, limit: 1 });
    const parsed = jamendoArtistEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);
    const artist = parsed.data.results[0];
    if (!artist) throw new BusinessError('ARTIST_NOT_FOUND', 'Artista não encontrado.');
    return mapArtist(artist);
  }

  async searchAlbums(query: CatalogAlbumsQuery): Promise<AlbumSearchResult> {
    const envelope = await this.client.get('albums', {
      namesearch: query.q,
      artist_id: query.artistId,
      offset: query.offset,
      limit: query.limit + 1,
    });
    const parsed = jamendoAlbumEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);
    return paginate(parsed.data.results.map(mapAlbum), query.offset, query.limit);
  }

  async getAlbumById(albumId: string): Promise<AlbumDto> {
    const envelope = await this.client.get('albums', { id: albumId, limit: 1 });
    const parsed = jamendoAlbumEnvelopeSchema.safeParse(envelope);
    if (!parsed.success) throw new JamendoResponseError(parsed.error);
    const album = parsed.data.results[0];
    if (!album) throw new BusinessError('ALBUM_NOT_FOUND', 'Álbum não encontrado.');
    return mapAlbum(album);
  }
}

export const catalogService = new CatalogService();
