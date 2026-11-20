import { BusinessError } from '../errors/business-error.js';
import { JamendoResponseError } from '../integrations/jamendo/jamendo.errors.js';
import { jamendoTrackEnvelopeSchema, type JamendoTrack } from '../integrations/jamendo/jamendo.schemas.js';
import { jamendoClient } from '../integrations/jamendo/jamendo.client.js';
import type { JamendoClient } from '../integrations/jamendo/jamendo.client.js';
import type { CatalogTracksQuery } from '../schemas/catalog.schema.js';

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

    const mapped = parsed.data.results.map(mapTrack);
    const hasMore = mapped.length > query.limit;
    const data = mapped.slice(0, query.limit);

    return {
      data,
      pagination: {
        offset: query.offset,
        limit: query.limit,
        count: data.length,
        hasMore,
      },
    };
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
}

export const catalogService = new CatalogService();
